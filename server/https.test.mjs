import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { readFile, mkdtemp, writeFile, rm, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { X509Certificate } from "node:crypto";
import { connectorConfig, createConnector } from "./connector.mjs";
import { transportConfig, transportOptions } from "./transport.mjs";
const certFile = fileURLToPath(
  new URL("./test-fixtures/tls/fixture-cert.pem", import.meta.url),
);
const keyFile = fileURLToPath(
  new URL("./test-fixtures/tls/fixture-key.pem", import.meta.url),
);
const cert = await readFile(certFile);
const origin = "https://localhost:8443";
const env = {
  LIFEOS_REMOTE_ORIGIN: origin,
  LIFEOS_TLS_CERT_FILE: certFile,
  LIFEOS_TLS_KEY_FILE: keyFile,
  LIFEOS_GITHUB_TOKEN: "https-fixture-github-token-not-real",
  LIFEOS_GITHUB_REPOSITORIES: "example/private",
  LIFEOS_OPENAI_KEY: "https-fixture-openai-key-not-real",
  LIFEOS_AI_DAILY_USD: "0.20",
  LIFEOS_AI_DAILY_CALLS: "2",
};
const code = "https-fixture-one-time-code";
const target = { owner: "example", repo: "private", kind: "pull", number: 42 };
const time = Date.parse("2026-10-19T22:00:00Z");
const fixtures = [];
afterEach(async () => {
  for (const f of fixtures.splice(0)) {
    f.server?.closeAllConnections();
    if (f.server) await new Promise((resolve) => f.server.close(resolve));
    assert.ok(
      resolve(f.dir).startsWith(`${resolve(tmpdir())}${sep}lifeos-https-test-`),
    );
    await rm(f.dir, { recursive: true, force: true });
  }
});
async function start(extra = {}) {
  const dir = await mkdtemp(join(tmpdir(), "lifeos-https-test-"));
  const record = { dir, server: null };
  fixtures.push(record);
  const dist = join(dir, "dist");
  await import("node:fs/promises").then((m) => m.mkdir(dist));
  await writeFile(join(dist, "index.html"), "<title>HTTPS fixture</title>");
  let clock = time;
  const calls = [];
  const config = connectorConfig({ ...env, ...extra });
  const upstream = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/input_tokens"))
      return Response.json({
        object: "response.input_tokens",
        input_tokens: 100,
      });
    if (url === "https://api.openai.com/v1/responses")
      return Response.json({
        id: "resp_https_fixture",
        object: "response",
        model: "gpt-5.6-terra",
        status: "completed",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [
              { type: "output_text", text: "Proposition fictive HTTPS." },
            ],
          },
        ],
        usage: { input_tokens: 100, output_tokens: 60 },
      });
    return Response.json({
      html_url: "https://github.com/example/private/pull/42",
      number: 42,
      title: "Lecture HTTPS fictive",
      state: "closed",
      merged: true,
      draft: false,
      head: { sha: "a".repeat(40) },
      updated_at: "2026-10-19T12:00:00Z",
    });
  };
  const { server } = await createConnector({
    config,
    distRoot: dist,
    code,
    upstream,
    now: () => clock,
    ledgerPath: join(dir, "budget.sqlite"),
  });
  record.server = server;
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let cookie = "";
  const api = (path, body, patch = {}) =>
    new Promise((resolve, reject) => {
      const { headers = {}, ...options } = patch;
      const req = httpsRequest(
        {
          hostname: "127.0.0.1",
          port: server.address().port,
          path: `/api/connector/${path}`,
          method: body === undefined ? "GET" : "POST",
          ca: cert,
          servername: "localhost",
          ...options,
          headers: Object.fromEntries(
            Object.entries({
              Host: "localhost:8443",
              "X-LifeOS-Request": "1",
              ...(cookie ? { Cookie: cookie } : {}),
              ...(body === undefined
                ? {}
                : { Origin: origin, "Content-Type": "application/json" }),
              ...headers,
            }).filter(([, value]) => value !== undefined),
          ),
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              headers: res.headers,
              text: Buffer.concat(chunks).toString(),
              json() {
                return JSON.parse(this.text);
              },
            }),
          );
        },
      );
      req.on("error", reject);
      req.end(body === undefined ? undefined : JSON.stringify(body));
    });
  return {
    api,
    config,
    dir,
    dist,
    server,
    calls,
    advance: (ms) => (clock += ms),
    pair: async () => {
      const r = await api("pair", { code });
      assert.equal(r.status, 200);
      cookie = r.headers["set-cookie"][0].split(";")[0];
      return r;
    },
  };
}
test("mode distant explicite : HTTPS canonique, certificat/clé et port cohérents, aucune écoute HTTP distante", () => {
  assert.equal(transportConfig({}), null);
  for (const patch of [
    { LIFEOS_BIND_ADDRESS: "0.0.0.0" },
    { LIFEOS_TLS_CERT_FILE: certFile },
    { LIFEOS_REMOTE_ORIGIN: origin },
  ])
    assert.throws(() => transportConfig(patch));
  for (const patch of [
    { LIFEOS_REMOTE_ORIGIN: "http://localhost:8443" },
    { LIFEOS_REMOTE_ORIGIN: `${origin}/` },
    { LIFEOS_REMOTE_ORIGIN: `${origin}/path` },
    { LIFEOS_REMOTE_ORIGIN: `${origin}?token=x` },
    { LIFEOS_REMOTE_ORIGIN: `${origin}#x` },
    { LIFEOS_REMOTE_ORIGIN: "https://u:p@localhost:8443" },
    { LIFEOS_TLS_KEY_FILE: "relative.pem" },
    { LIFEOS_BIND_ADDRESS: "example.com" },
    { LIFEOS_CONNECTOR_PORT: "4317" },
  ])
    assert.throws(() => connectorConfig({ ...env, ...patch }));
  assert.equal(
    connectorConfig({ ...env, LIFEOS_BIND_ADDRESS: "0.0.0.0" }).remote.bind,
    "0.0.0.0",
  );
  assert.equal(connectorConfig(env).port, 8443);
  assert.equal(connectorConfig(env).remote.bind, "127.0.0.1");
});
test("certificat vérifié : nom, dates, correspondance clé et fichiers privés hors build/public", async () => {
  const f = await start();
  const remote = f.config.remote;
  const leaf = new X509Certificate(cert);
  for (const patch of [
    { hostname: "wrong.example" },
    { keyFile: certFile },
    { certFile: join(f.dir, "absent.pem") },
  ])
    await assert.rejects(
      transportOptions({ ...remote, ...patch }, f.dist, time),
      /Configuration TLS refusée/,
    );
  for (const date of [
    Date.parse(leaf.validFrom) - 1,
    Date.parse(leaf.validTo) + 1,
  ])
    await assert.rejects(
      transportOptions(remote, f.dist, date),
      /Configuration TLS refusée/,
    );
  await writeFile(join(f.dist, "private.js"), await readFile(keyFile));
  await assert.rejects(
    transportOptions(
      { ...remote, keyFile: join(f.dist, "private.js") },
      f.dist,
      time,
    ),
  );
});
test("vrai TLS : confiance explicite, identité du certificat et refus du HTTP clair", async () => {
  const f = await start();
  assert.equal((await f.api("status")).status, 200);
  await assert.rejects(f.api("status", undefined, { ca: undefined }));
  await assert.rejects(
    f.api("status", undefined, { servername: "wrong.example" }),
  );
  await assert.rejects(
    new Promise((resolve, reject) => {
      const r = httpRequest(
        { host: "127.0.0.1", port: f.server.address().port },
        resolve,
      );
      r.on("error", reject);
      r.end();
    }),
  );
  assert.equal(f.calls.length, 0);
});
test("HTTPS : cookie Secure préfixé HttpOnly strict, session non exposée, appairage unique et révocation", async () => {
  const f = await start();
  const before = await f.api("status");
  assert.equal(before.headers["strict-transport-security"], "max-age=86400");
  assert.equal(before.headers["access-control-allow-origin"], undefined);
  const pair = await f.pair();
  assert.match(
    pair.headers["set-cookie"][0],
    /^__Secure-lifeos_connector=.*HttpOnly; SameSite=Strict; Path=\/api\/connector; Max-Age=3600; Secure$/,
  );
  assert.doesNotMatch(pair.text, /fixture-|cookie|sessionToken/);
  assert.equal((await f.api("status")).json().paired, true);
  assert.equal((await f.api("pair", { code })).status, 429);
  assert.equal(f.calls.length, 0);
  assert.equal((await f.api("logout", {})).status, 200);
  assert.equal((await f.api("status")).json().paired, false);
  assert.equal((await f.api("github/read", target)).status, 401);
});
test("HTTPS : hôte/origine/proxy/cross-site/ancien cookie HTTP refusés avant fournisseur", async () => {
  const f = await start();
  await f.pair();
  for (const headers of [
    { Host: "wrong.example" },
    { Origin: "http://localhost:8443" },
    { Origin: "https://other.example" },
    { "X-Forwarded-Proto": "https" },
    { "X-Forwarded-Host": "localhost:8443" },
    { Forwarded: "host=localhost:8443;proto=https" },
    { "Sec-Fetch-Site": "cross-site" },
  ])
    assert.equal((await f.api("github/read", target, { headers })).status, 403);
  assert.equal(
    (
      await f.api("github/read", target, {
        headers: { Cookie: "lifeos_connector=untrusted" },
      })
    ).status,
    401,
  );
  assert.equal(
    (await f.api("github/read", target, { headers: { Origin: "" } })).status,
    403,
  );
  assert.equal(f.calls.length, 0);
});
test("HTTPS : lecture GitHub volontaire projetée et session expirée sans relance", async () => {
  const f = await start();
  await f.pair();
  const r = await f.api("github/read", target);
  assert.equal(r.status, 200);
  assert.equal(r.json().check.merged, true);
  assert.equal(f.calls.length, 1);
  assert.equal(
    f.calls[0].init.headers.Authorization,
    `Bearer ${env.LIFEOS_GITHUB_TOKEN}`,
  );
  assert.doesNotMatch(r.text, /fixture-github-token|Authorization/);
  f.advance(3600001);
  assert.equal((await f.api("github/read", target)).status, 401);
  assert.equal(f.calls.length, 1);
});
test("HTTPS : aperçu IA sans appel, autorisation unique, registre partagé et clé côté serveur", async () => {
  const f = await start();
  await f.pair();
  const quote = await f.api("ai/prepare", {
    text: "Mission HTTPS fictive",
    maxOutputTokens: 512,
    model: "gpt-5.6-terra",
  });
  assert.equal(quote.status, 200);
  assert.equal(f.calls.length, 0);
  const body = { quoteId: quote.json().id, confirmed: true };
  const r = await f.api("ai/execute", body);
  assert.equal(r.status, 200);
  assert.equal(r.json().responseId, "resp_https_fixture");
  assert.equal((await f.api("ai/execute", body)).status, 409);
  assert.equal(f.calls.length, 2);
  assert.equal(
    (await f.api("ai/status")).json().budget.reservedNanoUsd,
    100000000,
  );
  assert.doesNotMatch(r.text, /fixture-openai-key/);
});
test("TLS invalide : arrêt avant ouverture ou réinitialisation du registre IA", async () => {
  const f = await start();
  const path = join(f.dir, "must-not-exist.sqlite");
  await assert.rejects(
    createConnector({
      config: {
        ...f.config,
        remote: { ...f.config.remote, keyFile: certFile },
      },
      distRoot: f.dist,
      ledgerPath: path,
      now: () => time,
    }),
  );
  await assert.rejects(access(path));
});

