import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  aiCatalog,
  aiPayload,
  aiInputSchema,
  aiDraftSchema,
} from "../src/domain/ai.ts";
import { readGithubJson } from "../src/domain/githubWire.ts";
import { AiBudget } from "./ai-budget.mjs";
export function aiConfig(env) {
  const key = env.LIFEOS_OPENAI_KEY?.trim() || "";
  if (!key) {
    if (env.LIFEOS_AI_DAILY_USD || env.LIFEOS_AI_DAILY_CALLS)
      throw new Error(
        "Limites IA sans clé serveur. Configurez les trois ensemble.",
      );
    return null;
  }
  if (!/^[\x21-\x7e]{10,500}$/.test(key))
    throw new Error("Clé OpenAI serveur invalide.");
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
      id: z.string(),
      object: z.literal("response"),
      model: z.string(),
      status: z.enum(["completed", "incomplete"]),
      output: z.array(z.unknown()).max(30),
      usage,
    })
    .parse(raw);
  if (
    response.model !== aiCatalog.model &&
    !response.model.startsWith(`${aiCatalog.model}-`)
  )
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
    new Date(now()).toISOString().slice(0, 10) >= aiCatalog.checkedOn &&
    new Date(now()).toISOString().slice(0, 10) <= aiCatalog.validUntil;
  return {
    configured: Boolean(config),
    status(session) {
      return {
        configured: Boolean(config),
        paired: Boolean(session),
        expiresAt: session ? new Date(session.expiresAt).toISOString() : null,
        budget: session && ledger ? ledger.summary(now()) : null,
        catalogFresh: fresh(),
      };
    },
    prepare(input, session) {
      if (now() < retryAt)
        throw new Error(
          "OpenAI demande une attente. Réessayez plus tard ; aucun nouvel appel n’a été effectué.",
        );
      if (!config || !session || !fresh())
        throw new Error(
          "Accès IA non configuré, session absente ou catalogue à actualiser.",
        );
      const available = ledger.summary(now());
      if (
        available.attempts >= available.dailyCalls ||
        available.reservedNanoUsd + aiCatalog.reserveNanoUsd >
          available.dailyNanoUsd
      )
        throw new Error(
          "Limite quotidienne IA atteinte. Aucun envoi à OpenAI.",
        );
      clearTimeout(quoteTimer);
      const payload = aiPayload(aiInputSchema.parse(input));
      quote = {
        id: randomBytes(16).toString("hex"),
        expiresAt: now() + 120000,
        payload,
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
      async function call(path, payload) {
        check();
        const response = await upstream(
          `https://api.openai.com/v1/responses${path}`,
          {
            method: "POST",
            credentials: "omit",
            redirect: "error",
            cache: "no-store",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${config.key}`,
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
            "OpenAI refuse l’appel ou est indisponible. Aucun réessai automatique ; l’enveloppe reste réservée.",
          );
        }
        return readGithubJson(response);
      }
      try {
        const { model, instructions, input } = chosen.payload;
        const count = tokenCount.parse(
          await call("/input_tokens", { model, instructions, input }),
        );
        check();
        if (
          count.input_tokens * 2500 + chosen.payload.max_output_tokens * 12000 >
          aiCatalog.reserveNanoUsd
        )
          throw new Error(
            "Coût de précaution supérieur à l’enveloppe. Génération refusée.",
          );
        const result = projectAi(
          await call("", chosen.payload),
          chosen.payload.max_output_tokens,
          now(),
        );
        check();
        if (
          Object.values(result).some(
            (value) => typeof value === "string" && value.includes(config.key),
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
            "Réponse OpenAI incompatible. Aucune adoption ; l’enveloppe reste réservée.",
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
