import { z } from "zod";
import { localDay, sortedTasks, type Data, type Task } from "./model";
import { taskSchema } from "./taskSchema";
import { day, id } from "./validation";
import { clock, minutes } from "./planningSchema";
import { dayAppointments } from "./planning";
import { automationRunSchema, type AutomationMove } from "./automationSchema";

const requestSchema = z
  .object({
    taskIds: z
      .array(id)
      .min(1)
      .max(20)
      .refine((ids) => new Set(ids).size === ids.length),
    targetDay: day,
    start: clock,
    end: clock,
  })
  .strict()
  .refine((value) => minutes(value.end) > minutes(value.start));
type Request = z.infer<typeof requestSchema>;
export type AutomationPreview = {
  request: Request;
  preparedAt: string;
  moves: AutomationMove[];
  skipped: { id: string; title: string; reason: string }[];
};
export const pastTasks = (data: Data, today: string) =>
  sortedTasks(
    data.tasks.filter(
      (task) =>
        task.status === "todo" && task.schedule && task.schedule.day < today,
    ),
  );
const occupied = (data: Data, targetDay: string) =>
  dayAppointments(data, targetDay)
    .filter((item) => item.start)
    .map((item) => ({
      start: minutes(item.start),
      end: minutes(item.start) + item.duration,
    }));
const overlap = (
  start: number,
  end: number,
  slots: ReturnType<typeof occupied>,
) => slots.some((slot) => start < slot.end && end > slot.start);
const time = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const sameTask = (a: Task, b: Task) =>
  JSON.stringify(taskSchema.parse(a)) === JSON.stringify(taskSchema.parse(b));

export function prepareAutomation(
  data: Data,
  input: Request,
  now = new Date(),
): AutomationPreview {
  const request = requestSchema.parse(input);
  const today = localDay(now);
  if (request.targetDay < today)
    throw new Error("Choisissez aujourd’hui ou un jour à venir.");
  const eligible = new Map(
    pastTasks(data, today).map((task) => [task.id, task]),
  );
  if (request.taskIds.some((id) => !eligible.has(id)))
    throw new Error(
      "La sélection a changé. Choisissez à nouveau les tâches à déplacer.",
    );
  const slots = occupied(data, request.targetDay);
  const moves: AutomationMove[] = [];
  const skipped: AutomationPreview["skipped"] = [];
  // Five minutes for review; round up to the next five-minute boundary.
  const earliest =
    request.targetDay === today
      ? Math.ceil(
          (now.getHours() * 60 + now.getMinutes() + 5 + now.getSeconds() / 60) /
            5,
        ) * 5
      : 0;
  for (const task of sortedTasks(
    request.taskIds.map((id) => eligible.get(id)!),
  )) {
    const duration = task.schedule!.duration;
    let start = Math.max(minutes(request.start), earliest);
    // Sweep occupied intervals once rather than testing every five-minute slot.
    // Keep the same grid as the user's requested starting time.
    for (const slot of [...slots].sort((a, b) => a.start - b.start)) {
      if (start + duration <= slot.start) break;
      if (start < slot.end) start += Math.ceil((slot.end - start) / 5) * 5;
    }
    if (start + duration > minutes(request.end)) {
      skipped.push({
        id: task.id,
        title: task.title,
        reason: "Aucun créneau assez long dans cette plage.",
      });
      continue;
    }
    slots.push({ start, end: start + duration });
    moves.push({
      before: structuredClone(task),
      after: { day: request.targetDay, start: time(start), duration },
    });
  }
  return {
    request: structuredClone(request),
    preparedAt: now.toISOString(),
    moves,
    skipped,
  };
}

export function applyAutomation(
  data: Data,
  preview: AutomationPreview,
  now = new Date(),
): Data {
  const request = requestSchema.parse(preview.request);
  const age = now.getTime() - Date.parse(preview.preparedAt);
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    age > 10 * 60_000 ||
    request.targetDay < localDay(now)
  )
    throw new Error("L’aperçu a expiré. Préparez un nouvel aperçu.");
  if (data.automationRuns.length >= 100)
    throw new Error(
      "Le journal contient 100 opérations. Exportez-le puis effacez-le pour continuer.",
    );
  const run = automationRunSchema.parse({
    id: crypto.randomUUID(),
    kind: "reschedule-past",
    targetDay: request.targetDay,
    appliedAt: now.toISOString(),
    undoneAt: null,
    moves: preview.moves,
  });
  const slots = occupied(data, request.targetDay);
  for (const move of run.moves) {
    const current = data.tasks.find((task) => task.id === move.before.id);
    const start = minutes(move.after.start);
    if (
      !request.taskIds.includes(move.before.id) ||
      !current ||
      !sameTask(current, move.before) ||
      move.before.schedule!.day >= localDay(now) ||
      start < minutes(request.start) ||
      start + move.after.duration > minutes(request.end) ||
      (request.targetDay === localDay(now) &&
        start * 60 <=
          now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) ||
      overlap(start, start + move.after.duration, slots)
    )
      throw new Error(
        "Les tâches ou les créneaux ont changé. Préparez un nouvel aperçu ; rien n’a été déplacé.",
      );
    slots.push({ start, end: start + move.after.duration });
  }
  const byId = new Map(run.moves.map((move) => [move.before.id, move.after]));
  return {
    ...data,
    tasks: data.tasks.map((task) =>
      byId.has(task.id) ? { ...task, schedule: byId.get(task.id)! } : task,
    ),
    automationRuns: [...data.automationRuns, run],
  };
}

export function undoAutomation(
  data: Data,
  runId: string,
  now = new Date(),
): Data {
  const run = data.automationRuns.find((item) => item.id === runId);
  if (!run || run.undoneAt)
    throw new Error("Cette opération a déjà été annulée ou n’existe plus.");
  for (const move of run.moves) {
    const current = data.tasks.find((task) => task.id === move.before.id);
    if (
      !current ||
      !sameTask(current, { ...move.before, schedule: move.after })
    )
      throw new Error(
        "Une tâche a été modifiée ou supprimée depuis. Le retour groupé est bloqué pour conserver vos changements.",
      );
    const start = minutes(move.before.schedule!.start);
    if (
      overlap(
        start,
        start + move.before.schedule!.duration,
        occupied(data, move.before.schedule!.day),
      )
    )
      throw new Error(
        "Un ancien créneau est maintenant occupé. Le retour groupé est bloqué ; ajustez la tâche dans l’agenda.",
      );
  }
  const byId = new Map(
    run.moves.map((move) => [move.before.id, move.before.schedule!]),
  );
  return {
    ...data,
    tasks: data.tasks.map((task) =>
      byId.has(task.id) ? { ...task, schedule: byId.get(task.id)! } : task,
    ),
    automationRuns: data.automationRuns.map((item) =>
      item.id === run.id ? { ...item, undoneAt: now.toISOString() } : item,
    ),
  };
}
