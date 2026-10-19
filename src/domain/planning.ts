import { type Data, type Task, localDay } from "./model";
import { type Goal, type Routine, minutes } from "./planningSchema";

// Calendar arithmetic uses local noon, so crossing DST does not skip a day.
export function addDays(day: string, amount: number) {
  const date = new Date(day + "T12:00:00");
  date.setDate(date.getDate() + amount);
  return localDay(date);
}
export function weekDays(day: string) {
  const offset = (new Date(day + "T12:00:00").getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => addDays(day, index - offset));
}
export function routineOccurs(routine: Routine, day: string) {
  return (
    !routine.paused &&
    day >= routine.startDate &&
    (!routine.endDate || day <= routine.endDate) &&
    routine.weekdays.includes(
      ((new Date(day + "T12:00:00").getDay() + 6) % 7) + 1,
    )
  );
}
export function goalProgress(goal: Goal, tasks: Task[]) {
  const linked = new Set(goal.taskIds);
  const selected = tasks.filter((task) => linked.has(task.id));
  const done = selected.filter((task) => task.status === "done").length;
  return {
    done,
    total: selected.length,
    percent: selected.length ? Math.round((done / selected.length) * 100) : 0,
  };
}
export type Appointment = {
  key: string;
  kind: "task" | "routine";
  id: string;
  title: string;
  start: string;
  duration: number;
  done: boolean;
};
export function dayAppointments(data: Data, day: string): Appointment[] {
  const entries = new Map(
    data.routineEntries
      .filter((entry) => entry.day === day)
      .map((entry) => [entry.routineId, entry]),
  );
  return [
    ...data.tasks
      .filter((task) => task.schedule?.day === day)
      .map((task) => ({
        key: `task/${task.id}`,
        kind: "task" as const,
        id: task.id,
        title: task.title,
        start: task.schedule!.start,
        duration: task.schedule!.duration,
        done: task.status === "done",
      })),
    ...data.routines
      .filter(
        (routine) => routineOccurs(routine, day) || entries.has(routine.id),
      )
      .map((routine) => {
        const entry = entries.get(routine.id);
        return {
          key: `routine/${routine.id}`,
          kind: "routine" as const,
          id: routine.id,
          title: routine.title,
          start: entry?.time ?? routine.time,
          duration: entry?.duration ?? routine.duration,
          done: !!entry,
          ...(entry ? { title: entry.title } : {}),
        };
      }),
  ].sort(
    (a, b) =>
      (a.start || "99:99").localeCompare(b.start || "99:99") ||
      a.title.localeCompare(b.title, "fr"),
  );
}
export function conflicts(items: Appointment[]) {
  const overlapping = new Set<string>();
  const timed = items
    .filter((item) => item.start && !item.done)
    .sort((a, b) => a.start.localeCompare(b.start));
  let furthest: Appointment | undefined;
  let end = -1;
  for (const item of timed) {
    const start = minutes(item.start);
    if (furthest && start < end) {
      overlapping.add(furthest.key);
      overlapping.add(item.key);
    }
    if (start + item.duration > end) {
      furthest = item;
      end = start + item.duration;
    }
  }
  return overlapping;
}
export function endTime(start: string, duration: number) {
  const value = minutes(start) + duration;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function plannedMinutes(items: Appointment[]) {
  const intervals = items
    .filter((item) => item.start && !item.done)
    .map((item) => [minutes(item.start), minutes(item.start) + item.duration])
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    end = -1;
  for (const [start, finish] of intervals) {
    total += Math.max(0, finish - Math.max(start, end));
    end = Math.max(end, finish);
  }
  return total;
}
export function removeTask(data: Data, id: string): Data {
  return {
    ...data,
    tasks: data.tasks.filter((task) => task.id !== id),
    goals: data.goals.map((goal) => ({
      ...goal,
      taskIds: goal.taskIds.filter((taskId) => taskId !== id),
    })),
  };
}
export function setRoutineDone(
  data: Data,
  routineId: string,
  day: string,
  today: string,
): Data {
  if (day > today)
    throw new Error("Une routine future ne peut pas être réalisée.");
  const existing = data.routineEntries.find(
    (entry) => entry.routineId === routineId && entry.day === day,
  );
  const routine = data.routines.find((item) => item.id === routineId);
  if (!routine || (!existing && !routineOccurs(routine, day)))
    throw new Error("Routine non prévue ce jour.");
  return {
    ...data,
    routineEntries: existing
      ? data.routineEntries.filter((entry) => entry.id !== existing.id)
      : [
          ...data.routineEntries,
          {
            id: crypto.randomUUID(),
            routineId,
            day,
            title: routine.title,
            time: routine.time,
            duration: routine.duration,
            completedAt: new Date().toISOString(),
          },
        ],
  };
}
