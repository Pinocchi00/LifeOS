import { describe, expect, it } from "vitest";
import { gardenDirection } from "./garden";
import { emptyData, type Task } from "./model";
const date = "2026-10-19T09:00:00.000Z";
const task = (patch: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Prochaine action réelle",
  description: "",
  status: "todo",
  priority: "medium",
  due: "",
  projectId: "",
  createdAt: date,
  completedAt: null,
  ...patch,
});
describe("Direction du jardin de travail", () => {
  it("propose une première tâche sans inventer de planning", () => {
    const result = gardenDirection(emptyData(), "2026-10-19", "day", false);
    expect(result.action).toBe("task");
    expect(result.taskId).toBeUndefined();
  });
  it("reprend la priorité réelle et exclut les tâches futures", () => {
    const data = {
      ...emptyData(),
      tasks: [
        task(),
        task({ id: "future", priority: "high", due: "2026-11-01" }),
        task({ id: "priority", priority: "high", due: "2026-10-18" }),
      ],
    };
    const result = gardenDirection(data, "2026-10-19", "day", false);
    expect(result.taskId).toBe("priority");
    expect(result.metric).toBe("1 échéance à revoir");
  });
  it("ouvre le planning quand toutes les tâches sont à venir", () => {
    expect(
      gardenDirection(
        { ...emptyData(), tasks: [task({ due: "2026-11-01" })] },
        "2026-10-19",
        "day",
        false,
      ).action,
    ).toBe("agenda");
  });
  it("distingue un jardin vide de projets déjà archivés", () => {
    const data = {
      ...emptyData(),
      projects: [
        {
          id: "p1",
          name: "Projet conservé",
          description: "",
          color: "sage" as const,
          status: "done" as const,
          createdAt: date,
        },
      ],
    };
    const result = gardenDirection(data, "2026-10-19", "projects", false);
    expect(result.label).toBe("Retrouver mes projets");
    expect(result.description).toContain("Aucun n’est marqué en cours");
  });
  it("invite à vérifier les missions dont le statut le demande", () => {
    const data = {
      ...emptyData(),
      missions: [
        {
          id: "m1",
          title: "Mission réelle",
          assistant: "claude" as const,
          projectId: "",
          objective: "Vérifier",
          criteria: "Rapport lisible",
          files: "",
          due: "",
          status: "review" as const,
          reports: [],
          createdAt: date,
          updatedAt: date,
          validatedAt: null,
        },
      ],
    };
    const result = gardenDirection(data, "2026-10-19", "assistants", false);
    expect(result.metric).toBe("1 à vérifier");
    expect(result.label).toBe("Vérifier les missions");
  });
  it("ne compte dans le bilan que les réalisations du jour local", () => {
    const completedAt = new Date(2026, 9, 19, 12).toISOString();
    const data = {
      ...emptyData(),
      tasks: [
        task({ status: "done", completedAt }),
        task({
          id: "old",
          status: "done",
          completedAt: new Date(2026, 9, 18, 12).toISOString(),
        }),
      ],
    };
    expect(gardenDirection(data, "2026-10-19", "day", true).metric).toBe(
      "1 terminée",
    );
  });
});
