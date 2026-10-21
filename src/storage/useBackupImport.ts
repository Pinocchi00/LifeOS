import { useEffect, useRef, useState } from "react";
import { MAX_BACKUP_BYTES } from "../domain/backupSize";

export function useBackupImport<T>(
  parse: (raw: string) => T,
  invalidMessage: string,
) {
  const sequence = useRef(0);
  const [pending, setPending] = useState<T | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  function cancel() {
    sequence.current++;
    setPending(null);
    setReading(false);
    setError("");
  }
  async function load(file: File) {
    const request = ++sequence.current;
    setPending(null);
    setError("");
    setReading(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("oversized");
      const raw = await file.text();
      if (request !== sequence.current) return;
      setPending(parse(raw));
    } catch {
      if (request === sequence.current) setError(invalidMessage);
    } finally {
      if (request === sequence.current) setReading(false);
    }
  }
  return {
    pending,
    reading,
    error,
    load,
    cancel,
    clearError: () => setError(""),
  };
}
