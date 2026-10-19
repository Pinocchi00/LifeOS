import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { isAndroid } from "../platform/runtime";
import {
  disableReminders,
  enableReminder,
  reminderStatus,
  testReminder,
} from "../platform/reminders";

export function AndroidReminders() {
  const [time, setTime] = useState("09:00");
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof reminderStatus>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(isAndroid());
  useEffect(() => {
    if (!isAndroid()) return;
    let disposed = false;
    const refresh = async () => {
      try {
        const next = await reminderStatus();
        if (!disposed) {
          setStatus(next);
          if (next.time) setTime(next.time);
          setError("");
        }
      } catch {
        if (!disposed)
          setError(
            "Impossible de lire les rappels Android. Réessayez en rouvrant ce panneau.",
          );
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    void refresh();
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setStatus(await reminderStatus());
      setMessage(success);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Le rappel n’a pas pu être modifié.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="android-reminders" aria-labelledby="reminders-title">
      <h3 id="reminders-title">
        <Bell size={20} /> Votre rendez-vous quotidien
      </h3>
      {!isAndroid() ? (
        <p className="muted">
          Les rappels sont disponibles dans l’application Android. Aucun rappel
          navigateur n’est activé.
        </p>
      ) : (
        <>
          <p>
            Un rappel pour ouvrir LifeOS, à l’heure que vous choisissez. Son
            texte reste général : aucune tâche ni information Vie n’apparaît
            dans la notification.
          </p>
          <p className="small muted">
            Heure locale, approximative selon Android et les réglages de
            batterie. Le rappel reste sur cet appareil et n’est pas inclus dans
            les sauvegardes.
          </p>
          <p role="status">
            {loading
              ? "Lecture des rappels…"
              : !status
                ? "État des rappels indisponible."
                : status.time
                  ? `Rappel quotidien programmé vers ${status.time}.`
                  : "Aucun rappel quotidien programmé."}
            {status && status.permission !== "granted"
              ? " Notifications non autorisées par Android."
              : ""}
            {status?.testPending ? " Un essai est en attente." : ""}
          </p>
          <label>
            Heure du rappel
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              disabled={busy || loading}
            />
          </label>
          <div className="form-actions">
            <button
              className="button primary"
              disabled={busy || loading || !status || !time}
              onClick={() =>
                void run(
                  () => enableReminder(time),
                  "Rappel quotidien programmé. Android peut décaler sa livraison.",
                )
              }
            >
              {status?.time ? "Modifier le rappel" : "Activer le rappel"}
            </button>
            <button
              className="button secondary"
              disabled={busy || loading || !status}
              onClick={() =>
                void run(
                  testReminder,
                  "Essai programmé dans environ une minute. Vous pouvez le recevoir avec un délai.",
                )
              }
            >
              Tester dans une minute
            </button>
            <button
              className="text-button"
              disabled={
                busy ||
                loading ||
                !status ||
                (!status.time && !status.testPending)
              }
              onClick={() =>
                void run(disableReminders, "Rappel quotidien et essai annulés.")
              }
            >
              Désactiver les rappels
            </button>
          </div>
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
