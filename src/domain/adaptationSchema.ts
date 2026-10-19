import { z } from "zod";
import { day, id, text, title } from "./validation";

export const ruleNames = {
  overdue: "Échéances dépassées",
  review: "Missions à vérifier",
  load: "Journée chargée",
  reserve: "Temps à réserver",
  learning: "Apprentissage à poursuivre",
  start: "Premier pas",
} as const;
export const ruleId = z.enum([
  "overdue",
  "review",
  "load",
  "reserve",
  "learning",
  "start",
]);
export const preferencesSchema = z
  .object({
    priorityCount: z.number().int().min(1).max(5),
    taskOrder: z.enum(["priority", "due"]),
    suggestions: z.boolean(),
    mutedRules: z
      .array(ruleId)
      .max(6)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences = (): Preferences => ({
  priorityCount: 3,
  taskOrder: "priority",
  suggestions: true,
  mutedRules: [],
});
export const samePreferences = (a: Preferences, b: Preferences) =>
  a.priorityCount === b.priorityCount &&
  a.taskOrder === b.taskOrder &&
  a.suggestions === b.suggestions &&
  a.mutedRules.length === b.mutedRules.length &&
  a.mutedRules.every((rule) => b.mutedRules.includes(rule));
const revisionSchema = z
  .object({
    id,
    createdAt: z.string().datetime(),
    reason: z.string().trim().min(1).max(1000),
    preferences: preferencesSchema,
    restoredFromId: id.or(z.literal("")),
  })
  .strict();
export const adviceSnapshotSchema = z
  .object({
    ruleId,
    ruleVersion: z.literal(1),
    day,
    title,
    body: text,
    reason: text,
    evidence: z.array(z.string().min(1).max(500)).min(1).max(10),
  })
  .strict();
const feedbackSchema = adviceSnapshotSchema.extend({
  id,
  choice: z.enum(["useful", "later"]),
  createdAt: z.string().datetime(),
  withdrawnAt: z.string().datetime().nullable(),
});
export const decisionSchema = z
  .object({
    id,
    title,
    choice: z.string().trim().min(1).max(10000),
    context: text,
    reason: text,
    reviewDay: day.or(z.literal("")),
    status: z.enum(["active", "reconsidered"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const adaptationSchema = z
  .object({
    preferences: preferencesSchema,
    activeRevisionId: id.or(z.literal("")),
    revisions: z.array(revisionSchema).max(500),
    feedback: z.array(feedbackSchema).max(5000),
    decisions: z.array(decisionSchema).max(2000),
  })
  .strict()
  .superRefine((value, context) => {
    const all = [...value.revisions, ...value.feedback, ...value.decisions];
    if (new Set(all.map((item) => item.id)).size !== all.length)
      context.addIssue({
        code: "custom",
        message: "Identifiants d’adaptation dupliqués.",
      });
    const previous = new Set<string>();
    for (const revision of value.revisions) {
      if (revision.restoredFromId && !previous.has(revision.restoredFromId))
        context.addIssue({
          code: "custom",
          message: "Version restaurée inconnue ou ultérieure.",
        });
      previous.add(revision.id);
    }
    const latest = value.revisions.at(-1);
    if (
      latest
        ? value.activeRevisionId !== latest.id ||
          !samePreferences(latest.preferences, value.preferences)
        : !!value.activeRevisionId ||
          !samePreferences(value.preferences, defaultPreferences())
    )
      context.addIssue({
        code: "custom",
        message: "Réglages et version active incohérents.",
      });
    const active = new Set<string>();
    for (const item of value.feedback) {
      const key = `${item.ruleId}/${item.day}`;
      if (!item.withdrawnAt && active.has(key))
        context.addIssue({
          code: "custom",
          message: "Retour actif dupliqué pour ce conseil et cette date.",
        });
      if (!item.withdrawnAt) active.add(key);
      if (item.withdrawnAt && item.withdrawnAt < item.createdAt)
        context.addIssue({
          code: "custom",
          message: "Date d’annulation antérieure au retour.",
        });
    }
  });
export type Adaptation = z.infer<typeof adaptationSchema>;
export type Decision = z.infer<typeof decisionSchema>;
export type AdviceSnapshot = z.infer<typeof adviceSnapshotSchema>;
export type Feedback = Adaptation["feedback"][number];
export type Revision = Adaptation["revisions"][number];
export const emptyAdaptation = (): Adaptation => ({
  preferences: defaultPreferences(),
  activeRevisionId: "",
  revisions: [],
  feedback: [],
  decisions: [],
});
