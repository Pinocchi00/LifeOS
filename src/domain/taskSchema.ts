import { z } from "zod";
import { text, id, title, day } from "./validation";
import { scheduleSchema } from "./planningSchema";
export const taskSchema = z
  .object({
    id,
    title,
    description: text,
    status: z.enum(["todo", "done"]),
    priority: z.enum(["high", "medium", "low"]),
    due: day.or(z.literal("")),
    schedule: scheduleSchema.optional(),
    projectId: id.or(z.literal("")),
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
  })
  .strict()
  .refine(
    (task) =>
      task.status === "done"
        ? task.completedAt !== null
        : task.completedAt === null,
    "Statut et date de réalisation incohérents",
  );
