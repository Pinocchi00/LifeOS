import { findAiModel, aiDraftSchema, type AiDraft, usd } from "./ai";
import { missionSchema } from "./assistants";
import type { Data } from "./model";
export function missionAiText(mission: Data["missions"][number]) {
  return `MISSION — ${mission.title}\n\nOBJECTIF\n${mission.objective}\n\nCRITÈRES\n${mission.criteria}\n\nPropose une analyse et des prochaines étapes. Aucun fichier n’est joint ; ne prétends pas avoir agi ou vérifié ces critères.`;
}
export function adoptAiDraft(
  data: Data,
  missionId: string,
  value: AiDraft,
): Data {
  const draft = aiDraftSchema.parse(value);
  const mission = data.missions.find((item) => item.id === missionId);
  const model = findAiModel(draft.model);
  if (
    !mission ||
    !model ||
    mission.assistant !== model.assistant ||
    !draft.responseId.startsWith(model.provider === "OpenAI" ? "resp_" : "msg_")
  )
    throw new Error(
      "Mission absente ou fournisseur du brouillon incompatible.",
    );
  if (mission.reports.some((report) => report.body.includes(draft.responseId)))
    throw new Error("Ce brouillon est déjà conservé dans la mission.");
  if (mission.reports.length >= 200)
    throw new Error("Limite de comptes-rendus atteinte.");
  const body = `BROUILLON IA — NON VÉRIFIÉ\n${model.provider} · ${draft.model} · ${draft.responseId}\nReçu : ${draft.receivedAt}\n${draft.status === "incomplete" ? "RÉPONSE INCOMPLÈTE\n" : ""}${draft.refusal ? "REFUS DU MODÈLE\n" : ""}Jetons déclarés : ${draft.inputTokens} entrée, ${draft.outputTokens} sortie.\nEstimation de précaution : ${usd(draft.estimatedNanoUsd)} ; enveloppe serveur conservée : ${usd(draft.reservedNanoUsd)}.\n\n${draft.text}`;
  const updated = missionSchema.parse({
    ...mission,
    updatedAt: new Date().toISOString(),
    reports: [
      ...mission.reports,
      {
        id: crypto.randomUUID(),
        body,
        evidence: model.source,
        createdAt: draft.receivedAt,
      },
    ],
  });
  return {
    ...data,
    missions: data.missions.map((item) =>
      item.id === missionId ? updated : item,
    ),
  };
}
