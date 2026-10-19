import { z } from "zod";
import { day, id, text, title } from "./validation";
export const sourceUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !!url.hostname &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Utilisez un lien http:// ou https:// sans identifiants.");
export const resourceKinds = {
  article: "Article",
  video: "Vidéo",
  book: "Livre",
  course: "Cours",
  paper: "Publication",
  tool: "Outil",
  news: "Actualité",
};
export const resourceStatuses = {
  saved: "À découvrir",
  active: "En cours",
  done: "Consultée",
};
export const resourceSchema = z
  .object({
    id,
    title,
    kind: z.enum([
      "article",
      "video",
      "book",
      "course",
      "paper",
      "tool",
      "news",
    ]),
    source: title,
    url: sourceUrl.or(z.literal("")),
    reference: text,
    publishedOn: day.or(z.literal("")),
    consultedOn: day.or(z.literal("")),
    summary: text,
    tags: z
      .array(z.string().trim().min(1).max(32))
      .max(10)
      .refine(
        (tags) =>
          new Set(tags.map((tag) => tag.toLocaleLowerCase("fr"))).size ===
          tags.length,
      ),
    status: z.enum(["saved", "active", "done"]),
    completedAt: z.string().datetime().nullable(),
    favorite: z.boolean(),
    projectId: id.or(z.literal("")),
    noteIds: z
      .array(id)
      .max(10000)
      .refine((ids) => new Set(ids).size === ids.length),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (value) => !!value.url || !!value.reference,
    "Ajoutez un lien ou une référence pour retrouver la source.",
  )
  .refine(
    (value) => value.kind !== "news" || !!value.publishedOn,
    "Une actualité exige une date de publication déclarée.",
  )
  .refine(
    (value) =>
      value.status === "done"
        ? value.completedAt !== null
        : value.completedAt === null,
    "Statut et date de consultation incohérents.",
  );
export const learningStepSchema = z
  .object({
    id,
    title,
    resourceId: id.or(z.literal("")),
    completedAt: z.string().datetime().nullable(),
  })
  .strict();
export const learningPathSchema = z
  .object({
    id,
    title,
    intention: text,
    projectId: id.or(z.literal("")),
    targetDay: day.or(z.literal("")),
    paused: z.boolean(),
    steps: z.array(learningStepSchema).min(1).max(200),
    createdAt: z.string().datetime(),
  })
  .strict();
export const learningEntrySchema = z
  .object({
    id,
    pathId: id.or(z.literal("")),
    stepId: id.or(z.literal("")),
    pathTitle: title,
    stepTitle: title,
    day,
    minutes: z.number().int().min(1).max(720),
    notes: text,
    createdAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (value) => !!value.pathId === !!value.stepId,
    "La séance doit référencer une étape et son parcours, ou garder uniquement son historique.",
  );
export type Resource = z.infer<typeof resourceSchema>;
export type LearningPath = z.infer<typeof learningPathSchema>;
export type LearningEntry = z.infer<typeof learningEntrySchema>;
