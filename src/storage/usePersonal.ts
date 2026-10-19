import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { emptyPersonal, type PersonalData } from "../domain/personal";
import {
  mutatePersonal,
  personalBusy,
  readPersonal,
  subscribePersonal,
} from "./personalDatabase";
export const usePersonalBusy = () =>
  useSyncExternalStore(subscribePersonal, personalBusy, () => false);
export function usePersonal() {
  const [data, setData] = useState(emptyPersonal);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const busy = usePersonalBusy();
  useEffect(() => {
    let canceled = false;
    void readPersonal()
      .then((value) => {
        if (!canceled) {
          setData(value);
          setReady(true);
        }
      })
      .catch(() => {
        if (!canceled)
          setError(
            "Impossible d’ouvrir les suivis Vie. Aucun remplacement n’a été effectué. Rechargez après avoir vérifié l’accès au stockage du navigateur.",
          );
      });
    return () => {
      canceled = true;
    };
  }, []);
  const change = useCallback(
    async (operation: (data: PersonalData) => PersonalData) => {
      try {
        const next = await mutatePersonal(operation);
        setData(next);
        setError("");
      } catch {
        setError(
          "Enregistrement Vie impossible. Vos dernières modifications ne sont pas sauvegardées. Vérifiez les champs et réessayez.",
        );
        throw new Error("Échec d’enregistrement Vie");
      }
    },
    [],
  );
  return { data, ready, error, busy, change };
}
