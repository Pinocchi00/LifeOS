import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  aiCatalog,
  aiPayload,
  aiInputSchema,
  aiDraftSchema,
  aiModels,
  aiModel,
  findAiModel,
  aiCountPayload,
} from "../src/domain/ai.ts";
import { readGithubJson } from "../src/domain/githubWire.ts";
import { AiBudget } from "./ai-budget.mjs";
export function aiConfig(env) {
  const key = env.LIFEOS_OPENAI_KEY?.trim() || "";
  const anthropicKey = env.LIFEOS_ANTHROPIC_KEY?.trim() || "";
  if (!key && !anthropicKey) {
    if (env.LIFEOS_AI_DAILY_USD || env.LIFEOS_AI_DAILY_CALLS)
      throw new Error(
        "Limites IA sans clé serveur. Configurez une clé et les deux limites ensemble.",
      );
    return null;
  }
  if (key && !/^[\x21-\x7e]{10,500}$/.test(key))
    throw new Error("Clé OpenAI serveur invalide.");
  if (anthropicKey && !/^[\x21-\x7e]{10,500}$/.test(anthropicKey))
    throw new Error("Clé Anthropic serveur invalide.");
  const dollars = env.LIFEOS_AI_DAILY_USD || "";
  const calls = env.LIFEOS_AI_DAILY_CALLS || "";
  if (
    !/^(?:0\.[1-9][0-9]?|[1-9](?:\.[0-9]{1,2})?|10(?:\.0{1,2})?)$/.test(
      dollars,
    ) ||
    !/^[1-9][0-9]?$|^100$/.test(calls)
  )
    throw new Error(
      "Configurez un budget IA de 0.10 à 10 USD et 1 à 100 essais par jour UTC.",
    );
  return {
    key,
    anthropicKey,
    dailyNanoUsd: Math.round(Number(dollars) * 1e9),
    dailyCalls: Number(calls),
  };
}
const tokenCount = z.object({
  object: z.literal("response.input_tokens"),
  input_tokens: z.number().int().nonnegative().max(20000),
});
const usage = z.object({
  input_tokens: z.number().int().nonnegative().max(20000),
  output_tokens: z.number().int().nonnegative().max(1024),
});
export function projectAi(raw, maxOutput, time) {
  const response = z
    .object({
      id: z.string().regex(/^resp_[a-zA-Z0-9_-]{1,180}$/),
      object: z.literal("response"),
      model: z.string(),
      status: z.enum(["completed", "incomplete"]),
      output: z.array(z.unknown()).max(30),
      usage,
    })
    .parse(raw);
  if (findAiModel(response.model)?.model !== aiCatalog.model)
    throw new Error("Modèle inattendu.");
  if (response.usage.output_tokens > maxOutput)
    throw new Error("Sortie hors limite.");
  let refusal = false;
  const texts = [];
  for (const item of response.output) {
    if (item?.type === "reasoning") continue;
    if (
      item?.type !== "message" ||
      item.role !== "assistant" ||
      !Array.isArray(item.content)
    )
      throw new Error("Sortie incompatible.");
    for (const content of item.content) {
      if (content.type === "output_text" && typeof content.text === "string")
        texts.push(content.text);
      else if (
        content.type === "refusal" &&
        typeof content.refusal === "string"
      ) {
        refusal = true;
        texts.push(content.refusal);
      } else throw new Error("Contenu incompatible.");
    }
  }
  return aiDraftSchema.parse({
    responseId: response.id,
    model: response.model,
    receivedAt: new Date(time).toISOString(),
    status: response.status,
    text: texts.join("\n\n"),
    refusal,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    estimatedNanoUsd:
      response.usage.input_tokens * 2500 + response.usage.output_tokens * 12000,
    reservedNanoUsd: aiCatalog.reserveNanoUsd,
  });
}
export function projectAnthropic(raw, maxOutput, time, modelId) {
  const response = z
    .object({
      id: z.string().regex(/^msg_[a-zA-Z0-9_-]{1,180}$/),
      type: z.literal("message"),
      role: z.literal("assistant"),
      model: z.string(),
      stop_reason: z.enum(["end_turn", "max_tokens", "refusal"]),
      stop_details: z.object({ type: z.string() }).nullable().optional(),
      content: z
        .array(
          z
            .object({
              type: z.literal("text"),
              text: z.string(),
              citations: z.array(z.unknown()).max(0).optional(),
            })
            .strict(),
        )
        .max(30),
      usage: usage.extend({
        cache_creation_input_tokens: z
          .number()
          .int()
          .nonnegative()
          .max(0)
          .optional(),
        cache_read_input_tokens: z
          .number()
          .int()
          .nonnegative()
          .max(0)
          .optional(),
      }),
    })
    .parse(raw);
  if (
    findAiModel(response.model)?.model !== modelId ||
    response.usage.output_tokens > maxOutput
  )
    throw new Error("Modèle ou sortie incompatible.");
  const model = aiModel(modelId);
  return aiDraftSchema.parse({
    responseId: response.id,
    model: response.model,
    receivedAt: new Date(time).toISOString(),
    status: response.stop_reason === "max_tokens" ? "incomplete" : "completed",
    text: response.content.map((item) => item.text).join("\n\n"),
    refusal:
      response.stop_reason === "refusal" ||
      response.stop_details?.type === "refusal",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    estimatedNanoUsd: Math.ceil(
      response.usage.input_tokens * model.precautionInputUsdPerMillion * 1000 +
        response.usage.output_tokens * model.outputUsdPerMillion * 1000,
    ),
    reservedNanoUsd: model.reserveNanoUsd,
  });
}
export function createAi({
  config,
  ledgerPath,
  now,
  upstream,
  timeoutMs = 60000,
}) {
  const ledger = config ? new AiBudget(ledgerPath, config) : null;
  let quote = null,
    active = null,
    quoteTimer = null,
    closing = false,
    retryAt = 0;
  const fresh = () =>
    aiModels.every(
      (model) =>
        new Date(now()).toISOString().slice(0, 10) >= model.checkedOn &&
        new Date(now()).toISOString().slice(0, 10) <= model.validUntil,
    );
  const keyFor = (model) =>
    model.provider === "OpenAI" ? config?.key : config?.anthropicKey;
  return {
    configured: Boolean(config),
    status(session) {
      return {
        configured: Boolean(config),
        paired: Boolean(session),
        expiresAt: session ? new Date(session.expiresAt).toISOString() : null,
        budget: session && ledger ? ledger.summary(now()) : null,
        catalogFresh: fresh(),
        providers: {
          OpenAI: Boolean(config?.key),
          Anthropic: Boolean(config?.anthropicKey),
        },
      };
    },
    prepare(input, session) {
      if (now() < retryAt)
        throw new Error(
          "Le fournisseur IA demande une attente. Réessayez plus tard ; aucun nouvel appel n’a été effectué.",
        );
      if (!config || !session || !fresh())
        throw new Error(
          "Accès IA non configuré, session absente ou catalogue à actualiser.",
        );
      const available = ledger.summary(now());
      const value = aiInputSchema.parse(input);
      const model = aiModel(value.model);
      if (!keyFor(model))
        throw new Error(
          "Ce fournisseur n’est pas configuré. Aucun autre modèle n’est utilisé à sa place.",
        );
      if (
        available.attempts >= available.dailyCalls ||
        available.reservedNanoUsd + aiCatalog.reserveNanoUsd >
          available.dailyNanoUsd
      )
        throw new Error(
          "Limite quotidienne IA atteinte. Aucun envoi au fournisseur.",
        );
      clearTimeout(quoteTimer);
      const payload = aiPayload(value);
      quote = {
        id: randomBytes(16).toString("hex"),
        expiresAt: now() + 120000,
        payload,
        input: value,
        model,
        session,
      };
      quoteTimer = setTimeout(() => {
        quote = null;
      }, 120000);
      quoteTimer.unref();
      return {
        id: quote.id,
        expiresAt: new Date(quote.expiresAt).toISOString(),
        payload,
        budget: ledger.summary(now()),
      };
    },
    async execute(body, session, req, res, isValid) {
      const approval = z
        .object({ quoteId: z.string(), confirmed: z.literal(true) })
        .strict()
        .parse(body);
      if (
        !config ||
        now() < retryAt ||
        !session ||
        !fresh() ||
        !quote ||
        quote.session !== session ||
        quote.id !== approval.quoteId ||
        quote.expiresAt <= now() ||
        active
      )
        throw new Error(
          "Autorisation absente, expirée, remplacée ou envoi déjà lancé. Préparez un nouvel aperçu.",
        );
      const chosen = quote;
      const key = keyFor(chosen.model);
      if (!key) throw new Error("Fournisseur non configuré.");
      clearTimeout(quoteTimer);
      quote = null;
      ledger.reserve(chosen.id, now());
      const controller = new AbortController();
      active = controller;
      const cancel = () => {
        if (!res.writableEnded) controller.abort();
      };
      res.on("close", cancel);
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const check = () => {
        if (
          !fresh() ||
          controller.signal.aborted ||
          req.aborted ||
          res.destroyed ||
          !isValid()
        )
          throw new Error(
            "Envoi interrompu ou session expirée. Une facturation reste possible ; l’enveloppe est conservée.",
          );
      };
      const isAnthropic = chosen.model.provider === "Anthropic";
      async function call(counting, payload) {
        check();
        const response = await upstream(
          isAnthropic
            ? `https://api.anthropic.com/v1/messages${counting ? "/count_tokens" : ""}`
            : `https://api.openai.com/v1/responses${counting ? "/input_tokens" : ""}`,
          {
            method: "POST",
            credentials: "omit",
            redirect: "error",
            cache: "no-store",
            signal: controller.signal,
            headers: {
              ...(isAnthropic
                ? { "x-api-key": key, "anthropic-version": "2023-06-01" }
                : { Authorization: `Bearer ${key}` }),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );
        if (!response.ok) {
          if (response.status === 429) {
            const seconds = Number(response.headers.get("retry-after"));
            retryAt =
              now() + (seconds > 0 ? Math.min(seconds, 86400) : 60) * 1000;
          }
          await response.body?.cancel();
          throw new Error(
            "Le fournisseur refuse l’appel ou est indisponible. Aucun réessai automatique ; l’enveloppe reste réservée.",
          );
        }
        return readGithubJson(response);
      }
      try {
        const count = (
          isAnthropic ? tokenCount.omit({ object: true }) : tokenCount
        ).parse(await call(true, aiCountPayload(chosen.input)));
        check();
        if (
          count.input_tokens *
            chosen.model.precautionInputUsdPerMillion *
            1000 +
            chosen.input.maxOutputTokens *
              chosen.model.outputUsdPerMillion *
              1000 >
          chosen.model.reserveNanoUsd
        )
          throw new Error(
            "Coût de précaution supérieur à l’enveloppe. Génération refusée.",
          );
        const raw = await call(false, chosen.payload);
        const result = isAnthropic
          ? projectAnthropic(
              raw,
              chosen.input.maxOutputTokens,
              now(),
              chosen.model.model,
            )
          : projectAi(raw, chosen.input.maxOutputTokens, now());
        check();
        if (
          Object.values(result).some(
            (value) =>
              typeof value === "string" &&
              [config.key, config.anthropicKey]
                .filter(Boolean)
                .some((secret) => value.includes(secret)),
          )
        )
          throw new Error("Contenu confidentiel refusé.");
        // The durable reservation is already committed. A failure to update
        // its descriptive state must not discard a received, valid answer.
        try {
          ledger.finish(chosen.id, "received");
        } catch {
          /* Keep reserved. */
        }
        return result;
      } catch (error) {
        try {
          ledger.finish(chosen.id, "uncertain");
        } catch {
          /* Keep reserved. */
        }
        // Never forward provider errors, response bodies or payloads.
        if (error instanceof z.ZodError)
          throw new Error(
            "Réponse IA incompatible. Aucune adoption ; l’enveloppe reste réservée.",
          );
        throw new Error(
          "Appel IA interrompu, refusé ou réponse incompatible. Une facturation reste possible ; l’enveloppe reste réservée. Aucun réessai automatique.",
        );
      } finally {
        clearTimeout(timer);
        res.off("close", cancel);
        active = null;
        if (closing) ledger.close();
      }
    },
    revoke() {
      clearTimeout(quoteTimer);
      quote = null;
      active?.abort();
    },
    close() {
      closing = true;
      clearTimeout(quoteTimer);
      quote = null;
      active?.abort();
      if (!active) ledger?.close();
    },
  };
}
