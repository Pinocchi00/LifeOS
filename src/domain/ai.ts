import { z } from "zod";
export const aiCatalog = {
  model: "gpt-5.6-terra",
  name: "GPT-5.6 Terra",
  provider: "OpenAI",
  checkedOn: "2026-10-19",
  validUntil: "2026-11-18",
  source: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
  privacySource: "https://developers.openai.com/api/docs/guides/your-data",
  inputUsdPerMillion: 2,
  outputUsdPerMillion: 12,
  cachedInputUsdPerMillion: 0.2,
  reserveNanoUsd: 100000000,
} as const;
export const aiInstructions =
  "Réponds en français. Aide à réfléchir à la mission et propose un brouillon utile, avec ses limites. Tu ne disposes d’aucun outil, accès aux fichiers ou moyen d’agir. Ne prétends jamais avoir modifié, vérifié ou exécuté quelque chose. Distingue les faits fournis des hypothèses et les propositions des résultats réellement observés. La validation reste humaine.";
export const aiInputSchema = z
  .object({
    text: z.string().trim().min(1).max(6000),
    maxOutputTokens: z.union([z.literal(256), z.literal(512), z.literal(1024)]),
  })
  .strict();
export type AiInput = z.infer<typeof aiInputSchema>;
export function aiPayload(input: AiInput) {
  const value = aiInputSchema.parse(input);
  return {
    model: aiCatalog.model,
    instructions: aiInstructions,
    input: value.text,
    max_output_tokens: value.maxOutputTokens,
    reasoning: { effort: "none" },
    store: false,
    stream: false,
    background: false,
    tools: [],
    tool_choice: "none",
    service_tier: "default",
    truncation: "disabled",
  };
}
export const aiBudgetSchema = z
  .object({
    day: z.string(),
    attempts: z.number().int().nonnegative(),
    reservedNanoUsd: z.number().int().nonnegative(),
    dailyNanoUsd: z.number().int().positive(),
    dailyCalls: z.number().int().positive(),
  })
  .strict();
export const aiStatusSchema = z
  .object({
    configured: z.boolean(),
    paired: z.boolean(),
    expiresAt: z.string().datetime().nullable(),
    budget: aiBudgetSchema.nullable(),
    catalogFresh: z.boolean(),
  })
  .strict();
export const aiQuoteSchema = z
  .object({
    id: z.string().regex(/^[a-f0-9]{32}$/),
    expiresAt: z.string().datetime(),
    payload: z.unknown(),
    budget: aiBudgetSchema,
  })
  .strict();
export const aiDraftSchema = z
  .object({
    responseId: z.string().regex(/^resp_[a-zA-Z0-9_-]{1,180}$/),
    model: z.string().min(1).max(120),
    receivedAt: z.string().datetime(),
    status: z.enum(["completed", "incomplete"]),
    text: z.string().min(1).max(8000),
    refusal: z.boolean(),
    inputTokens: z.number().int().nonnegative().max(20000),
    outputTokens: z.number().int().nonnegative().max(1024),
    estimatedNanoUsd: z.number().int().nonnegative(),
    reservedNanoUsd: z.literal(100000000),
  })
  .strict();
export type AiDraft = z.infer<typeof aiDraftSchema>;
export const usd = (nano: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  }).format(nano / 1e9);
