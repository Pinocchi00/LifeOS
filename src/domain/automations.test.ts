import { describe, expect, it } from "vitest";
import {
  applyAutomation,
  pastTasks,
  prepareAutomation,
  undoAutomation,
} from "./automations";
import {
  dataSchema,
  emptyData,
  parseBackup,
  serializeBackup,
  storedDataSchema,
  type Data,
  type Task,
} from "./model";
const now = new Date(2026, 9, 21, 12, 0, 30);
const task = (patch: Partial<Task> = {}): Task => ({
  id: "past",
  title: "Reprendre le dossier",
  description: "Contexte conservé",
  status: "todo",
  priority: "high",
  due: "2026-10-20",
  projectId: "",
  createdAt: "2026-10-19T08:00:00.000Z",
  completedAt: null,
  schedule: { day: "2026-10-20", start: "09:00", duration: 30 },
  ...patch,
});
const initial = (): Data => ({ ...emptyData(), tasks: [task()] });
const input = {
  taskIds: ["past"],
  targetDay: "2026-10-22",
  start: "09:00",
  end: "18:00",
};
describe("Automatisations locales relues", () => {
  it("cherche sur la grille choisie après des intervalles imbriqués et accepte une fin contiguë", () => {
    const data = initial();
    data.tasks.push(
      task({
        id: "short",
        schedule: { day: input.targetDay, start: "09:01", duration: 6 },
      }),
      task({
        id: "long",
        schedule: { day: input.targetDay, start: "09:05", duration: 20 },
      }),
    );
    const preview = prepareAutomation(
      data,
      { ...input, start: "09:02", end: "09:57" },
      now,
    );
    expect(preview.moves[0].after.start).toBe("09:27");
    expect(applyAutomation(data, preview, now).tasks[0].schedule!.start).toBe(
      "09:27",
    );
  });
  it("conserve un résultat cohérent avec vingt mille créneaux superposés", () => {
    const data = initial();
    data.tasks.push(
      ...Array.from({ length: 19_999 }, (_, index) =>
        task({
          id: `reserved-${index}`,
          schedule: { day: input.targetDay, start: "09:00", duration: 480 },
        }),
      ),
    );
    expect(prepareAutomation(data, input, now).moves[0].after.start).toBe(
      "17:00",
    );
  });
  it("sélectionne uniquement les tâches ouvertes avec un créneau d’un jour passé", () => {
    const data = {
      ...initial(),
      tasks: [
        task(),
        task({ id: "done", status: "done", completedAt: now.toISOString() }),
        task({ id: "unscheduled", schedule: undefined }),
        task({
          id: "today",
          schedule: { day: "2026-10-21", start: "08:00", duration: 30 },
        }),
        task({
          id: "future",
          schedule: { day: "2026-10-22", start: "10:00", duration: 30 },
        }),
      ],
    };
    expect(pastTasks(data, "2026-10-21").map((item) => item.id)).toEqual([
      "past",
    ]);
  });
  it("ne modifie rien à la préparation, respecte les priorités et les durées", () => {
    const data = {
      ...initial(),
      tasks: [
        task({ priority: "low" }),
        task({
          id: "high",
          schedule: { day: "2026-10-20", start: "10:00", duration: 45 },
        }),
      ],
    };
    const before = structuredClone(data);
    const preview = prepareAutomation(
      data,
      { ...input, taskIds: ["past", "high"] },
      now,
    );
    expect(
      preview.moves.map((move) => [
        move.before.id,
        move.after.start,
        move.after.duration,
      ]),
    ).toEqual([
      ["high", "09:00", 45],
      ["past", "09:45", 30],
    ]);
    expect(data).toEqual(before);
    const applied = applyAutomation(data, preview, now);
    expect(applied.tasks[0].due).toBe(data.tasks[0].due);
    expect(applied.tasks[0].description).toBe(data.tasks[0].description);
    expect(applied.automationRuns).toHaveLength(1);
    expect(dataSchema.safeParse(applied).success).toBe(true);
  });
  it("évite tâches et routines, y compris les créneaux déjà réalisés", () => {
    const data = initial();
    data.tasks.push(
      task({
        id: "reserved",
        status: "done",
        completedAt: now.toISOString(),
        schedule: { day: input.targetDay, start: "09:00", duration: 30 },
      }),
    );
    data.routines.push({
      id: "routine",
      title: "Lecture",
      description: "",
      weekdays: [4],
      startDate: "2026-10-01",
      endDate: "",
      time: "09:30",
      duration: 30,
      paused: false,
      createdAt: now.toISOString(),
    });
    expect(prepareAutomation(data, input, now).moves[0].after.start).toBe(
      "10:00",
    );
  });
  it("explique les tâches laissées en place sans appliquer de lot vide", () => {
    const data = initial();
    const preview = prepareAutomation(data, { ...input, end: "09:15" }, now);
    expect(preview.moves).toEqual([]);
    expect(preview.skipped[0].id).toBe("past");
    expect(() => applyAutomation(data, preview, now)).toThrow();
    expect(data).toEqual(initial());
  });
  it("ne remplit pas aujourd’hui dans le passé et garde un temps de relecture", () => {
    const preview = prepareAutomation(
      initial(),
      { ...input, targetDay: "2026-10-21" },
      now,
    );
    expect(preview.moves[0].after.start).toBe("12:10");
    expect(() =>
      applyAutomation(initial(), preview, new Date(2026, 9, 21, 12, 10, 1)),
    ).toThrow(/changé/);
  });
  it.each([
    { ...input, taskIds: [] },
    { ...input, taskIds: ["past", "past"] },
    { ...input, taskIds: ["absent"] },
    { ...input, targetDay: "2026-10-20" },
    { ...input, start: "18:00", end: "09:00" },
    { ...input, targetDay: "2026-02-30" },
  ])("refuse une sélection ou une plage invalide : %j", (request) => {
    expect(() => prepareAutomation(initial(), request, now)).toThrow();
  });
  it("refuse une tâche éditée après l’aperçu et ne déplace aucune autre tâche", () => {
    const data = initial();
    data.tasks.push(task({ id: "second" }));
    const preview = prepareAutomation(
      data,
      { ...input, taskIds: ["past", "second"] },
      now,
    );
    data.tasks[1].description = "Nouvelle consigne";
    const before = structuredClone(data);
    expect(() => applyAutomation(data, preview, now)).toThrow(/changé/);
    expect(data).toEqual(before);
  });
  it("refuse un nouveau conflit, une suppression ou une réalisation après l’aperçu", () => {
    for (const edit of [
      (data: Data) => {
        data.tasks.push(
          task({
            id: "conflict",
            schedule: { day: input.targetDay, start: "09:15", duration: 20 },
          }),
        );
      },
      (data: Data) => {
        data.tasks = [];
      },
      (data: Data) => {
        data.tasks[0] = {
          ...data.tasks[0],
          status: "done",
          completedAt: now.toISOString(),
        };
      },
    ]) {
      const data = initial();
      const preview = prepareAutomation(data, input, now);
      edit(data);
      expect(() => applyAutomation(data, preview, now)).toThrow(/changé/);
    }
  });
  it("refuse un aperçu expiré ou réutilisé", () => {
    const data = initial();
    const preview = prepareAutomation(data, input, now);
    expect(() =>
      applyAutomation(data, preview, new Date(now.getTime() + 600_001)),
    ).toThrow(/expiré/);
    expect(() =>
      applyAutomation(data, preview, new Date(now.getTime() - 1)),
    ).toThrow(/expiré/);
    const applied = applyAutomation(data, preview, now);
    expect(() => applyAutomation(applied, preview, now)).toThrow(/changé/);
  });
  it("rétablit le lot entier une seule fois et conserve les deux dates dans le journal", () => {
    const data = initial();
    const applied = applyAutomation(
      data,
      prepareAutomation(data, input, now),
      now,
    );
    const undo = undoAutomation(applied, applied.automationRuns[0].id, now);
    expect(undo.tasks).toEqual(data.tasks);
    expect(undo.automationRuns[0].undoneAt).toBe(now.toISOString());
    expect(parseBackup(serializeBackup(undo))).toEqual(undo);
    expect(() => undoAutomation(undo, undo.automationRuns[0].id, now)).toThrow(
      /déjà/,
    );
  });
  it("bloque le retour si une tâche change, disparaît ou si l’ancien créneau est occupé", () => {
    for (const edit of [
      (data: Data) => {
        data.tasks[0].title = "Retitrée";
      },
      (data: Data) => {
        data.tasks = [];
      },
      (data: Data) => {
        data.tasks.push(task({ id: "new" }));
      },
    ]) {
      const data = initial();
      const applied = applyAutomation(
        data,
        prepareAutomation(data, input, now),
        now,
      );
      edit(applied);
      const before = structuredClone(applied);
      expect(() =>
        undoAutomation(applied, applied.automationRuns[0].id, now),
      ).toThrow(/bloqué/);
      expect(applied).toEqual(before);
    }
  });
  it("borne le journal sans effacer les anciennes opérations", () => {
    const data = initial();
    const applied = applyAutomation(
      data,
      prepareAutomation(data, input, now),
      now,
    );
    data.automationRuns = Array.from({ length: 100 }, (_, index) => ({
      ...applied.automationRuns[0],
      id: `run-${index}`,
    }));
    expect(() =>
      applyAutomation(data, prepareAutomation(data, input, now), now),
    ).toThrow(/100 opérations/);
    expect(data.automationRuns).toHaveLength(100);
  });
  it("migre v6 sans perdre les données et conserve les journaux indépendants des tâches supprimées", () => {
    const data = initial();
    const { automationRuns: _runs, ...v6 } = data;
    expect(storedDataSchema.parse({ ...v6, version: 6 })).toEqual(data);
    const applied = applyAutomation(
      data,
      prepareAutomation(data, input, now),
      now,
    );
    expect(dataSchema.safeParse({ ...applied, tasks: [] }).success).toBe(true);
    expect(
      dataSchema.safeParse({
        ...applied,
        automationRuns: [...applied.automationRuns, applied.automationRuns[0]],
      }).success,
    ).toBe(false);
    const invalid = structuredClone(applied);
    invalid.automationRuns[0].moves[0].after.duration++;
    expect(dataSchema.safeParse(invalid).success).toBe(false);
  });
});
