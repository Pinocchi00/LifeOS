import { openDB } from "idb";
import {
  dataSchema,
  storedDataSchema,
  emptyData,
  type Data,
} from "../domain/model";

const database = () =>
  openDB("lifeos-core", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
export async function readData(): Promise<Data> {
  const db = await database();
  try {
    const value = await db.get("state", "current");
    if (value === undefined) return emptyData();
    const migrated = storedDataSchema.parse(value);
    if (value.version === 1) await db.put("state", migrated, "current");
    return migrated;
  } finally {
    db.close();
  }
}
export async function writeData(data: Data): Promise<void> {
  const valid = dataSchema.parse(data);
  const db = await database();
  try {
    const transaction = db.transaction("state", "readwrite");
    await transaction.store.put(valid, "current");
    await transaction.done;
  } finally {
    db.close();
  }
}
