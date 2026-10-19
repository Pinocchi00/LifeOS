import {
  aiStatusSchema,
  aiQuoteSchema,
  aiDraftSchema,
  aiPayload,
  type AiInput,
  type AiModelId,
  findAiModel,
} from "../domain/ai";
import { connectorRequest } from "./connector";
export const readAiStatus = async (signal?: AbortSignal) =>
  aiStatusSchema.parse(await connectorRequest("ai/status", undefined, signal));
export const prepareAi = async (input: AiInput, signal?: AbortSignal) => {
  const quote = aiQuoteSchema.parse(
    await connectorRequest("ai/prepare", input, signal),
  );
  if (JSON.stringify(quote.payload) !== JSON.stringify(aiPayload(input)))
    throw new Error(
      "L’aperçu du serveur diffère de la demande. Aucun envoi autorisé.",
    );
  return quote;
};
export const executeAi = async (
  quoteId: string,
  signal?: AbortSignal,
  model?: AiModelId,
) => {
  const draft = aiDraftSchema.parse(
    await connectorRequest(
      "ai/execute",
      { quoteId, confirmed: true },
      signal,
      65000,
    ),
  );
  if (model && findAiModel(draft.model)?.model !== model)
    throw new Error(
      "Le modèle reçu diffère de l’aperçu autorisé. Aucune adoption.",
    );
  return draft;
};
