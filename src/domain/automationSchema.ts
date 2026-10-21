import { z } from "zod";
import { id, day } from "./validation";
import { taskSchema } from "./taskSchema";
import { scheduleSchema } from "./planningSchema";

export const automationMoveSchema = z
  .object({
    before: taskSchema.refine(
      (task) => task.status === "todo" && !!task.schedule,
    ),
    after: scheduleSchema,
  })
  .strict()
  .refine(
    (move) =>
      !!move.before.schedule &&
      move.before.schedule.day < move.after.day &&
      move.before.schedule.duration === move.after.duration,
    "Déplacement incohérent",
  );
export const automationRunSchema = z
  .object({
    id,
    kind: z.literal("reschedule-past"),
    targetDay: day,
    appliedAt: z.string().datetime(),
    undoneAt: z.string().datetime().nullable(),
    moves: z.array(automationMoveSchema).min(1).max(20),
  })
  .strict()
  .superRefine((run, context) => {
    const ids = run.moves.map((move) => move.before.id);
    const sorted = [...run.moves].sort((a, b) =>
      a.after.start.localeCompare(b.after.start),
    );
    if (
      new Set(ids).size !== ids.length ||
      run.moves.some((move) => move.after.day !== run.targetDay) ||
      (run.undoneAt && run.undoneAt < run.appliedAt) ||
      sorted.some((move, index) => {
        const next = sorted[index + 1];
        return (
          next &&
          Number(move.after.start.slice(0, 2)) * 60 +
            Number(move.after.start.slice(3)) +
            move.after.duration >
            Number(next.after.start.slice(0, 2)) * 60 +
              Number(next.after.start.slice(3))
        );
      })
    )
      context.addIssue({
        code: "custom",
        message: "Journal d’automatisation incohérent.",
      });
  });
export type AutomationMove = z.infer<typeof automationMoveSchema>;
export type AutomationRun = z.infer<typeof automationRunSchema>;
