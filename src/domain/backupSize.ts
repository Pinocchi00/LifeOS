export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export const jsonBytes = (raw: string) => new TextEncoder().encode(raw).length;

// Keep readable JSON for ordinary exports, then remove only formatting if needed.
export function boundedJson(value: unknown, tooLarge: string) {
  const readable = JSON.stringify(value, null, 2);
  if (jsonBytes(readable) <= MAX_BACKUP_BYTES) return readable;
  const compact = JSON.stringify(value);
  if (jsonBytes(compact) <= MAX_BACKUP_BYTES) return compact;
  throw new Error(tooLarge);
}
