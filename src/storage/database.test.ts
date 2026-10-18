import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { readData, writeData } from "./database";
import { emptyData, type Data } from "../domain/model";
describe("IndexedDB", () => {
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
