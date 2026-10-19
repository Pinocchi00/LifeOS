import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { createConnector, connectorConfig } from "./connector.mjs";
import { AiBudget } from "./ai-budget.mjs";
import { aiConfig, projectAi } from "./ai.mjs";
import { aiCatalog, aiInstructions } from "../src/domain/ai.ts";
const KEY = "fixture-openai-provider-key-not-real";
const CODE = "fixture-ai-code";
const input = {
  text: "Une mission fictive à analyser. Éviter les faits inventés.",
  maxOutputTokens: 512,
};
const response = (patch = {}) => ({
  id: "resp_fixture",
  object: "response",
  model: aiCatalog.model,
  status: "completed",
  output: [
    { type: "reasoning", summary: [] },
    {
      type: "message",
      role: "assistant",
      content: [
        {
          type: "output_text",
          text: "Une proposition fictive, jamais exécutée.",
        },
      ],
    },
  ],
  usage: { input_tokens: 150, output_tokens: 100 },
  ...patch,
});
const fixtures = [];
afterEach(async () => {
  for (const f of fixtures.splice(0)) {
    f.server.closeAllConnections();
    await new Promise((resolve) => f.server.close(resolve));
    const target = resolve(f.dir);
    assert.ok(target.startsWith(`${resolve(tmpdir())}${sep}lifeos-ai-test-`));
    await rm(target, { recursive: true, force: true });
  }
});
async function start(options = {}) {
  const dir = await mkdtemp(join(tmpdir(), "lifeos-ai-test-"));
  await writeFile(join(dir, "index.html"), "<title>Fixture AI</title>");
  const ledgerPath = join(dir, "budget.sqlite");
  let clock = options.clock ?? Date.parse("2026-10-19T12:00:00Z");
  const calls = [];
  const config = connectorConfig({
    LIFEOS_OPENAI_KEY: KEY,
    LIFEOS_AI_DAILY_USD: "0.20",
    LIFEOS_AI_DAILY_CALLS: "2",
    ...options.env,
  });
  const upstream =
    options.upstream ||
    (async (url, init) => {
      calls.push({ url, init });
      return Response.json(
        url.endsWith("/input_tokens")
          ? { object: "response.input_tokens", input_tokens: 150 }
          : response(),
      );
    });
  const { server } = await createConnector({
    config,
    code: CODE,
    distRoot: dir,
    ledgerPath,
    now: () => clock,
    upstream,
    aiTimeoutMs: options.timeout || 1000,
  });
  fixtures.push({ server, dir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  const api = (path, body, patch = {}) =>
    fetch(`${origin}/api/connector/${path}`, {
      method: body === undefined ? "GET" : "POST",
      ...patch,
      headers: {
        "X-LifeOS-Request": "1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body === undefined
          ? {}
          : { Origin: origin, "Content-Type": "application/json" }),
        ...patch.headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  async function pair() {
    const r = await api("pair", { code: CODE });
    assert.equal(r.status, 200);
    cookie = r.headers.get("set-cookie").split(";")[0];
  }
  async function prepare(value = input) {
    const r = await api("ai/prepare", value);
    assert.equal(r.status, 200);
    return r.json();
  }
  const execute = (quoteId, patch = {}) =>
    api("ai/execute", { quoteId, confirmed: true }, patch);
  return {
    api,
    pair,
    prepare,
    execute,
    calls,
    config,
    ledgerPath,
    advance: (ms) => (clock += ms),
  };
}
test("configuration IA explicite, clé et deux limites obligatoires", () => {
  assert.equal(aiConfig({}), null);
  for (const env of [
    { LIFEOS_AI_DAILY_USD: "1" },
    { LIFEOS_OPENAI_KEY: KEY },
    {
      LIFEOS_OPENAI_KEY: KEY,
      LIFEOS_AI_DAILY_USD: "0.01",
      LIFEOS_AI_DAILY_CALLS: "1",
    },
    {
      LIFEOS_OPENAI_KEY: KEY,
      LIFEOS_AI_DAILY_USD: "1",
      LIFEOS_AI_DAILY_CALLS: "0",
    },
    {
      LIFEOS_OPENAI_KEY: KEY,
      LIFEOS_AI_DAILY_USD: "100",
      LIFEOS_AI_DAILY_CALLS: "10",
    },
  ])
    assert.throws(() => aiConfig(env));
});
test("statut, appairage et préparation ne contactent pas OpenAI ; aperçu exact et sans clé", async () => {
  const f = await start();
  let status = await (await f.api("ai/status")).json();
  assert.equal(status.configured, true);
  assert.equal(status.paired, false);
  assert.equal(status.budget, null);
  assert.equal((await f.api("ai/prepare", input)).status, 401);
  await f.pair();
  const quote = await f.prepare();
  assert.equal(quote.payload.instructions, aiInstructions);
  assert.equal(quote.payload.input, input.text);
  assert.deepEqual(quote.payload.tools, []);
  assert.equal(quote.payload.store, false);
  assert.equal(f.calls.length, 0);
  assert.doesNotMatch(JSON.stringify(quote), new RegExp(KEY));
});
test("comptage puis une génération, paramètres bornés, clé côté serveur et replay bloqué", async () => {
  const f = await start();
  await f.pair();
  const quote = await f.prepare();
  assert.equal(
    (await f.api("ai/execute", { quoteId: quote.id, confirmed: false })).status,
    409,
  );
  assert.equal(f.calls.length, 0);
  const r = await f.execute(quote.id);
  assert.equal(r.status, 200);
  const draft = await r.json();
  assert.equal(draft.responseId, "resp_fixture");
  assert.equal(f.calls.length, 2);
  assert.equal(
    f.calls[0].url,
    "https://api.openai.com/v1/responses/input_tokens",
  );
  assert.equal(f.calls[1].url, "https://api.openai.com/v1/responses");
  assert.deepEqual(JSON.parse(f.calls[0].init.body), {
    model: aiCatalog.model,
    instructions: aiInstructions,
    input: input.text,
  });
  assert.deepEqual(JSON.parse(f.calls[1].init.body), quote.payload);
  for (const call of f.calls) {
    assert.equal(call.init.headers.Authorization, `Bearer ${KEY}`);
    assert.equal(call.init.redirect, "error");
    assert.equal(call.init.credentials, "omit");
  }
  assert.equal((await f.execute(quote.id)).status, 409);
  assert.equal(f.calls.length, 2);
  const bytes = await readFile(f.ledgerPath);
  assert.ok(!bytes.includes(Buffer.from(KEY)));
  assert.ok(!bytes.includes(Buffer.from(input.text)));
});
test("nouvel aperçu invalide l’ancien ; expiration et déconnexion bloquent sans fournisseur", async () => {
  const f = await start();
  await f.pair();
  const old = await f.prepare();
  const next = await f.prepare();
  assert.equal((await f.execute(old.id)).status, 409);
  f.advance(120001);
  assert.equal((await f.execute(next.id)).status, 409);
  const last = await f.prepare();
  await f.api("logout", {});
  assert.equal((await f.execute(last.id)).status, 401);
  assert.equal(f.calls.length, 0);
});
test("catalogue périmé ou horloge antérieure : aucun aperçu exploitable", async () => {
  for (const day of ["2026-10-18T12:00:00Z", "2026-11-20T12:00:00Z"]) {
    const f = await start({ clock: Date.parse(day) });
    await f.pair();
    assert.equal((await (await f.api("ai/status")).json()).catalogFresh, false);
    assert.equal((await f.api("ai/prepare", input)).status, 409);
    assert.equal(f.calls.length, 0);
  }
});

test("budget et nombre d’essais bornent les générations, y compris après erreur", async () => {
  const f = await start({ env: { LIFEOS_AI_DAILY_CALLS: "1" } });
  await f.pair();
  const quote = await f.prepare();
  assert.equal((await f.execute(quote.id)).status, 200);
  assert.equal((await f.api("ai/prepare", input)).status, 409);
  const status = await (await f.api("ai/status")).json();
  assert.equal(status.budget.attempts, 1);
  assert.equal(status.budget.reservedNanoUsd, 100000000);
});
test("registre durable et transaction partagée : ni doublon ni dépassement après réouverture", async () => {
  const f = await start();
  const other = new AiBudget(f.ledgerPath, {
    dailyNanoUsd: 100000000,
    dailyCalls: 1,
  });
  const when = Date.parse("2026-10-19T12:00:00Z");
  other.reserve("one", when);
  other.close();
  const reopened = new AiBudget(f.ledgerPath, {
    dailyNanoUsd: 100000000,
    dailyCalls: 1,
  });
  assert.equal(reopened.summary(when).attempts, 1);
  assert.throws(() => reopened.reserve("one", when), /déjà/);
  assert.throws(() => reopened.reserve("two", when), /Limite/);
  assert.throws(
    () => reopened.reserve("backwards", when - 86400000),
    /horloge/,
  );
  reopened.reserve("tomorrow", when + 86400000);
  reopened.close();
});
for (const stage of ["count", "generate"])
  test(`erreur ${stage} : réserve maintenue, contenu fournisseur et clé exclus`, async () => {
    let calls = 0;
    const f = await start({
      upstream: async (url) => {
        calls++;
        return url.endsWith("/input_tokens") && stage === "generate"
          ? Response.json({
              object: "response.input_tokens",
              input_tokens: 100,
            })
          : Response.json({ error: KEY }, { status: 429 });
      },
    });
    await f.pair();
    const quote = await f.prepare();
    const r = await f.execute(quote.id);
    assert.equal(r.status, 409);
    assert.doesNotMatch(await r.text(), new RegExp(KEY));
    assert.equal(calls, stage === "count" ? 1 : 2);
    assert.equal(
      (await (await f.api("ai/status")).json()).budget.reservedNanoUsd,
      100000000,
    );
    assert.equal((await f.execute(quote.id)).status, 409);
  });
for (const count of [20001, -1, "100", null])
  test("comptage incompatible refuse la génération", async () => {
    const f = await start({
      upstream: async () =>
        Response.json({ object: "response.input_tokens", input_tokens: count }),
    });
    await f.pair();
    const quote = await f.prepare();
    assert.equal((await f.execute(quote.id)).status, 409);
  });
test("identité modèle, outils inattendus, usage hors borne et sortie vide refusés", () => {
  for (const patch of [
    { model: "other-model" },
    { output: [{ type: "function_call", arguments: "execute" }] },
    { output: [] },
    { usage: { input_tokens: 10, output_tokens: 1025 } },
  ])
    assert.throws(() => projectAi(response(patch), 512, Date.now()));
  const refused = projectAi(
    response({
      status: "incomplete",
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "refusal", refusal: "Non." }],
        },
      ],
    }),
    512,
    Date.now(),
  );
  assert.equal(refused.refusal, true);
  assert.equal(refused.status, "incomplete");
});
test("annulation et révocation interrompent avant génération, sans remboursement implicite", async () => {
  let begin, cancel;
  const begun = new Promise((resolve) => (begin = resolve)),
    stopped = new Promise((resolve) => (cancel = resolve));
  const f = await start({
    upstream: async (_url, init) => {
      begin();
      return new Promise((_resolve, reject) =>
        init.signal.addEventListener(
          "abort",
          () => {
            cancel();
            reject(new Error(KEY));
          },
          { once: true },
        ),
      );
    },
  });
  await f.pair();
  const quote = await f.prepare();
  const call = f.execute(quote.id);
  await begun;
  await f.api("logout", {});
  await stopped;
  assert.equal((await call).status, 409);
});
test("requête hors origine, champs supplémentaires et corps trop grand refusés sans fournisseur", async () => {
  const f = await start();
  await f.pair();
  assert.equal(
    (
      await f.api("ai/prepare", input, {
        headers: { Origin: "https://evil.test" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.api("ai/prepare", { ...input, apiKey: KEY })).status,
    409,
  );
  assert.equal(
    (
      await f.api("ai/prepare", {
        text: "x".repeat(33000),
        maxOutputTokens: 512,
      })
    ).status,
    413,
  );
  assert.equal(f.calls.length, 0);
});
test("deux exécutions simultanées consomment une seule autorisation", async () => {
  const f = await start();
  await f.pair();
  const quote = await f.prepare();
  const results = await Promise.all([f.execute(quote.id), f.execute(quote.id)]);
  assert.deepEqual(
    results.map((response) => response.status).sort(),
    [200, 409],
  );
  assert.equal(f.calls.length, 2);
  assert.equal((await (await f.api("ai/status")).json()).budget.attempts, 1);
});
test("erreur SQLite et verrou concurrent bloquent avant fournisseur", async () => {
  const f = await start();
  await f.pair();
  const quote = await f.prepare();
  const lock = new AiBudget(f.ledgerPath, {
    dailyNanoUsd: 100000000,
    dailyCalls: 1,
  });
  lock.db.exec("BEGIN IMMEDIATE");
  try {
    const result = await f.execute(quote.id);
    assert.equal(result.status, 409);
    assert.equal(f.calls.length, 0);
  } finally {
    lock.db.exec("ROLLBACK");
    lock.close();
  }
});
test("le délai de réponse annule sans reprendre la génération", async () => {
  let aborted = false;
  const f = await start({
    timeout: 20,
    upstream: async (_url, init) =>
      new Promise((_resolve, reject) =>
        init.signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            reject(new Error(KEY));
          },
          { once: true },
        ),
      ),
  });
  await f.pair();
  const quote = await f.prepare();
  assert.equal((await f.execute(quote.id)).status, 409);
  assert.equal(aborted, true);
  assert.equal(
    (await (await f.api("ai/status")).json()).budget.reservedNanoUsd,
    100000000,
  );
});
test("annulation HTTP du client interrompt le fournisseur et conserve sa réserve", async () => {
  let begin, stop;
  const begun = new Promise((resolve) => (begin = resolve)),
    stopped = new Promise((resolve) => (stop = resolve));
  const f = await start({
    upstream: async (_url, init) => {
      begin();
      return new Promise((_resolve, reject) =>
        init.signal.addEventListener(
          "abort",
          () => {
            stop();
            reject(new Error(KEY));
          },
          { once: true },
        ),
      );
    },
  });
  await f.pair();
  const quote = await f.prepare();
  const controller = new AbortController();
  const pending = f.execute(quote.id, { signal: controller.signal });
  const result = assert.rejects(pending);
  await begun;
  controller.abort();
  await stopped;
  await result;
  assert.equal(
    (await (await f.api("ai/status")).json()).budget.reservedNanoUsd,
    100000000,
  );
});
test("attente fournisseur 429 respectée sans nouvel essai ni réservation", async () => {
  const f = await start({
    upstream: async () =>
      Response.json({}, { status: 429, headers: { "retry-after": "120" } }),
  });
  await f.pair();
  const quote = await f.prepare();
  await f.execute(quote.id);
  const before = (await (await f.api("ai/status")).json()).budget;
  assert.equal((await f.api("ai/prepare", input)).status, 409);
  assert.deepEqual((await (await f.api("ai/status")).json()).budget, before);
  f.advance(120001);
  assert.equal((await f.api("ai/prepare", input)).status, 200);
});
test("registre futur incompatible préservé et refusé", async () => {
  const f = await start();
  const db = new AiBudget(f.ledgerPath, {
    dailyNanoUsd: 100000000,
    dailyCalls: 1,
  });
  db.db.exec("PRAGMA user_version=99");
  db.close();
  assert.throws(
    () =>
      new AiBudget(f.ledgerPath, { dailyNanoUsd: 100000000, dailyCalls: 1 }),
    /incompatible/,
  );
});
test("une réponse valide ne peut pas renvoyer la clé du serveur", async () => {
  const f = await start({
    upstream: async (url) =>
      Response.json(
        url.endsWith("/input_tokens")
          ? { object: "response.input_tokens", input_tokens: 100 }
          : response({
              output: [
                {
                  type: "message",
                  role: "assistant",
                  content: [{ type: "output_text", text: KEY }],
                },
              ],
            }),
      ),
  });
  await f.pair();
  const quote = await f.prepare();
  const r = await f.execute(quote.id);
  assert.equal(r.status, 409);
  assert.doesNotMatch(await r.text(), new RegExp(KEY));
});
test("un verrou après génération ne perd pas la réponse et conserve la réserve durable", async () => {
  let lock;
  const f = await start({
    upstream: async (url) => {
      if (url.endsWith("/input_tokens"))
        return Response.json({
          object: "response.input_tokens",
          input_tokens: 100,
        });
      lock = new AiBudget(f.ledgerPath, {
        dailyNanoUsd: 100000000,
        dailyCalls: 1,
      });
      lock.db.exec("BEGIN IMMEDIATE");
      return Response.json(response());
    },
  });
  await f.pair();
  const quote = await f.prepare();
  try {
    const r = await f.execute(quote.id);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).responseId, "resp_fixture");
  } finally {
    lock.db.exec("ROLLBACK");
    lock.close();
  }
  assert.equal(
    (await (await f.api("ai/status")).json()).budget.reservedNanoUsd,
    100000000,
  );
});