const nativeHeaders = { "X-LifeOS-Client": "android", Origin: undefined };
async function nativePair(f) {
  const r = await f.api("pair", { code }, { headers: nativeHeaders });
  assert.equal(r.status, 200);
  assert.equal(r.headers["set-cookie"], undefined);
  assert.equal(r.headers["x-lifeos-transport"], "android-v1");
  const { nativeSession, ...status } = r.json();
  assert.match(nativeSession, /^[a-f0-9]{64}$/);
  assert.equal(status.paired, true);
  return { ...nativeHeaders, Authorization: `Bearer ${nativeSession}` };
}
test("Android TLS : appairage sans cookie, bearer isolé du navigateur et lecture volontaire", async () => {
  const f = await start();
  const h = await nativePair(f);
  assert.equal(f.calls.length, 0);
  assert.equal(
    (await f.api("status", undefined, { headers: h })).json().paired,
    true,
  );
  assert.equal(
    (await f.api("github/read", target, { headers: h })).status,
    200,
  );
  assert.equal(f.calls.length, 1);
  assert.equal(
    (
      await f.api("github/read", target, {
        headers: {
          Cookie: `__Secure-lifeos_connector=${h.Authorization.slice(7)}`,
        },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await f.api("github/read", target, {
        headers: { Authorization: h.Authorization },
      })
    ).status,
    403,
  );
  for (const patch of [
    { Origin: origin },
    { "Sec-Fetch-Site": "same-origin" },
    { Cookie: "anything=x" },
    { "X-LifeOS-Client": "other" },
  ])
    assert.equal(
      (await f.api("github/read", target, { headers: { ...h, ...patch } }))
        .status,
      403,
    );
  assert.equal(f.calls.length, 1);
});
test("Android TLS : aperçu sans fournisseur, accord unique, révocation et budget conservé", async () => {
  const f = await start();
  const h = await nativePair(f);
  const quote = await f.api(
    "ai/prepare",
    { text: "Android explicite", model: "gpt-5.6-terra", maxOutputTokens: 512 },
    { headers: h },
  );
  assert.equal(quote.status, 200);
  assert.equal(f.calls.length, 0);
  const body = { quoteId: quote.json().id, confirmed: true };
  assert.equal((await f.api("ai/execute", body, { headers: h })).status, 200);
  assert.equal((await f.api("ai/execute", body, { headers: h })).status, 409);
  assert.equal(f.calls.length, 2);
  const logout = await f.api("logout", {}, { headers: h });
  assert.equal(logout.status, 200);
  assert.equal(logout.headers["set-cookie"], undefined);
  assert.equal(
    (await f.api("github/read", target, { headers: h })).status,
    401,
  );
  assert.equal(
    (await f.api("ai/status", undefined, { headers: h })).json().paired,
    false,
  );
  assert.equal(
    (await f.api("pair", { code }, { headers: nativeHeaders })).status,
    429,
  );
});
test("Android TLS : expiration stricte, code non réutilisable et aucune session dans les réponses suivantes", async () => {
  const f = await start();
  const h = await nativePair(f);
  const status = await f.api("status", undefined, { headers: h });
  assert.doesNotMatch(status.text, /nativeSession|Bearer/);
  f.advance(3600001);
  assert.equal(
    (await f.api("github/read", target, { headers: h })).status,
    401,
  );
  assert.equal(
    (await f.api("status", undefined, { headers: h })).json().paired,
    false,
  );
  assert.equal(f.calls.length, 0);
});
test("Android TLS : une session navigateur ne devient pas un bearer natif", async () => {
  const f = await start();
  const r = await f.pair();
  const token = r.headers["set-cookie"][0].split(";")[0].split("=")[1];
  assert.equal(
    (
      await f.api("github/read", target, {
        headers: {
          ...nativeHeaders,
          Cookie: undefined,
          Authorization: `Bearer ${token}`,
        },
      })
    ).status,
    401,
  );
  assert.equal(f.calls.length, 0);
});
