import { useState, useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";
import {
  applyUpdate,
  subscribeUpdate,
  updateAvailable,
} from "../experience/pwa";
export function UpdateNotice({ busy }: { busy: boolean }) {
  const available = useSyncExternalStore(subscribeUpdate, updateAvailable);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  if (!available) return null;
  return (
    <div className="update-notice" role="status">
      <span>
        <RefreshCw size={16} />
        Une nouvelle version de LifeOS est prête.
      </span>
      <button
        className="button secondary"
        disabled={busy || applying}
        onClick={async () => {
          setApplying(true);
          try {
            await applyUpdate();
          } catch {
            setError(
              "La mise à jour n’a pas pu démarrer. Fermez les fenêtres LifeOS puis relancez l’application.",
            );
            setApplying(false);
          }
        }}
      >
        {applying ? "Ouverture de la nouvelle version…" : "Mettre à jour"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
