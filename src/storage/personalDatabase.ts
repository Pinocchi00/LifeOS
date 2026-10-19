import { openDB } from "idb";
import {
  emptyPersonal,
  personalSchema,
  type PersonalData,
} from "../domain/personal";
const database = () =>
  openDB("lifeos-personal", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
let queue: Promise<unknown> = Promise.resolve();
let pending = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const personalBusy = () => pending > 0;
export const subscribePersonal = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export async function readPersonal(): Promise<PersonalData> {
  await queue;
  const db = await database();
  try {
    const value = await db.get("state", "current");
    return value === undefined ? emptyPersonal() : personalSchema.parse(value);
  } finally {
    db.close();
  }
}
// Read and write in one transaction: queued edits survive navigation away from Vie.
export function mutatePersonal(
  change: (data: PersonalData) => PersonalData,
): Promise<PersonalData> {
  pending++;
  emit();
  const operation = queue.then(async () => {
    const db = await database();
    try {
      const tx = db.transaction("state", "readwrite");
      try {
        const stored = await tx.store.get("current");
        const data =
          stored === undefined ? emptyPersonal() : personalSchema.parse(stored);
        const next = personalSchema.parse(change(data));
        await tx.store.put(next, "current");
        await tx.done;
        return next;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          /* transaction may already be aborted */
        }
        await tx.done.catch(() => undefined);
        throw error;
      }
    } finally {
      db.close();
    }
  });
  queue = operation.catch(() => undefined);
  return operation.finally(() => {
    pending--;
    emit();
  });
}
