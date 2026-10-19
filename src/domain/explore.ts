import type { Data } from "./model";
import {
  type LearningPath,
  type Resource,
  learningEntrySchema,
} from "./exploreSchema";
export const normalizeSearch = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr").trim();
export function resourceText(resource: Resource) {
  return [
    resource.title,
    resource.source,
    resource.url,
    resource.reference,
    resource.summary,
    ...resource.tags,
  ].join(" ");
}
export function canonicalSource(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}
export function duplicateResource(
  resources: Resource[],
  url: string,
  except?: string,
) {
  const canonical = canonicalSource(url);
  return canonical
    ? resources.find(
        (resource) =>
          resource.id !== except && canonicalSource(resource.url) === canonical,
      )
    : undefined;
}
export function pathProgress(path: LearningPath) {
  const done = path.steps.filter((step) => step.completedAt !== null).length;
  return {
    done,
    total: path.steps.length,
    percent: Math.round((done / path.steps.length) * 100),
  };
}
export function saveLearningPath(data: Data, path: LearningPath): Data {
  const steps = new Set(path.steps.map((step) => step.id));
  return {
    ...data,
    learningPaths: [
      ...data.learningPaths.filter((item) => item.id !== path.id),
      path,
    ],
    learningEntries: data.learningEntries.map((entry) =>
      entry.pathId === path.id && !steps.has(entry.stepId)
        ? { ...entry, pathId: "", stepId: "" }
        : entry,
    ),
  };
}
export function removeLearningPath(data: Data, id: string): Data {
  return {
    ...data,
    learningPaths: data.learningPaths.filter((path) => path.id !== id),
    learningEntries: data.learningEntries.map((entry) =>
      entry.pathId === id ? { ...entry, pathId: "", stepId: "" } : entry,
    ),
  };
}
export function removeResource(data: Data, id: string): Data {
  return {
    ...data,
    resources: data.resources.filter((resource) => resource.id !== id),
    learningPaths: data.learningPaths.map((path) => ({
      ...path,
      steps: path.steps.map((step) =>
        step.resourceId === id ? { ...step, resourceId: "" } : step,
      ),
    })),
  };
}
export function removeNote(data: Data, id: string): Data {
  return {
    ...data,
    notes: data.notes.filter((note) => note.id !== id),
    resources: data.resources.map((resource) => ({
      ...resource,
      noteIds: resource.noteIds.filter((noteId) => noteId !== id),
    })),
  };
}
export function toggleLearningStep(
  data: Data,
  pathId: string,
  stepId: string,
): Data {
  return {
    ...data,
    learningPaths: data.learningPaths.map((path) =>
      path.id === pathId
        ? {
            ...path,
            steps: path.steps.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    completedAt: step.completedAt
                      ? null
                      : new Date().toISOString(),
                  }
                : step,
            ),
          }
        : path,
    ),
  };
}
export function makeLearningEntry(
  path: LearningPath,
  stepId: string,
  day: string,
  minutes: number,
  notes: string,
  today: string,
) {
  if (day > today)
    throw new Error(
      "Une séance future ne peut pas être enregistrée comme réalisée.",
    );
  const step = path.steps.find((step) => step.id === stepId);
  if (!step) throw new Error("Choisissez une étape existante.");
  return learningEntrySchema.parse({
    id: crypto.randomUUID(),
    pathId: path.id,
    stepId,
    pathTitle: path.title,
    stepTitle: step.title,
    day,
    minutes,
    notes,
    createdAt: new Date().toISOString(),
  });
}
export function ideaFromResource(resource: Resource) {
  return {
    title: `Une idée autour de ${resource.title}`.slice(0, 180),
    body: [
      `Source : ${resource.source}`,
      resource.url || resource.reference,
      "",
      resource.summary,
    ]
      .join("\n")
      .slice(0, 10000),
  };
}
