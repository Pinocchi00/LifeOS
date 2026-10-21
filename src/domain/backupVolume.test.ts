import { describe, expect, it } from "vitest";
import { boundedJson, jsonBytes, MAX_BACKUP_BYTES } from "./backupSize";
import { emptyData, parseBackup, serializeBackup, type Task } from "./model";
import { emptyPersonal, parsePersonal, serializePersonal } from "./personal";
const date = "2026-10-21T10:00:00.000Z";
describe("Sauvegardes volumineuses sans perte", () => {
  it("restaure vingt mille tâches dont le JSON indenté dépasserait dix Mo", () => {
    const data = emptyData();
    data.tasks = Array.from({ length: 20_000 }, (_, index): Task => ({
      id: `task-${index}`,
      title: `Tâche ${index}`,
      description: "Contexte ".repeat(28).trim(),
      status: "todo",
      priority: "medium",
      due: "",
      projectId: "",
      createdAt: date,
      completedAt: null,
    }));
    expect(
      jsonBytes(
        JSON.stringify(
          { application: "LifeOS", exportedAt: date, data },
          null,
          2,
        ),
      ),
    ).toBeGreaterThan(MAX_BACKUP_BYTES);
    const raw = serializeBackup(data);
    expect(jsonBytes(raw)).toBeLessThanOrEqual(MAX_BACKUP_BYTES);
    expect(parseBackup(raw)).toEqual(data);
  });
  it("compacte aussi un export Vie sélectif sans perdre ses rubriques ni ses textes", () => {
    const data = emptyPersonal();
    data.sleep = Array.from({ length: 2_000 }, (_, index) => ({
      id: `sleep-${index}`,
      wakeDay: new Date(Date.UTC(2020, 0, index + 1, 6))
        .toISOString()
        .slice(0, 10),
      start: new Date(Date.UTC(2020, 0, index + 1, -2)).toISOString(),
      end: new Date(Date.UTC(2020, 0, index + 1, 6)).toISOString(),
      quality: 3 as const,
      notes: "Nuit ".repeat(1_016).trim(),
    }));
    expect(
      jsonBytes(
        JSON.stringify(
          {
            application: "LifeOS-Vie",
            version: 1,
            exportedAt: date,
            sections: { sommeil: { sleep: data.sleep } },
          },
          null,
          2,
        ),
      ),
    ).toBeGreaterThan(MAX_BACKUP_BYTES);
    const raw = serializePersonal(data, ["sommeil"]);
    expect(parsePersonal(raw).sections.sommeil?.sleep).toEqual(data.sleep);
    expect(Object.keys(parsePersonal(raw).sections)).toEqual(["sommeil"]);
    expect(jsonBytes(raw)).toBeLessThanOrEqual(MAX_BACKUP_BYTES);
  });
  it("accepte exactement la limite compacte et compte les octets UTF-8", () => {
    const raw = boundedJson(
      { text: "x".repeat(MAX_BACKUP_BYTES - 11) },
      "trop grand",
    );
    expect(jsonBytes(raw)).toBe(MAX_BACKUP_BYTES);
    expect(() =>
      boundedJson({ text: "x".repeat(MAX_BACKUP_BYTES - 10) }, "trop grand"),
    ).toThrow("trop grand");
    expect(jsonBytes("🌿é")).toBe(6);
  });
  it("refuse un export réellement trop gros sans tronquer les textes ni modifier les données", () => {
    const data = emptyData();
    data.notes = Array.from({ length: 1_000 }, (_, index) => ({
      id: `note-${index}`,
      title: "Journal",
      body: "é".repeat(6_000),
      createdAt: date,
    }));
    expect(() => serializeBackup(data)).toThrow(/même sans mise en forme/);
    expect(data.notes).toHaveLength(1_000);
    expect(data.notes[999].body).toHaveLength(6_000);
  });
});
