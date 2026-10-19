import { describe, expect, it } from "vitest";
import {
  briefing,
  emptyData,
  localDay,
  parseBackup,
  removeProject,
  serializeBackup,
  sortedTasks,
  type Task,
} from "./model";
const task = (override: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Une étape",
  description: "",
  status: "todo",
  priority: "medium",
  due: "2026-10-18",
  projectId: "",
  createdAt: "2026-10-17T10:00:00.000Z",
  completedAt: null,
  ...override,
});
describe("Briefings locaux", () => {
  it("limite à trois priorités, exclut le futur et les tâches terminées", () => {
    const data = {
      ...emptyData(),
      tasks: [
        task(),
        task({ id: "t2", priority: "high" }),
        task({ id: "t3", due: "" }),
        task({ id: "t4" }),
        task({ id: "t5", due: "2026-11-01", priority: "high" }),
        task({
          id: "t6",
          status: "done",
          completedAt: "2026-10-18T10:00:00.000Z",
        }),
      ],
    };
    const result = briefing(data, "2026-10-18");
    expect(result.priorities).toHaveLength(3);
    expect(result.priorities[0].id).toBe("t2");
    expect(result.priorities.map((task) => task.id)).not.toContain("t5");
    expect(result.completed).toHaveLength(1);
  });
  it("compte les retards réels et ne fabrique pas de bilan", () => {
    expect(briefing(emptyData(), "2026-10-18").completed).toEqual([]);
    const result = briefing(
      { ...emptyData(), tasks: [task({ due: "2026-10-17" })] },
      "2026-10-18",
    );
    expect(result.overdue).toHaveLength(1);
    expect(result.overdue[0].due).toBe("2026-10-17");
  });
  it("trie sans modifier la liste source et respecte les dates locales", () => {
    const tasks = [task(), task({ id: "t2", priority: "high" })];
    expect(sortedTasks(tasks)[0].id).toBe("t2");
    expect(tasks[0].id).toBe("t1");
    expect(localDay(new Date(2026, 0, 2, 0, 30))).toBe("2026-01-02");
  });
});
describe("Sauvegardes et intégrité", () => {
  it("restaure exactement les données et les textes non exécutables", () => {
    const data = {
      ...emptyData(),
      tasks: [task({ title: "<script>alert(1)</script>" })],
    };
    expect(parseBackup(serializeBackup(data))).toEqual(data);
  });
  it.each([
    "{",
    JSON.stringify({ application: "Autre" }),
    JSON.stringify({
      application: "LifeOS",
      exportedAt: new Date().toISOString(),
      data: { ...emptyData(), version: 99 },
    }),
    serializeBackup(emptyData()).replace(
      '"notes": []',
      '"notes": [], "secret": true',
    ),
  ])("refuse les fichiers invalides ou de version incompatible", (raw) => {
    expect(() => parseBackup(raw)).toThrow();
  });
  it("refuse les identifiants dupliqués, références orphelines et dates invalides", () => {
    for (const tasks of [
      [task(), task()],
      [task({ projectId: "absent" })],
      [task({ due: "2026-02-30" })],
      [task({ status: "done", completedAt: null })],
    ]) {
      expect(() => serializeBackup({ ...emptyData(), tasks })).toThrow();
    }
  });
  it("limite la taille du fichier", () => {
    expect(() => parseBackup(" ".repeat(10 * 1024 * 1024 + 1))).toThrow(
      "volumineuse",
    );
  });
  it("conserve les tâches après suppression du projet", () => {
    const data = {
      ...emptyData(),
      projects: [
        {
          id: "p1",
          name: "LifeOS",
          description: "",
          color: "sage" as const,
          status: "active" as const,
          createdAt: new Date().toISOString(),
        },
      ],
      tasks: [task({ projectId: "p1" })],
    };
    const result = removeProject(data, "p1");
    expect(result.projects).toHaveLength(0);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].projectId).toBe("");
    expect(data.tasks[0].projectId).toBe("p1");
  });
});
