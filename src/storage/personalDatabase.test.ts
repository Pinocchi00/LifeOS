import "fake-indexeddb/auto";
import { openDB } from "idb";
import { describe, expect, it } from "vitest";
import { emptyPersonal, type PersonalData } from "../domain/personal";
import { emptyData } from "../domain/model";
import { readData, writeData } from "./database";
import { mutatePersonal, personalBusy, readPersonal } from "./personalDatabase";
const workout = {
  id: "w1",
  title: "Séance privée",
  day: "2026-10-19",
  minutes: 30,
  notes: "Confidentiel",
  exercises: [],
  createdAt: "2026-10-19T09:00:00.000Z",
};
describe("Stockage Vie distinct et transactionnel", () => {
  it("persiste Vie séparément sans modifier les données générales", async () => {
    const core = {
      ...emptyData(),
      notes: [
        {
          id: "n1",
          title: "Organisation",
          body: "À conserver",
          createdAt: workout.createdAt,
        },
      ],
    };
    await writeData(core);
    await mutatePersonal(() => ({ ...emptyPersonal(), workouts: [workout] }));
    expect((await readPersonal()).workouts).toEqual([workout]);
    expect(await readData()).toEqual(core);
    await mutatePersonal(() => emptyPersonal());
  });
  it("sérialise deux écritures et ne conserve pas un état incomplet après un refus", async () => {
    await mutatePersonal(() => emptyPersonal());
    const first = mutatePersonal((previous) => ({
      ...previous,
      workouts: [...previous.workouts, workout],
    }));
    const second = mutatePersonal((previous) => ({
      ...previous,
      workouts: [...previous.workouts, { ...workout, id: "w2" }],
    }));
    expect(personalBusy()).toBe(true);
    await Promise.all([first, second]);
    expect((await readPersonal()).workouts).toHaveLength(2);
    expect(personalBusy()).toBe(false);
    await expect(
      mutatePersonal(
        (previous) => ({ ...previous, version: 99 }) as unknown as PersonalData,
      ),
    ).rejects.toThrow();
    expect((await readPersonal()).workouts).toHaveLength(2);
    await mutatePersonal(() => emptyPersonal());
  });
  it("refuse un stockage incompatible sans le remplacer par du vide", async () => {
    const db = await openDB("lifeos-personal", 1);
    const invalid = { version: 99, private: "à conserver" };
    await db.put("state", invalid, "current");
    await expect(readPersonal()).rejects.toThrow();
    await expect(mutatePersonal(() => emptyPersonal())).rejects.toThrow();
    expect(await db.get("state", "current")).toEqual(invalid);
    await db.put("state", emptyPersonal(), "current");
    db.close();
  });
});
