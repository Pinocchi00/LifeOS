import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { request as httpRequest } from "node:http";
import { connectorConfig, createConnector } from "./connector.mjs";
const TOKEN = "fixture-provider-credential-only-for-tests";
const CODE = "fixture-one-time-pairing-code";
const target = { owner: "example", repo: "private", kind: "pull", number: 42 };
const raw = () => ({
  html_url: "https://github.com/example/private/pull/42",
  number: 42,
  title: "Changement confidentiel fictif",
  state: "closed",
  merged: true,
  draft: false,
  head: { sha: "a".repeat(40) },
  updated_at: "2026-10-19T12:00:00Z",
  body: "PRIVATE-BODY-EXCLUDED",
  token: TOKEN,
  user: { login: "EXCLUDED" },
});
const json = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const fixtures = [];
afterEach(async () => {
  for (const item of fixtures.splice(0)) {
    item.server.closeAllConnections();
    await new Promise((resolve) => item.server.close(resolve));
    const targetPath = resolve(item.directory);
    assert.ok(
      targetPath.startsWith(`${resolve(tmpdir())}${sep}lifeos-connector-test-`),
    );
    await rm(targetPath, { recursive: true, force: true });
  }
});
async function start(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "lifeos-connector-test-"));
  await writeFile(
    join(directory, "index.html"),
    "<!doctype html><title>Fixture LifeOS</title>",
  );
  await writeFile(join(directory, ".private.js"), TOKEN);
  await writeFile(join(directory, "source.js.map"), "SOURCE-EXCLUDED");
  let clock = Date.parse("2026-10-19T12:00:00Z");
  const calls = [];
  const upstream =
    options.upstream ||
    (async (url, init) => {
      calls.push({ url, init });
      return json(raw());
    });
  const config = connectorConfig({
    LIFEOS_GITHUB_TOKEN: TOKEN,
    LIFEOS_GITHUB_REPOSITORIES: "example/private",
  });
  const { server } = await createConnector({
    config,
    distRoot: directory,
    code: CODE,
    now: () => clock,
    upstream,
    ...options,
  });
  fixtures.push({ directory, server });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  async function api(path, body, patch = {}) {
    return fetch(`${origin}/api/connector/${path}`, {
      method: body === undefined ? "GET" : "POST",
      ...patch,
      headers: {
        "X-LifeOS-Request": "1",
        ...(body === undefined
          ? {}
          : { "Content-Type": "application/json", Origin: origin }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...patch.headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function pair() {
    const response = await api("pair", { code: CODE });
    assert.equal(response.status, 200);
    cookie = response.headers.get("set-cookie").split(";")[0];
    return response;
  }
  return {
    origin,
    server,
    api,
    pair,
    calls,
    advance: (ms) => {
      clock += ms;
    },
  };
}
test("configuration fermée, couple jeton/dépôts et liste canonique limitée", () => {
  assert.equal(connectorConfig({}).token, "");
  for (const env of [
    { LIFEOS_GITHUB_TOKEN: TOKEN },
    { LIFEOS_GITHUB_REPOSITORIES: "a/b" },
    { LIFEOS_GITHUB_TOKEN: TOKEN, LIFEOS_GITHUB_REPOSITORIES: "a/*" },
    {
      LIFEOS_GITHUB_TOKEN: TOKEN,
      LIFEOS_GITHUB_REPOSITORIES: "https://evil.test/a",
    },
    { LIFEOS_GITHUB_TOKEN: TOKEN, LIFEOS_GITHUB_REPOSITORIES: "a/b/c" },
    { LIFEOS_CONNECTOR_PORT: "0" },
    { LIFEOS_CONNECTOR_PORT: "NaN" },
  ])
    assert.throws(() => connectorConfig(env));
  const config = connectorConfig({
    LIFEOS_GITHUB_TOKEN: TOKEN,
    LIFEOS_GITHUB_REPOSITORIES: "Example/Private, example/private",
  });
  assert.deepEqual([...config.repositories], ["example/private"]);
});
test("statut/appairage sans GitHub ; cookie HttpOnly strict, unique et jamais dans le JSON", async () => {
  const f = await start();
  const before = await f.api("status");
  assert.deepEqual(await before.json(), {
    version: 1,
    githubConfigured: true,
    paired: false,
    expiresAt: null,
  });
  const paired = await f.pair();
  assert.match(
    paired.headers.get("set-cookie"),
    /HttpOnly; SameSite=Strict; Path=\/api\/connector; Max-Age=3600/,
  );
  const result = await paired.text();
  assert.doesNotMatch(result, new RegExp(`${TOKEN}|${CODE}|lifeos_connector`));
  assert.equal((await (await f.api("status")).json()).paired, true);
  assert.equal((await f.api("pair", { code: CODE })).status, 429);
  assert.equal(f.calls.length, 0);
});
test("lecture authentifiée unique vers l’hôte fixe, projection privée et état de mission absent", async () => {
  const f = await start();
  await f.pair();
  const response = await f.api("github/read", target);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  const result = await response.json();
  assert.deepEqual(result.target, target);
  assert.equal(result.check.merged, true);
  assert.match(result.check.title, /confidentiel/);
  assert.doesNotMatch(
    JSON.stringify(result),
    /PRIVATE-BODY-EXCLUDED|EXCLUDED|fixture-provider|mission|reports/,
  );
  assert.equal(f.calls.length, 1);
  assert.equal(
    f.calls[0].url,
    "https://api.github.com/repos/example/private/pulls/42",
  );
  assert.equal(f.calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(f.calls[0].init.method, "GET");
  assert.equal(f.calls[0].init.redirect, "error");
  assert.equal(f.calls[0].init.credentials, "omit");
  assert.equal(f.calls[0].init.body, undefined);
});
test("sans session, dépôt hors liste, cible malformée, champs supplémentaires : aucun appel fournisseur", async () => {
  const f = await start();
  assert.equal((await f.api("github/read", target)).status, 401);
  await f.pair();
  for (const invalid of [
    { ...target, host: "evil.test" },
    { ...target, repo: ".." },
    { ...target, kind: "delete" },
    { ...target, number: 0 },
    { ...target, mission: "private instructions" },
  ])
    assert.equal((await f.api("github/read", invalid)).status, 400);
  assert.equal(
    (await f.api("github/read", { ...target, repo: "other" })).status,
    403,
  );
  assert.equal(f.calls.length, 0);
});
test("origine étrangère/absente, marqueur absent, query, proxy et cross-site refusés", async () => {
  const f = await start();
  await f.pair();
  for (const patch of [
    { headers: { Origin: "https://evil.test" } },
    { headers: { Origin: "null" } },
    { headers: { Origin: "" } },
    { headers: { "X-LifeOS-Request": "" } },
    { headers: { "X-Forwarded-Host": "evil.test" } },
    { headers: { "X-Forwarded-For": "127.0.0.1" } },
    { headers: { "Sec-Fetch-Site": "cross-site" } },
  ])
    assert.equal((await f.api("github/read", target, patch)).status, 403);
  assert.equal((await f.api("status?token=x")).status, 403);
  assert.equal(
    (await f.api("github/read", undefined, { method: "DELETE" })).status,
    404,
  );
  assert.equal(f.calls.length, 0);
});
test("DNS rebinding : Host ne correspondant pas à 127.0.0.1 refusé", async () => {
  const f = await start();
  const status = await new Promise((resolve, reject) => {
    const request = httpRequest(
      f.origin,
      { headers: { Host: "evil.test" } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(status, 403);
});
test("cinq codes incorrects verrouillent, code initial expiré après dix minutes", async () => {
  const f = await start();
  for (let i = 0; i < 5; i++)
    assert.equal((await f.api("pair", { code: "wrong" })).status, 401);
  assert.equal((await f.api("pair", { code: CODE })).status, 429);
  const expired = await start();
  expired.advance(600000);
  assert.equal((await expired.api("pair", { code: CODE })).status, 429);
});
test("session d’une heure, déconnexion et redémarrage invalident l’accès", async () => {
  const f = await start();
  await f.pair();
  f.advance(3600000);
  assert.equal((await (await f.api("status")).json()).paired, false);
  assert.equal((await f.api("github/read", target)).status, 401);
  const g = await start();
  await g.pair();
  const logout = await g.api("logout", {});
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await g.api("github/read", target)).status, 401);
  const restarted = await start();
  assert.equal((await restarted.api("github/read", target)).status, 401);
  assert.equal(g.calls.length + f.calls.length, 0);
});
for (const status of [401, 403, 404, 500])
  test(`erreur GitHub ${status} sans texte fournisseur ni jeton`, async () => {
    const f = await start({
      upstream: async () =>
        json({ message: `${TOKEN} PRIVATE-BODY-EXCLUDED` }, status),
    });
    await f.pair();
    const response = await f.api("github/read", target);
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /fixture-provider|PRIVATE-BODY/);
  });
for (const status of [429, 403])
  test(`attente GitHub ${status} respectée entre clients sans réessai`, async () => {
    let calls = 0;
    const f = await start({
      upstream: async () => {
        calls++;
        return json({}, status, { "retry-after": "120" });
      },
    });
    await f.pair();
    assert.equal((await f.api("github/read", target)).status, 429);
    f.advance(2000);
    assert.equal((await f.api("github/read", target)).status, 429);
    assert.equal(calls, 1);
    f.advance(120000);
    assert.equal((await f.api("github/read", target)).status, 429);
    assert.equal(calls, 2);
  });
for (const value of [
  () =>
    json({ ...raw(), html_url: "https://github.com/other/private/pull/42" }),
  () => json({ ...raw(), number: 43 }),
  () => json({ ...raw(), head: { sha: "not-a-sha" } }),
  () =>
    new Response("<html>Not JSON</html>", {
      headers: { "Content-Type": "text/html" },
    }),
  () => new Response("{", { headers: { "Content-Type": "application/json" } }),
  () => json({}, 200, { "Content-Length": "1048577" }),
  () => json({ ...raw(), body: "x".repeat(1048576) }),
])
  test("réponse altérée, hors identité, invalide ou trop grande refusée", async () => {
    const f = await start({ upstream: async () => value() });
    await f.pair();
    assert.equal((await f.api("github/read", target)).status, 502);
  });
test("une lecture active seulement, déconnexion interrompt le fournisseur", async () => {
  let begun, aborted;
  const started = new Promise((resolve) => {
    begun = resolve;
  });
  const stopped = new Promise((resolve) => {
    aborted = resolve;
  });
  const f = await start({
    upstream: async (_url, init) => {
      begun();
      return new Promise((_resolve, reject) =>
        init.signal.addEventListener(
          "abort",
          () => {
            aborted();
            reject(new Error(TOKEN));
          },
          { once: true },
        ),
      );
    },
  });
  await f.pair();
  const first = f.api("github/read", target);
  await started;
  assert.equal((await f.api("github/read", target)).status, 429);
  assert.equal((await f.api("logout", {})).status, 200);
  await stopped;
  assert.equal((await first).status, 502);
});
test("délai serveur annule le fournisseur sans révéler sa cause", async () => {
  const f = await start({
    timeoutMs: 20,
    upstream: async (_url, init) =>
      new Promise((_resolve, reject) =>
        init.signal.addEventListener("abort", () => reject(new Error(TOKEN)), {
          once: true,
        }),
      ),
  });
  await f.pair();
  const response = await f.api("github/read", target);
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), new RegExp(TOKEN));
});
test("soixante lectures par heure au plus et reprise explicite après la fenêtre", async () => {
  const f = await start();
  await f.pair();
  for (let i = 0; i < 60; i++) {
    f.advance(2000);
    assert.equal((await f.api("github/read", target)).status, 200);
  }
  f.advance(2000);
  assert.equal((await f.api("github/read", target)).status, 429);
  assert.equal(f.calls.length, 60);
  f.advance(3600000);
  assert.equal((await f.api("github/read", target)).status, 401); // Session expiry is independent of the quota.
});
test("serveur statique isolé : code source, dotfiles, secrets, cartes et API inconnues absents", async () => {
  const f = await start();
  const root = await fetch(f.origin);
  assert.equal(root.status, 200);
  assert.match(
    root.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  for (const path of [
    "/.env",
    "/.private.js",
    "/source.js.map",
    "/server/connector.mjs",
    "/src/domain/githubWire.ts",
    "/api/other",
    "/%2e%2e/.env",
  ])
    assert.notEqual((await fetch(`${f.origin}${path}`)).status, 200);
  assert.equal(f.calls.length, 0);
});
test("corps et type entrants bornés avant tout appel fournisseur", async () => {
  const f = await start();
  await f.pair();
  assert.equal(
    (await f.api("github/read", { text: "x".repeat(5000) })).status,
    413,
  );
  assert.equal(
    (
      await f.api("github/read", target, {
        headers: { "Content-Type": "text/plain" },
      })
    ).status,
    415,
  );
  assert.equal(f.calls.length, 0);
});
test("appairages simultanés : une seule session émise pour le code", async () => {
  const f = await start();
  const responses = await Promise.all([
    f.api("pair", { code: CODE }),
    f.api("pair", { code: CODE }),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status).sort(),
    [200, 429],
  );
  assert.equal(
    responses.filter((response) => response.headers.has("set-cookie")).length,
    1,
  );
});
test("déconnexion pendant réception du corps : aucun appel GitHub après révocation", async () => {
  const f = await start();
  const paired = await f.pair();
  const cookie = paired.headers.get("set-cookie").split(";")[0];
  const rawBody = JSON.stringify(target);
  let request;
  const responsePromise = new Promise((resolve, reject) => {
    request = httpRequest(
      `${f.origin}/api/connector/github/read`,
      {
        method: "POST",
        headers: {
          Cookie: cookie,
          Origin: f.origin,
          "X-LifeOS-Request": "1",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(rawBody),
        },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
    request.flushHeaders();
    request.write(rawBody.slice(0, 1));
  });
  assert.equal((await f.api("logout", {})).status, 200);
  request.end(rawBody.slice(1));
  assert.equal(await responsePromise, 401);
  assert.equal(f.calls.length, 0);
});
test("annulation du client HTTP interrompt la lecture externe", async () => {
  let begin, stop;
  const begun = new Promise((resolve) => {
    begin = resolve;
  });
  const stopped = new Promise((resolve) => {
    stop = resolve;
  });
  const f = await start({
    upstream: async (_url, init) => {
      begin();
      return new Promise((_resolve, reject) =>
        init.signal.addEventListener(
          "abort",
          () => {
            stop();
            reject(new Error("cancelled"));
          },
          { once: true },
        ),
      );
    },
  });
  await f.pair();
  const controller = new AbortController();
  const read = f.api("github/read", target, { signal: controller.signal });
  const cancelled = assert.rejects(read);
  await begun;
  controller.abort();
  await stopped;
  await cancelled;
});
test("sans configuration, aucun code ne peut ouvrir l’accès privé", async () => {
  const f = await start({ config: connectorConfig({}) });
  const status = await (await f.api("status")).json();
  assert.equal(status.githubConfigured, false);
  assert.equal((await f.api("pair", { code: CODE })).status, 503);
  assert.equal((await f.api("github/read", target)).status, 401);
  assert.equal(f.calls.length, 0);
});
