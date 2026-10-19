import { z } from "zod";
import { text, id, title, day } from "./validation";
import {
  resourceSchema,
  learningPathSchema,
  learningEntrySchema,
} from "./exploreSchema";
import { missionSchema, usageSchema } from "./assistants";
import {
  scheduleSchema,
  routineSchema,
  routineEntrySchema,
  goalSchema,
} from "./planningSchema";
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
const coreSchema = z
  .object({
    tasks: z.array(taskSchema).max(20000),
    projects: z.array(projectSchema).max(2000),
    notes: z.array(noteSchema).max(10000),
  })
  .strict();
const validateCore = (
  data: z.infer<typeof coreSchema>,
  context: z.RefinementCtx,
) => {
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
};
const legacySchema = coreSchema
  .extend({ version: z.literal(1) })
  .superRefine(validateCore);
const v2Base = coreSchema.extend({
  version: z.literal(2),
  missions: z.array(missionSchema).max(5000),
  usage: z.array(usageSchema).max(2),
});
const validateMissions = (
  data: z.infer<typeof v2Base>,
  context: z.RefinementCtx,
) => {
  validateCore(data, context);
  const ids = [
    ...data.tasks,
    ...data.projects,
    ...data.notes,
    ...data.missions,
    ...data.missions.flatMap((mission) => mission.reports),
  ].map((item) => item.id);
  if (new Set(ids).size !== ids.length)
    context.addIssue({
      code: "custom",
      message: "Identifiants de missions ou rapports dupliqués.",
    });
  const projects = new Set(data.projects.map((project) => project.id));
  if (
    data.missions.some(
      (mission) => mission.projectId && !projects.has(mission.projectId),
    )
  )
    context.addIssue({
      code: "custom",
      message: "Une mission référence un projet inexistant.",
    });
  if (
    new Set(data.usage.map((usage) => usage.assistant)).size !==
    data.usage.length
  )
    context.addIssue({
      code: "custom",
      message: "Compteur d’assistant dupliqué.",
    });
};
const v2Schema = v2Base.superRefine(validateMissions);
const v3Base = coreSchema.extend({
  missions: z.array(missionSchema).max(5000),
  usage: z.array(usageSchema).max(2),
  version: z.literal(3),
  routines: z.array(routineSchema).max(2000),
  routineEntries: z.array(routineEntrySchema).max(50000),
  goals: z.array(goalSchema).max(2000),
});
const validatePlanning = (
  data: z.infer<typeof v3Base>,
  context: z.RefinementCtx,
) => {
  validateMissions({ ...data, version: 2 }, context);
  const items = [
    ...data.tasks,
    ...data.projects,
    ...data.notes,
    ...data.missions,
    ...data.missions.flatMap((m) => m.reports),
    ...data.routines,
    ...data.routineEntries,
    ...data.goals,
  ];
  if (new Set(items.map((item) => item.id)).size !== items.length)
    context.addIssue({
      code: "custom",
      message: "Identifiants de planification dupliqués.",
    });
  const routines = new Map(
    data.routines.map((routine) => [routine.id, routine]),
  );
  const tasks = new Set(data.tasks.map((task) => task.id));
  const occurrences = new Set<string>();
  for (const entry of data.routineEntries) {
    const key = `${entry.routineId}/${entry.day}`;
    if (!routines.has(entry.routineId) || occurrences.has(key))
      context.addIssue({
        code: "custom",
        message: "Réalisation de routine orpheline ou dupliquée.",
      });
    occurrences.add(key);
  }
  if (
    data.goals.some((goal) => goal.taskIds.some((taskId) => !tasks.has(taskId)))
  )
    context.addIssue({
      code: "custom",
      message: "Un objectif référence une tâche inexistante.",
    });
};
const v3Schema = v3Base.superRefine(validatePlanning);
export const dataSchema = coreSchema
  .extend({
    ...v3Base.shape,
    version: z.literal(4),
    resources: z.array(resourceSchema).max(10000),
    learningPaths: z.array(learningPathSchema).max(2000),
    learningEntries: z.array(learningEntrySchema).max(20000),
  })
  .superRefine((data, context) => {
    validatePlanning({ ...data, version: 3 }, context);
    const items = [
      ...data.tasks,
      ...data.projects,
      ...data.notes,
      ...data.missions,
      ...data.missions.flatMap((item) => item.reports),
      ...data.routines,
      ...data.routineEntries,
      ...data.goals,
      ...data.resources,
      ...data.learningPaths,
      ...data.learningPaths.flatMap((path) => path.steps),
      ...data.learningEntries,
    ];
    if (new Set(items.map((item) => item.id)).size !== items.length)
      context.addIssue({
        code: "custom",
        message: "Identifiants Explorer dupliqués.",
      });
    const projects = new Set(data.projects.map((project) => project.id));
    const notes = new Set(data.notes.map((note) => note.id));
    const resources = new Set(data.resources.map((resource) => resource.id));
    if (
      data.resources.some(
        (resource) =>
          (resource.projectId && !projects.has(resource.projectId)) ||
          resource.noteIds.some((noteId) => !notes.has(noteId)),
      )
    )
      context.addIssue({
        code: "custom",
        message: "Une ressource référence un projet ou une idée inexistants.",
      });
    if (
      data.learningPaths.some(
        (path) =>
          (path.projectId && !projects.has(path.projectId)) ||
          path.steps.some(
            (step) => step.resourceId && !resources.has(step.resourceId),
          ),
      )
    )
      context.addIssue({
        code: "custom",
        message:
          "Un parcours référence un projet ou une ressource inexistants.",
      });
    const paths = new Map(
      data.learningPaths.map((path) => [
        path.id,
        new Set(path.steps.map((step) => step.id)),
      ]),
    );
    if (
      data.learningEntries.some(
        (entry) => entry.pathId && !paths.get(entry.pathId)?.has(entry.stepId),
      )
    )
      context.addIssue({
        code: "custom",
        message: "Une séance référence une étape inexistante.",
      });
  });
