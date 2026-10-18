import { z } from "zod";
import { day, id, text, title } from "./validation";
export const assistantNames = { chatgpt: "ChatGPT", claude: "Claude" };
export const missionStatusNames = {
  todo: "À faire",
  doing: "En cours",
  review: "À vérifier",
  done: "Terminé",
  blocked: "Bloqué",
};
export const assistantSchema = z.enum(["chatgpt", "claude"]);
const reportSchema = z
  .object({
    id,
    body: text.refine((value) => value.length > 0, "Le compte-rendu est vide."),
    evidence: text,
    createdAt: z.string().datetime(),
  })
  .strict();
export const missionSchema = z
  .object({
    id,
    title,
    assistant: assistantSchema,
    projectId: id.or(z.literal("")),
    objective: text.refine((value) => value.length > 0, "Précisez l’objectif."),
    criteria: text.refine(
      (value) => value.length > 0,
      "Précisez les critères de réussite.",
    ),
    files: text,
    due: day.or(z.literal("")),
    status: z.enum(["todo", "doing", "review", "done", "blocked"]),
    reports: z.array(reportSchema).max(200),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    validatedAt: z.string().datetime().nullable(),
  })
  .strict()
  .refine(
    (mission) =>
      mission.status === "done"
        ? mission.reports.length > 0 && mission.validatedAt !== null
        : mission.validatedAt === null,
    "Une mission terminée exige un compte-rendu et une validation explicite.",
  );
export const usageSchema = z
  .object({
    assistant: assistantSchema,
    label: title,
    used: z.number().int().min(0).max(1000000),
    limit: z.number().int().min(1).max(1000000).nullable(),
    resetAt: z.string().datetime().nullable(),
    note: text,
    updatedAt: z.string().datetime(),
  })
  .strict();
export type Assistant = z.infer<typeof assistantSchema>;
export type Mission = z.infer<typeof missionSchema>;
export type Usage = z.infer<typeof usageSchema>;
export function missionPrompt(mission: Mission, projectName?: string) {
  return [
    `MISSION — ${mission.title}`,
    `Assistant : ${assistantNames[mission.assistant]}`,
    `Projet : ${projectName || "Sans projet"}`,
    `Échéance : ${mission.due || "Non définie"}`,
    "",
    "OBJECTIF",
    mission.objective,
    "",
    "CRITÈRES DE RÉUSSITE",
    mission.criteria,
    "",
    "FICHIERS CONCERNÉS",
    mission.files || "Aucun fichier précisé ; demander le contexte nécessaire.",
    "",
    "COMPTE-RENDU ATTENDU",
    "Indiquer les changements effectués, les vérifications réellement exécutées, les preuves, les limites et les points nécessitant une validation.",
    "Ne pas inventer de résultat. Ne pas publier de données personnelles ni effectuer d’action irréversible sans autorisation.",
  ].join("\n");
}
export function safeEvidenceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
