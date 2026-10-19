import "fake-indexeddb/auto";
import { openDB } from "idb";
import { describe, expect, it } from "vitest";
import { readData, writeData } from "./database";
import { emptyData, type Data } from "../domain/model";
describe("IndexedDB", () => {
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
    expect(migrated.version).toBe(3);
    expect(migrated.notes).toEqual(legacy.notes);
    expect(migrated.missions).toEqual([]);
    const check = await openDB("lifeos-core", 1);
    expect((await check.get("state", "current")).version).toBe(3);
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
    const { routines, routineEntries, goals, ...legacy } = emptyData();
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
      version: 3,
      notes: [note],
      routines,
      routineEntries,
      goals,
    });
    const check = await openDB("lifeos-core", 1);
    expect((await check.get("state", "current")).version).toBe(3);
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
});