export const storedDataSchema = z
  .union([dataSchema, v3Schema, v2Schema, legacySchema])
  .transform((data) => {
    if (data.version === 4) return data;
    return {
      ...data,
      version: 4 as const,
      missions: data.version === 1 ? [] : data.missions,
      usage: data.version === 1 ? [] : data.usage,
      routines: data.version === 3 ? data.routines : [],
      routineEntries: data.version === 3 ? data.routineEntries : [],
      goals: data.version === 3 ? data.goals : [],
      resources: [],
      learningPaths: [],
      learningEntries: [],
    };
  });
export const backupSchema = z
  .object({
    application: z.literal("LifeOS"),
    exportedAt: z.string().datetime(),
    data: storedDataSchema,
  })
  .strict();
export type Task = z.infer<typeof taskSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Data = z.infer<typeof dataSchema>;
export const emptyData = (): Data => ({
  version: 4,
  resources: [],
  learningPaths: [],
  learningEntries: [],
  routines: [],
  routineEntries: [],
  goals: [],
  tasks: [],
  projects: [],
  notes: [],
  missions: [],
  usage: [],
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
      open.filter(
        (task) =>
          (task.due && task.due <= today) ||
          (task.schedule ? task.schedule.day <= today : !task.due),
      ),
    ).slice(0, 3),
    planned: sortedTasks(
      open.filter((task) => task.schedule?.day === today || task.due === today),
    ),
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
    resources: data.resources.map((resource) =>
      resource.projectId === projectId
        ? { ...resource, projectId: "" }
        : resource,
    ),
    learningPaths: data.learningPaths.map((path) =>
      path.projectId === projectId ? { ...path, projectId: "" } : path,
    ),
    tasks: data.tasks.map((task) =>
      task.projectId === projectId ? { ...task, projectId: "" } : task,
    ),
    missions: data.missions.map((mission) =>
      mission.projectId === projectId ? { ...mission, projectId: "" } : mission,
    ),
  };
}
export function serializeBackup(data: Data) {
  const raw = JSON.stringify(
    backupSchema.parse({
      application: "LifeOS",
      exportedAt: new Date().toISOString(),
      data,
    }),
    null,
    2,
  );
  if (new TextEncoder().encode(raw).length > 10 * 1024 * 1024)
    throw new Error(
      "La sauvegarde dépasse 10 Mo. Réduisez les données avant d’exporter ; le fichier ne serait pas restaurable.",
    );
  return raw;
}
export function parseBackup(raw: string): Data {
  if (new TextEncoder().encode(raw).length > 10 * 1024 * 1024)
    throw new Error("Sauvegarde trop volumineuse (10 Mo maximum).");
  return backupSchema.parse(JSON.parse(raw)).data;
}
