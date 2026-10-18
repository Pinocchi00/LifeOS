import { useCallback, useEffect, useRef, useState } from "react";
import { emptyData, type Data } from "../domain/model";
import { readData, writeData } from "./database";

export function useLifeOS() {
  const [data, setData] = useState<Data>(emptyData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const current = useRef(data);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let cancelled = false;
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const initialize = async () => {
      if (!navigator.locks) throw new Error("Navigateur incompatible");
      await navigator.locks.request(
        "lifeos-single-writer",
        { ifAvailable: true },
        async (lock) => {
          if (cancelled) return;
          if (!lock) {
            setError(
              "LifeOS est déjà ouvert dans une autre fenêtre. Fermez-la puis rechargez cette page pour protéger vos données.",
            );
            return;
          }
          const value = await readData();
          if (cancelled) return;
          current.current = value;
          setData(value);
          setReady(true);
          await held;
        },
      );
    };
    void initialize().catch(() => {
      if (!cancelled)
        setError(
          "Impossible d’ouvrir vos données locales. Aucun remplacement n’a été effectué. Utilisez un navigateur récent sur localhost ou HTTPS et vérifiez son accès au stockage.",
        );
    });
    return () => {
      cancelled = true;
      release();
    };
  }, []);
  const mutate = useCallback(
    (change: (previous: Data) => Data): Promise<void> => {
      setBusy(true);
      const operation = queue.current.then(async () => {
        const next = change(current.current);
        await writeData(next);
        current.current = next;
        setData(next);
        setError("");
      });
      queue.current = operation.catch(() => undefined);
      return operation
        .catch(() => {
          setError(
            "Enregistrement impossible. Vos dernières modifications ne sont pas sauvegardées ; réessayez et exportez vos données.",
          );
          throw new Error("Échec de sauvegarde");
        })
        .finally(() => setBusy(false));
    },
    [],
  );
  return { data, ready, error, busy, mutate };
}
