import { z } from "zod";

const text = z.string().trim().max(10000);
const id = z.string().min(1).max(100);
const title = z.string().trim().min(1, "Un titre est nécessaire.").max(180);
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T12:00:00Z");
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date invalide");
export const taskSchema = z
  .object({
    id,
    title,
    description: text,
    status: z.enum(["todo", "done"]),
    priority: z.enum(["high", "medium", "low"]),
    due: day.or(z.literal("")),
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
export const projectSchema = z
  .object({
    id,
    name: title,
    description: text,
    color: z.enum(["sage", "amber", "blue", "rose", "violet"]),
    status: z.enum(["active", "paused", "done"]),
    createdAt: z.string().datetime(),
  })
  .strict();
export const noteSchema = z
  .object({ id, title, body: text, createdAt: z.string().datetime() })
  .strict();
export const dataSchema = z
  .object({
    version: z.literal(1),
    tasks: z.array(taskSchema).max(20000),
    projects: z.array(projectSchema).max(2000),
    notes: z.array(noteSchema).max(10000),
  })
  .strict()
  .superRefine((data, context) => {
    const ids = [...data.tasks, ...data.projects, ...data.notes].map(
      (item) => item.id,
    );
    if (new Set(ids).size !== ids.length)
      context.addIssue({ code: "custom", message: "Identifiants dupliqués." });
    const projects = new Set(data.projects.map((project) => project.id));
    if (
      data.tasks.some((task) => task.projectId && !projects.has(task.projectId))
    ) {
      context.addIssue({
        code: "custom",
        message: "Une tâche référence un projet inexistant.",
      });
    }
  });
export const backupSchema = z
  .object({
    application: z.literal("LifeOS"),
    exportedAt: z.string().datetime(),
    data: dataSchema,
  })
  .strict();
export type Task = z.infer<typeof taskSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Data = z.infer<typeof dataSchema>;
export const emptyData = (): Data => ({
  version: 1,
  tasks: [],
  projects: [],
  notes: [],
});
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const priorityNames = { high: "Haute", medium: "Normale", low: "Basse" };
export function sortedTasks(tasks: Task[]) {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort(
    (a, b) =>
      rank[a.priority] - rank[b.priority] ||
      (a.due || "9999").localeCompare(b.due || "9999") ||
      a.createdAt.localeCompare(b.createdAt),
  );
}
export function briefing(data: Data, today: string) {
  const open = data.tasks.filter((task) => task.status === "todo");
  const overdue = open.filter((task) => task.due && task.due < today);
  return {
    priorities: sortedTasks(
      open.filter((task) => !task.due || task.due <= today),
    ).slice(0, 3),
    planned: sortedTasks(open.filter((task) => task.due === today)),
    completed: data.tasks.filter(
      (task) =>
        task.completedAt && localDay(new Date(task.completedAt)) === today,
    ),
    overdue,
    recommendation: overdue.length
      ? `${overdue.length} tâche${overdue.length > 1 ? "s ont dépassé leur" : " a dépassé son"} échéance. Replanifiez ce qui compte pour alléger votre journée.`
      : open.length > 0
        ? "Choisissez une première tâche et réservez-lui un moment sans interruption."
        : "Votre journée est ouverte. Capturez une idée ou choisissez votre prochaine priorité.",
    reason: overdue.length
      ? "Règle locale : échéance passée et tâche non terminée."
      : "Règle locale : calcul à partir de vos tâches ouvertes.",
  };
}
export function removeProject(data: Data, projectId: string): Data {
  return {
    ...data,
    projects: data.projects.filter((project) => project.id !== projectId),
    tasks: data.tasks.map((task) =>
      task.projectId === projectId ? { ...task, projectId: "" } : task,
    ),
  };
}
export function serializeBackup(data: Data) {
  return JSON.stringify(
    backupSchema.parse({
      application: "LifeOS",
      exportedAt: new Date().toISOString(),
      data,
    }),
    null,
    2,
  );
}
export function parseBackup(raw: string): Data {
  if (new TextEncoder().encode(raw).length > 10 * 1024 * 1024)
    throw new Error("Sauvegarde trop volumineuse (10 Mo maximum).");
  return backupSchema.parse(JSON.parse(raw)).data;
}
