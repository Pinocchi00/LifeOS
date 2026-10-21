import "fake-indexeddb/auto";
import { openDB } from "idb";
import { describe, expect, it, vi } from "vitest";
import { readData, writeData } from "./database";
import { emptyData, type Data } from "../domain/model";
describe("IndexedDB", () => {
  it("renvoie l’état normalisé réellement écrit, sans garder un état différent en mémoire", async () => {
    const proposed = {
      ...emptyData(),
      notes: [
        {
          id: "normalized",
          title: "  Mon idée  ",
          body: "  Contexte  ",
          createdAt: "2026-10-21T10:00:00.000Z",
        },
      ],
    };
    const saved = await writeData(proposed);
    expect(saved.notes[0]).toMatchObject({
      title: "Mon idée",
      body: "Contexte",
    });
    expect(await readData()).toEqual(saved);
    expect(proposed.notes[0].title).toBe("  Mon idée  ");
    await writeData(emptyData());
  });
  it("garde l’ancienne enveloppe après une transaction interrompue puis accepte la suivante", async () => {
    const original = {
      ...emptyData(),
      notes: [
        {
          id: "keep",
          title: "Conservée",
          body: "",
          createdAt: "2026-10-21T10:00:00.000Z",
        },
      ],
    };
    await writeData(original);
    const put = IDBObjectStore.prototype.put;
    const fault = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementationOnce(function (this: IDBObjectStore, value, key) {
        const request = put.call(this, value, key);
        this.transaction.abort();
        return request;
      });
    try {
      await expect(writeData(emptyData())).rejects.toThrow();
    } finally {
      fault.mockRestore();
    }
    expect(await readData()).toEqual(original);
    await writeData(emptyData());
    expect(await readData()).toEqual(emptyData());
  });
  it.each([
    { version: 99, private: "à conserver" },
    {
      version: 1,
      tasks: [],
      projects: [],
      notes: [
        {
          id: "old",
          title: "",
          body: "à conserver",
          createdAt: "2026-10-21T10:00:00.000Z",
        },
      ],
    },
  ])(
    "ne réécrit pas une enveloppe incompatible ou une migration invalide",
    async (stored) => {
      const db = await openDB("lifeos-core", 1, {
        upgrade(database) {
          database.createObjectStore("state");
        },
      });
      await db.put("state", stored, "current");
      try {
        await expect(readData()).rejects.toThrow();
        expect(await db.get("state", "current")).toEqual(stored);
      } finally {
        db.close();
        await writeData(emptyData());
      }
    },
  );
  it("migre v6 en place en conservant toutes les collections et en initialisant le journal", async () => {
    const current = emptyData();
    const { automationRuns: _runs, ...v6 } = current;
    const db = await openDB("lifeos-core", 1, {
      upgrade(database) {
        database.createObjectStore("state");
      },
    });
    await db.put("state", { ...v6, version: 6 }, "current");
    db.close();
    expect(await readData()).toEqual(current);
    const check = await openDB("lifeos-core", 1);
    expect(await check.get("state", "current")).toEqual(current);
    check.close();
  });
  it("migre une enveloppe v1 existante sans effacer ses notes", async () => {
    const db = await openDB("lifeos-core", 1, {
      upgrade(database) {
        database.createObjectStore("state");
      },
    });
    const legacy = {
      version: 1,
      tasks: [],
      projects: [],
      notes: [
        {
          id: "legacy-note",
          title: "Ancienne note",
          body: "À garder",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    await db.put("state", legacy, "current");
    db.close();
    const migrated = await readData();
    expect(migrated.version).toBe(7);
    expect(migrated.notes).toEqual(legacy.notes);
    expect(migrated.missions).toEqual([]);
    const check = await openDB("lifeos-core", 1);
    expect((await check.get("state", "current")).version).toBe(7);
    check.close();
    await writeData(emptyData());
  });
  it("part vide, persiste et remplace atomiquement une sauvegarde", async () => {
    expect(await readData()).toEqual(emptyData());
    const data = {
      ...emptyData(),
      notes: [
        {
          id: "note",
          title: "Une idée",
          body: "Locale",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    await writeData(data);
    expect(await readData()).toEqual(data);
    await writeData(emptyData());
    expect(await readData()).toEqual(emptyData());
  });
  it("migre aussi v2 en place et conserve les tâches existantes", async () => {
    const {
      automationRuns,
      githubLinks,
      adaptation,
      resources,
      learningPaths,
      learningEntries,
      routines,
      routineEntries,
      goals,
      ...legacy
    } = emptyData();
    const note = {
      id: "v2-note",
      title: "Avant l’agenda",
      body: "À garder",
      createdAt: new Date().toISOString(),
    };
    const db = await openDB("lifeos-core", 1);
    await db.put("state", { ...legacy, version: 2, notes: [note] }, "current");
    db.close();
    expect(await readData()).toEqual({
      ...legacy,
      version: 7,
      automationRuns,
      githubLinks,
      adaptation,
      resources,
      learningPaths,
      learningEntries,
      notes: [note],
      routines,
      routineEntries,
      goals,
    });
    const check = await openDB("lifeos-core", 1);
    expect((await check.get("state", "current")).version).toBe(7);
    check.close();
    await writeData(emptyData());
  });
  it("ne remplace pas les données si la validation échoue", async () => {
    const original = {
      ...emptyData(),
      notes: [
        {
          id: "safe",
          title: "À conserver",
          body: "",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    await writeData(original);
    await expect(
      writeData({ ...emptyData(), version: 77 } as unknown as Data),
    ).rejects.toThrow();
    expect(await readData()).toEqual(original);
  });
  it("migre une enveloppe v3 réelle et réécrit v5 sans effacer le planning", async () => {
    const {
      automationRuns,
      githubLinks,
      adaptation,
      resources,
      learningPaths,
      learningEntries,
      ...legacy
    } = emptyData();
    const task = {
      id: "planned-v3",
      title: "Créneau conservé",
      description: "",
      status: "todo",
      priority: "medium",
      due: "2026-10-22",
      projectId: "",
      createdAt: "2026-10-19T09:00:00.000Z",
      completedAt: null,
      schedule: { day: "2026-10-19", start: "10:00", duration: 45 },
    };
    const db = await openDB("lifeos-core", 1);
    await db.put("state", { ...legacy, version: 3, tasks: [task] }, "current");
    const migrated = await readData();
    expect(migrated).toEqual({
      ...legacy,
      version: 7,
      automationRuns,
      githubLinks,
      adaptation,
      tasks: [task],
      resources,
      learningPaths,
      learningEntries,
    });
    expect((await db.get("state", "current")).version).toBe(7);
    db.close();
    await writeData(emptyData());
  });
  it("migre v4 en place et conserve Explorer sans consulter la base Vie", async () => {
    const { automationRuns, githubLinks, adaptation, ...legacy } = emptyData();
    const note = {
      id: "note-v4",
      title: "Conservée",
      body: "Une idée",
      createdAt: "2026-10-19T10:00:00.000Z",
    };
    const db = await openDB("lifeos-core", 1);
    await db.put("state", { ...legacy, version: 4, notes: [note] }, "current");
    const migrated = await readData();
    expect(migrated).toEqual({
      ...legacy,
      version: 7,
      automationRuns,
      githubLinks,
      notes: [note],
      adaptation,
    });
    expect(await db.get("state", "current")).toEqual(migrated);
    db.close();
    await writeData(emptyData());
  });
  it("migre v5 en conservant les préférences et l’historique existants", async () => {
    const { changePreferences } = await import("../domain/adaptation");
    const current = changePreferences(
      emptyData(),
      { ...emptyData().adaptation.preferences, priorityCount: 1 },
      "Garder un cap",
    );
    const { automationRuns: _runs, githubLinks: _links, ...legacy } = current;
    const db = await openDB("lifeos-core", 1);
    await db.put("state", { ...legacy, version: 5 }, "current");
    expect(await readData()).toEqual(current);
    expect(await db.get("state", "current")).toEqual(current);
    db.close();
    await writeData(emptyData());
  });
});
