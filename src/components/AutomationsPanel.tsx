import { useEffect, useRef, useState } from "react";
import {
  applyAutomation,
  pastTasks,
  prepareAutomation,
  undoAutomation,
  type AutomationPreview,
} from "../domain/automations";
import { addDays } from "../domain/planning";
import { priorityNames, type Data } from "../domain/model";
import "../automations.css";

const dayLabel = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const slotLabel = (slot: { day: string; start: string; duration: number }) =>
  `${dayLabel(slot.day)} à ${slot.start} · ${slot.duration} min`;
export function AutomationsPanel({
  data,
  today,
  change,
  dirty,
}: {
  data: Data;
  today: string;
  change: (operation: (previous: Data) => Data) => Promise<void>;
  dirty: (value: boolean) => void;
}) {
  const [targetDay, setDay] = useState(addDays(today, 1));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [preview, setPreview] = useState<AutomationPreview | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const previewRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dirty(selected.length > 0 || !!preview || !!confirmation || busy);
  }, [selected.length, preview, confirmation, busy, dirty]);
  useEffect(() => () => dirty(false), [dirty]);
  useEffect(() => {
    if (preview) previewRef.current?.focus();
  }, [preview]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (confirmation) confirmationRef.current?.focus();
  }, [confirmation]);
  const candidates = pastTasks(data, today);
  const found = candidates.filter((task) =>
    task.title
      .toLocaleLowerCase("fr")
      .includes(search.trim().toLocaleLowerCase("fr")),
  );
  const prepare = () => {
    setError("");
    setMessage("");
    setAccepted(false);
    setConfirmation(null);
    try {
      setPreview(
        prepareAutomation(data, { taskIds: selected, targetDay, start, end }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== "ZodError"
          ? cause.message
          : "Choisissez de 1 à 20 tâches et une plage horaire valide.",
      );
    }
  };
  async function commit(operation: (previous: Data) => Data, notice: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await change(operation);
      setSelected([]);
      setPreview(null);
      setAccepted(false);
      setConfirmation(null);
      setMessage(notice);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Enregistrement impossible. Réessayez.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="automation-panel">
      <header className="automation-intro">
        <span className="planning-eyebrow">AUTOMATISATIONS · 01</span>
        <h2>Redonner une place à ce qui attend.</h2>
        <p>
          Déplacez les créneaux passés vers les plages libres d’un seul jour.
          Vous choisissez les tâches, vous relisez, puis vous appliquez.
        </p>
        <p className="muted">
          Les durées et les échéances restent intactes. Les tâches et routines
          déjà planifiées réservent leur place. Tout se passe sur cet appareil.
        </p>
      </header>
      {error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="form-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="automation-notice">
          {message}
        </p>
      )}
      {!preview ? (
        <section aria-label="Préparer une replanification">
          <fieldset disabled={busy} className="automation-fields">
            <legend>01 · Choisir la plage</legend>
            <label>
              Jour d’accueil
              <input
                type="date"
                min={today}
                value={targetDay}
                onChange={(event) => setDay(event.target.value)}
              />
            </label>
            <label>
              À partir de
              <input
                type="time"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label>
              Jusqu’à
              <input
                type="time"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </fieldset>
          <p className="muted">
            Pour aujourd’hui, les propositions commencent au moins cinq minutes
            après la préparation. Les priorités hautes passent en premier, puis
            les échéances les plus proches. Les créneaux se cherchent par pas de
            cinq minutes.
          </p>
          <div className="section-heading">
            <h3>02 · Choisir les tâches</h3>
            <span>{selected.length} / 20 sélectionnées</span>
          </div>
          {candidates.length > 0 ? (
            <>
              <label className="automation-search">
                Filtrer les tâches
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setLimit(20);
                  }}
                />
              </label>
              <ul className="automation-candidates">
                {found.slice(0, limit).map((task) => (
                  <li key={task.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.includes(task.id)}
                        disabled={
                          busy ||
                          (!selected.includes(task.id) && selected.length >= 20)
                        }
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, task.id]
                              : current.filter((id) => id !== task.id),
                          )
                        }
                      />
                      <span>
                        <strong>{task.title}</strong>
                        <small>
                          {slotLabel(task.schedule!)} · Priorité{" "}
                          {priorityNames[task.priority].toLowerCase()}
                          {task.due && ` · Échéance ${dayLabel(task.due)}`}
                        </small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {!found.length && (
                <p>Aucune tâche ne correspond à cette recherche.</p>
              )}
              {found.length > limit && (
                <button
                  className="text-button"
                  onClick={() => setLimit((value) => value + 20)}
                >
                  Afficher 20 tâches de plus
                </button>
              )}
              <div className="automation-actions">
                <button
                  className="button primary"
                  disabled={busy || !selected.length}
                  onClick={prepare}
                >
                  Préparer l’aperçu
                </button>
                {selected.length > 0 && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setSelected([])}
                  >
                    Vider la sélection
                  </button>
                )}
              </div>
            </>
          ) : (
            <p>
              Aucun créneau passé à replanifier. Les tâches terminées et les
              créneaux d’aujourd’hui ou à venir sont conservés.
            </p>
          )}
        </section>
      ) : (
        <section
          ref={previewRef}
          tabIndex={-1}
          className="automation-preview"
          aria-label="Aperçu des déplacements"
        >
          <span className="planning-eyebrow">
            03 · RELIRE AVANT D’APPLIQUER
          </span>
          <h3>
            {preview.moves.length} déplacement
            {preview.moves.length > 1 ? "s" : ""} proposé
            {preview.moves.length > 1 ? "s" : ""}
          </h3>
          <p>
            Aucune modification enregistrée. Cet aperçu expire après dix minutes
            ; les créneaux sont vérifiés à nouveau lors de la confirmation.
          </p>
          <ol className="automation-moves">
            {preview.moves.map((move) => (
              <li key={move.before.id}>
                <strong>{move.before.title}</strong>
                <div>
                  <span>Avant · {slotLabel(move.before.schedule!)}</span>
                  <span>Après · {slotLabel(move.after)}</span>
                </div>
                {move.before.due && (
                  <small>
                    Échéance conservée · {dayLabel(move.before.due)}
                  </small>
                )}
              </li>
            ))}
          </ol>
          {preview.skipped.length > 0 && (
            <div className="automation-skipped">
              <h4>
                {preview.skipped.length} tâche
                {preview.skipped.length > 1 ? "s" : ""} laissée
                {preview.skipped.length > 1 ? "s" : ""} en place
              </h4>
              <ul>
                {preview.skipped.map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong> · {item.reason}
                  </li>
                ))}
              </ul>
              <p>
                Élargissez la plage ou choisissez moins de tâches pour leur
                trouver une place.
              </p>
            </div>
          )}
          {preview.moves.length > 0 && (
            <label className="automation-consent">
              <input
                type="checkbox"
                checked={accepted}
                disabled={busy}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              J’ai relu ces déplacements et je veux les appliquer.
            </label>
          )}
          <div className="automation-actions">
            <button
              className="button primary"
              disabled={!accepted || busy || !preview.moves.length}
              onClick={() =>
                void commit(
                  (previous) => applyAutomation(previous, preview),
                  "Créneaux déplacés. Les échéances sont conservées.",
                )
              }
            >
              {busy ? "Enregistrement…" : "Appliquer ces déplacements"}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setAccepted(false);
                setError("");
              }}
            >
              Revoir la sélection
            </button>
          </div>
        </section>
      )}
      <section
        className="automation-history"
        aria-label="Journal des automatisations"
      >
        <div className="section-heading">
          <h3>Le journal</h3>
          <span>{data.automationRuns.length} / 100 opérations</span>
        </div>
        <p className="muted">
          Un retour groupé rétablit les anciens créneaux si chaque tâche est
          inchangée et si ces créneaux restent libres. Le journal fait partie de
          la sauvegarde d’organisation v7.
        </p>
        {!data.automationRuns.length && <p>Aucune opération appliquée.</p>}
        {[...data.automationRuns]
          .reverse()
          .slice(0, historyLimit)
          .map((run) => (
            <article key={run.id} className="automation-run">
              <details>
                <summary>
                  {run.moves.length} tâche{run.moves.length > 1 ? "s" : ""} vers
                  le {dayLabel(run.targetDay)} ·{" "}
                  {run.undoneAt ? "Annulée" : "Appliquée"}
                </summary>
                <p>
                  Appliquée le {new Date(run.appliedAt).toLocaleString("fr-FR")}
                  {run.undoneAt &&
                    ` · Annulée le ${new Date(run.undoneAt).toLocaleString("fr-FR")}`}
                </p>
                <ul>
                  {run.moves.map((move) => (
                    <li key={move.before.id}>
                      <strong>{move.before.title}</strong>
                      <br />
                      {slotLabel(move.before.schedule!)} →{" "}
                      {slotLabel(move.after)}
                    </li>
                  ))}
                </ul>
              </details>
              {!run.undoneAt && (
                <button
                  className="text-button"
                  disabled={busy || !!preview || selected.length > 0}
                  onClick={() => {
                    setConfirmation(run.id);
                    setError("");
                    setMessage("");
                  }}
                >
                  Revenir aux anciens créneaux
                </button>
              )}
            </article>
          ))}
        {data.automationRuns.length > historyLimit && (
          <button
            className="text-button"
            onClick={() => setHistoryLimit((value) => value + 10)}
          >
            Afficher 10 opérations de plus
          </button>
        )}
        {data.automationRuns.length > 0 && (
          <button
            className="text-button"
            disabled={busy || !!preview || selected.length > 0}
            onClick={() => {
              setConfirmation("clear");
              setError("");
              setMessage("");
            }}
          >
            Effacer le journal
          </button>
        )}
        {confirmation && (
          <div
            className="automation-confirm"
            ref={confirmationRef}
            tabIndex={-1}
            role="group"
            aria-label="Confirmation du journal"
          >
            <p>
              {confirmation === "clear"
                ? "Effacer tout le journal ? Vos tâches resteront en place. Les anciens créneaux ne pourront plus être rétablis depuis ce journal. Exportez une sauvegarde pour les conserver."
                : "Rétablir tous les anciens créneaux de cette opération ? Les échéances et les autres tâches resteront intactes."}
            </p>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void commit(
                  (previous) =>
                    confirmation === "clear"
                      ? { ...previous, automationRuns: [] }
                      : undoAutomation(previous, confirmation),
                  confirmation === "clear"
                    ? "Journal effacé. Les tâches sont conservées."
                    : "Anciens créneaux rétablis. Le retour est conservé dans le journal.",
                )
              }
            >
              Confirmer{" "}
              {confirmation === "clear"
                ? "l’effacement du journal"
                : "le retour aux anciens créneaux"}
            </button>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Garder en l’état
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
