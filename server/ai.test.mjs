import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { createConnector, connectorConfig } from "./connector.mjs";
import { AiBudget } from "./ai-budget.mjs";
import { aiConfig, projectAi, projectAnthropic } from "./ai.mjs";
import { aiCatalog, aiInstructions, aiCountPayload } from "../src/domain/ai.ts";
const KEY = "fixture-openai-provider-key-not-real";
const CODE = "fixture-ai-code";
const ANTHROPIC_KEY = "fixture-anthropic-key-not-real";
const claudeResponse = (model = "claude-sonnet-5-5", patch = {}) => ({
  id: "msg_fixture",
  type: "message",
  role: "assistant",
  model,
  stop_reason: "end_turn",
  content: [{ type: "text", text: "Une proposition Claude fictive." }],
  usage: {
    input_tokens: 150,
    output_tokens: 100,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  ...patch,
});
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
      if (url === "https://api.anthropic.com/v1/messages/count_tokens")
        return Response.json({ input_tokens: 150 });
      if (url === "https://api.anthropic.com/v1/messages")
        return Response.json(claudeResponse(JSON.parse(init.body).model));
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

test("configuration Anthropic seule ou avec OpenAI, mêmes limites obligatoires", () => {
  const env = {
    LIFEOS_ANTHROPIC_KEY: ANTHROPIC_KEY,
    LIFEOS_AI_DAILY_USD: "0.20",
    LIFEOS_AI_DAILY_CALLS: "2",
  };
  assert.equal(aiConfig(env).key, "");
  assert.equal(aiConfig(env).anthropicKey, ANTHROPIC_KEY);
  assert.equal(aiConfig({ ...env, LIFEOS_OPENAI_KEY: KEY }).dailyCalls, 2);
  for (const patch of [
    { LIFEOS_AI_DAILY_CALLS: "" },
    { LIFEOS_ANTHROPIC_KEY: "bad\nkey" },
  ])
    assert.throws(() => aiConfig({ ...env, ...patch }));
});
for (const model of ["claude-sonnet-5-5", "claude-haiku-5-5"]) {
  test(`${model} : aperçu sans fournisseur, comptage puis requête exacte, clé et modèle isolés`, async () => {
    const f = await start({
      env: { LIFEOS_OPENAI_KEY: "", LIFEOS_ANTHROPIC_KEY: ANTHROPIC_KEY },
    });
    const status = await (await f.api("ai/status")).json();
    assert.deepEqual(status.providers, { OpenAI: false, Anthropic: true });
    await f.pair();
    const value = { ...input, model };
    const quote = await f.prepare(value);
    assert.equal(f.calls.length, 0);
    assert.equal(
      quote.payload.thinking.type,
      model.includes("sonnet") ? "between_tools" : "disabled",
    );
    assert.equal(quote.payload.tool_choice.type, "none");
    assert.equal(quote.payload.service_tier, "standard_only");
    const reply = await f.execute(quote.id);
    assert.equal(reply.status, 200);
    const draft = await reply.json();
    assert.equal(draft.model, model);
    assert.equal(draft.responseId, "msg_fixture");
    assert.equal(
      draft.estimatedNanoUsd,
      model.includes("sonnet") ? 1375000 : 68750,
    );
    assert.deepEqual(
      f.calls.map((call) => call.url),
      [
        "https://api.anthropic.com/v1/messages/count_tokens",
        "https://api.anthropic.com/v1/messages",
      ],
    );
    assert.deepEqual(JSON.parse(f.calls[0].init.body), aiCountPayload(value));
    assert.deepEqual(JSON.parse(f.calls[1].init.body), quote.payload);
    for (const call of f.calls) {
      assert.equal(call.init.headers["x-api-key"], ANTHROPIC_KEY);
      assert.equal(call.init.headers["anthropic-version"], "2023-06-01");
      assert.equal(call.init.headers.Authorization, undefined);
      assert.equal(call.init.redirect, "error");
      assert.equal(call.init.credentials, "omit");
    }
    assert.equal((await f.execute(quote.id)).status, 409);
    assert.equal(f.calls.length, 2);
    const bytes = await readFile(f.ledgerPath);
    assert.ok(!bytes.includes(Buffer.from(ANTHROPIC_KEY)));
    assert.ok(!bytes.includes(Buffer.from(input.text)));
  });
}
test("fournisseur absent et modèle arbitraire refusés sans remplacement automatique", async () => {
  const f = await start();
  await f.pair();
  for (const model of [
    "claude-sonnet-5-5",
    "claude-haiku-5-5",
    "https://evil.invalid",
    "other",
  ])
    assert.equal((await f.api("ai/prepare", { ...input, model })).status, 409);
  assert.equal(f.calls.length, 0);
});
test("changement de modèle invalide l’ancienne autorisation ; budget partagé entre fournisseurs", async () => {
  const f = await start({ env: { LIFEOS_ANTHROPIC_KEY: ANTHROPIC_KEY } });
  await f.pair();
  const old = await f.prepare();
  const sonnet = await f.prepare({ ...input, model: "claude-sonnet-5-5" });
  assert.equal((await f.execute(old.id)).status, 409);
  assert.equal(f.calls.length, 0);
  assert.equal((await f.execute(sonnet.id)).status, 200);
  const openai = await f.prepare();
  assert.equal((await f.execute(openai.id)).status, 200);
  assert.equal(
    (await f.api("ai/prepare", { ...input, model: "claude-haiku-5-5" })).status,
    409,
  );
  assert.equal(f.calls.length, 4);
  const status = await (await f.api("ai/status")).json();
  assert.equal(status.budget.attempts, 2);
  assert.equal(status.budget.reservedNanoUsd, 200000000);
});
test("Claude : refus et limite de sortie signalés sans confondre validation et réception", () => {
  for (const reason of ["refusal", "max_tokens"]) {
    const draft = projectAnthropic(
      claudeResponse("claude-haiku-5-5", { stop_reason: reason }),
      512,
      Date.now(),
      "claude-haiku-5-5",
    );
    assert.equal(draft.refusal, reason === "refusal");
    assert.equal(
      draft.status,
      reason === "max_tokens" ? "incomplete" : "completed",
    );
  }
  assert.equal(
    projectAnthropic(
      claudeResponse("claude-sonnet-5-5", {
        stop_details: { type: "refusal", explanation: "Fixture" },
      }),
      512,
      Date.now(),
      "claude-sonnet-5-5",
    ).refusal,
    true,
  );
});
test("Claude : attente 429 bloque tout nouvel appel et garde la réserve commune", async () => {
  let calls = 0;
  const f = await start({
    env: { LIFEOS_ANTHROPIC_KEY: ANTHROPIC_KEY },
    upstream: async () => {
      calls++;
      return Response.json(
        { error: ANTHROPIC_KEY },
        { status: 429, headers: { "Retry-After": "30" } },
      );
    },
  });
  await f.pair();
  const q = await f.prepare({ ...input, model: "claude-sonnet-5-5" });
  const r = await f.execute(q.id);
  assert.equal(r.status, 409);
  assert.ok(!(await r.text()).includes(ANTHROPIC_KEY));
  assert.equal((await f.api("ai/prepare", input)).status, 409);
  assert.equal(calls, 1);
  assert.equal((await (await f.api("ai/status")).json()).budget.attempts, 1);
});
test("Claude : déconnexion interrompt le fournisseur sans relance et conserve la réserve", async () => {
  let begin;
  const begun = new Promise((resolve) => {
    begin = resolve;
  });
  let stopped = false,
    calls = 0;
  const f = await start({
    env: { LIFEOS_ANTHROPIC_KEY: ANTHROPIC_KEY },
    upstream: async (_url, init) => {
      calls++;
      begin();
      return new Promise((_resolve, reject) =>
        init.signal.addEventListener(
          "abort",
          () => {
            stopped = true;
            reject(new Error(ANTHROPIC_KEY));
          },
          { once: true },
        ),
      );
    },
  });
  await f.pair();
  const q = await f.prepare({ ...input, model: "claude-sonnet-5-5" });
  const pending = f.execute(q.id);
  await begun;
  assert.equal((await f.api("logout", {})).status, 200);
  const result = await pending;
  assert.equal(result.status, 409);
  assert.equal(stopped, true);
  assert.equal(calls, 1);
  const db = new AiBudget(f.ledgerPath, f.config.ai);
  try {
    assert.equal(
      db.summary(Date.parse("2026-10-19T12:00:00Z")).reservedNanoUsd,
      100000000,
    );
  } finally {
    db.close();
  }
});
test("Claude : modèle, outils, cache inattendu, raisonnement, usage et forme incompatibles refusés", () => {
  for (const patch of [
    { model: "claude-haiku-5-5" },
    { model: "claude-sonnet-5-5-untrusted" },
    { id: "resp_wrong" },
    { stop_reason: "tool_use" },
    { stop_reason: "pause_turn" },
    { role: "user" },
    { content: [] },
    { content: [{ type: "tool_use", name: "bad" }] },
    { content: [{ type: "thinking", thinking: "not an answer" }] },
    { usage: { input_tokens: 20001, output_tokens: 10 } },
    { usage: { input_tokens: 10, output_tokens: 513 } },
    {
      usage: {
        input_tokens: 10,
        output_tokens: 10,
        cache_read_input_tokens: 100,
      },
    },
    { content: [{ type: "text", text: "x".repeat(8001) }] },
  ])
    assert.throws(() =>
      projectAnthropic(
        claudeResponse("claude-sonnet-5-5", patch),
        512,
        Date.now(),
        "claude-sonnet-5-5",
      ),
    );
});
test("Claude : comptage hors limite empêche la génération et conserve la réserve", async () => {
  let calls = 0;
  const f = await start({
    env: { LIFEOS_ANTHROPIC_KEY: ANTHROPIC_KEY },
    upstream: async () => {
      calls++;
      return Response.json({ input_tokens: 20001 });
    },
  });
  await f.pair();
  const q = await f.prepare({ ...input, model: "claude-haiku-5-5" });
  assert.equal((await f.execute(q.id)).status, 409);
  assert.equal(calls, 1);
  assert.equal((await (await f.api("ai/status")).json()).budget.attempts, 1);
});
test("Claude : erreurs et réponses avec une des clés sont filtrées sans reprise OpenAI", async () => {
  for (const secret of [KEY, ANTHROPIC_KEY]) {
    let calls = 0;
    const f = await start({
      env: { LIFEOS_ANTHROPIC_KEY: ANTHROPIC_KEY },
      upstream: async (url) => {
        calls++;
        return Response.json(
          url.endsWith("/count_tokens")
            ? { input_tokens: 150 }
            : claudeResponse("claude-sonnet-5-5", {
                content: [{ type: "text", text: secret }],
              }),
        );
      },
    });
    await f.pair();
    const q = await f.prepare({ ...input, model: "claude-sonnet-5-5" });
    const r = await f.execute(q.id);
    assert.equal(r.status, 409);
    assert.ok(!(await r.text()).includes(secret));
    assert.equal(calls, 2);
    assert.equal((await f.execute(q.id)).status, 409);
    assert.equal(calls, 2);
  }
});
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
