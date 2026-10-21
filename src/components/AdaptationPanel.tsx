import { useEffect, useRef, useState } from "react";
import type { Data } from "../domain/model";
import {
  ruleNames,
  samePreferences,
  type Decision,
  type Preferences,
} from "../domain/adaptationSchema";
import {
  clearRevisions,
  restorePreferences,
  withdrawFeedback,
} from "../domain/adaptation";
import { orderLabel } from "./AdaptationForms";
const date = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function PreferenceDetails({ value }: { value: Preferences }) {
  return (
    <dl className="preference-details">
      <div>
        <dt>Priorités affichées</dt>
        <dd>{value.priorityCount}</dd>
      </div>
      <div>
        <dt>Ordre</dt>
        <dd>{orderLabel(value.taskOrder)}</dd>
      </div>
      <div>
        <dt>Conseils locaux</dt>
        <dd>{value.suggestions ? "Affichés" : "Masqués"}</dd>
      </div>
      <div>
        <dt>Types masqués</dt>
        <dd>
          {value.mutedRules.map((id) => ruleNames[id]).join(", ") || "Aucun"}
        </dd>
      </div>
    </dl>
  );
}
type Confirmation = {
  kind: "revision" | "decision" | "feedback" | "history";
  id?: string;
};
export function AdaptationPanel({
  data,
  today,
  change,
  editPreferences,
  editDecision,
}: {
  data: Data;
  today: string;
  change: (operation: (previous: Data) => Data) => Promise<void>;
  editPreferences: () => void;
  editDecision: (decision?: Decision) => void;
}) {
  const { preferences, decisions, revisions, feedback } = data.adaptation;
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const [feedbackLimit, setFeedbackLimit] = useState(10);
  const [revisionLimit, setRevisionLimit] = useState(10);
  const [pending, setPending] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const confirmationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (pending) {
      const node = confirmationRef.current;
      if (node) {
        const header = node.closest("dialog")?.querySelector(".modal-head");
        node.style.scrollMarginTop = `${(header?.getBoundingClientRect().height ?? 0) + 16}px`;
        node.scrollIntoView({ block: "start", behavior: "instant" });
        node.focus({ preventScroll: true });
      }
    }
  }, [pending]);
  const selected =
    pending?.kind === "revision"
      ? revisions.find((item) => item.id === pending.id)
      : undefined;
  const normalized = (value: string) =>
    value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr");
  const found = [...decisions]
    .reverse()
    .filter((item) =>
      normalized(
        [item.title, item.choice, item.context, item.reason].join(" "),
      ).includes(normalized(search.trim())),
    );
  const feedbackToday = feedback.filter(
    (item) => item.day === today && !item.withdrawnAt,
  );
  const ask = (confirmation: Confirmation) => {
    setPending(confirmation);
    setError("");
    setMessage("");
  };
  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const target = pending;
      await change((previous) =>
        target.kind === "revision"
          ? restorePreferences(previous, target.id!)
          : target.kind === "history"
            ? clearRevisions(previous)
            : {
                ...previous,
                adaptation: {
                  ...previous.adaptation,
                  ...(target.kind === "decision"
                    ? {
                        decisions: previous.adaptation.decisions.filter(
                          (item) => item.id !== target.id,
                        ),
                      }
                    : { feedback: [] }),
                },
              },
      );
      setMessage(
        target.kind === "revision"
          ? "Réglages restaurés. Une nouvelle version conserve ce retour en arrière."
          : target.kind === "history"
            ? "Anciennes versions effacées. Vos réglages actuels deviennent le point de départ."
            : target.kind === "decision"
              ? "Décision supprimée."
              : "Retours effacés. Les règles masquées dans vos réglages restent masquées.",
      );
      setPending(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Modification impossible. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="adaptation-panel">
      <p className="muted">
        LifeOS propose des repères à partir de votre organisation. Vous
        choisissez les réglages ; aucun apprentissage caché, aucune modification
        automatique de vos tâches ou de vos préférences.
      </p>
      <section className="settings-section">
        <h3>Vos réglages actuels</h3>
        <PreferenceDetails value={preferences} />
        <button
          autoFocus
          className="button primary"
          disabled={busy}
          onClick={editPreferences}
        >
          Modifier mes réglages
        </button>
        <p className="small muted">
          Le mode calme reste un choix de cet appareil et respecte les
          animations réduites du système. Les suivis Vie et les notifications
          Android ont leurs propres réglages.
        </p>
      </section>
      {pending && (
        <section
          className="restore-warning adaptation-confirm"
          ref={confirmationRef}
          tabIndex={-1}
          role="region"
          aria-label="Confirmation du changement"
        >
          <h3>
            {pending.kind === "revision"
              ? "Revenir à ces réglages ?"
              : pending.kind === "history"
                ? "Effacer les anciennes versions ?"
                : pending.kind === "decision"
                  ? "Supprimer cette décision ?"
                  : "Effacer tous les retours ?"}
          </h3>
          {selected && (
            <>
              <p>
                Version du {date(selected.createdAt)} · {selected.reason}
              </p>
              <PreferenceDetails value={selected.preferences} />
              <p>
                Les réglages ci-dessus remplaceront les réglages actifs. Vos
                tâches, vos décisions et vos retours seront conservés. Une
                nouvelle version gardera la trace de cette restauration.
              </p>
            </>
          )}
          {pending.kind === "history" && (
            <p>
              Les anciennes configurations ne seront plus restaurables. Les
              réglages actuels seront conservés dans un nouveau point de départ.
              Exportez d’abord l’organisation si vous voulez garder cet
              historique.
            </p>
          )}
          {pending.kind === "decision" && (
            <p>
              Ce texte sera supprimé de votre carnet. Vos autres données et les
              versions de réglages seront conservées.
            </p>
          )}
          {pending.kind === "feedback" && (
            <p>
              Les retours et leurs instantanés seront supprimés. Les conseils
              écartés pour aujourd’hui pourront revenir ; les types masqués dans
              vos réglages resteront masqués.
            </p>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Garder l’état actuel
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {pending.kind === "revision"
                ? "Confirmer la restauration des réglages"
                : "Confirmer l’effacement"}
            </button>
          </div>
        </section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <section className="settings-section">
        <h3>Vos retours du jour</h3>
        <p>
          « Utile » conserve votre avis. « Pas aujourd’hui » écarte la règle
          pour cette date locale uniquement. Aucun réglage ne change sans votre
          choix.
        </p>
        {!feedbackToday.length && (
          <p className="muted">Aucun retour actif pour aujourd’hui.</p>
        )}
        {feedbackToday.map((item) => (
          <article className="adaptation-entry" key={item.id}>
            <strong>
              {ruleNames[item.ruleId]} ·{" "}
              {item.choice === "useful" ? "Utile" : "Pas aujourd’hui"}
            </strong>
            <p>{item.title}</p>
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await change((previous) =>
                    withdrawFeedback(previous, item.id),
                  );
                  setMessage(
                    "Retour annulé. Sa trace reste dans l’historique.",
                  );
                } catch {
                  setError("Le retour n’a pas pu être annulé.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Annuler ce retour
            </button>
          </article>
        ))}
        <details>
          <summary>Historique des retours · {feedback.length}</summary>
          {[...feedback]
            .reverse()
            .slice(0, feedbackLimit)
            .map((item) => (
              <article key={item.id} className="adaptation-entry">
                <strong>{item.title}</strong>
                <p>
                  {date(item.createdAt)} ·{" "}
                  {item.choice === "useful" ? "Utile" : "Pas aujourd’hui"}
                  {item.withdrawnAt ? " · Annulé" : ""}
                </p>
                <details>
                  <summary>Relire la proposition conservée</summary>
                  <p>{item.body}</p>
                  <p>{item.reason}</p>
                  <ul>
                    {item.evidence.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                  <p>
                    Règle {ruleNames[item.ruleId]}, version {item.ruleVersion} ·
                    date de référence {item.day}.
                  </p>
                </details>
              </article>
            ))}
          {feedback.length > feedbackLimit && (
            <button
              className="text-button"
              onClick={() => setFeedbackLimit((count) => count + 20)}
            >
              Voir les retours précédents
            </button>
          )}
          {feedback.length > 0 && (
            <button
              className="text-button danger"
              disabled={busy}
              onClick={() => ask({ kind: "feedback" })}
            >
              Effacer tous les retours
            </button>
          )}
        </details>
      </section>
      <section className="settings-section">
        <h3>Votre carnet de décisions</h3>
        <p>
          Conservez vos choix et leur raison, puis revenez les relire à la date
          que vous choisissez.
        </p>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => editDecision()}
        >
          Consigner une décision
        </button>
        <label>
          Rechercher une décision
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(10);
            }}
          />
        </label>
        {!found.length && (
          <p className="muted">
            {decisions.length
              ? "Aucune décision ne correspond à cette recherche."
              : "Aucune décision consignée. Vos prochains choix peuvent trouver leur place ici."}
          </p>
        )}
        {found.slice(0, limit).map((item) => (
          <article className="adaptation-entry decision-entry" key={item.id}>
            <button
              className="decision-title"
              disabled={busy}
              onClick={() => editDecision(item)}
            >
              {item.title}
            </button>
            <p className="small">
              Créée le {date(item.createdAt)} ·{" "}
              {item.status === "active" ? "En vigueur" : "Reconsidérée"}
            </p>
            <p className="preserve-lines">{item.choice}</p>
            <details>
              <summary>Contexte et raison</summary>
              <p className="preserve-lines">
                {item.context || "Contexte non renseigné."}
              </p>
              <p className="preserve-lines">
                {item.reason || "Raison non renseignée."}
              </p>
              <p className="small">
                Dernière modification : {date(item.updatedAt)}.
              </p>
            </details>
            {item.reviewDay && (
              <p className="decision-review">
                {item.status === "active" && item.reviewDay <= today
                  ? "À relire"
                  : "Réexamen prévu"}{" "}
                · {item.reviewDay}. Aucun rappel automatique.
              </p>
            )}
            <button
              className="text-button danger"
              disabled={busy}
              onClick={() => ask({ kind: "decision", id: item.id })}
            >
              Supprimer la décision {item.title}
            </button>
          </article>
        ))}
        {found.length > limit && (
          <button
            className="text-button"
            onClick={() => setLimit((count) => count + 20)}
          >
            Voir les décisions précédentes
          </button>
        )}
      </section>
      <section className="settings-section">
        <h3>Versions de vos réglages</h3>
        <p>
          Chaque changement confirmé garde la configuration précédente.
          Restaurer une version en crée une nouvelle ; aucun ancien choix n’est
          réécrit.
        </p>
        {!revisions.length && (
          <p className="muted">
            Réglages de départ. La première modification conservera aussi cette
            configuration.
          </p>
        )}
        {[...revisions]
          .reverse()
          .slice(0, revisionLimit)
          .map((item) => (
            <article key={item.id} className="adaptation-entry">
              <strong>{item.reason}</strong>
              <p>
                {date(item.createdAt)}
                {item.id === data.adaptation.activeRevisionId
                  ? " · Version active"
                  : ""}
                {item.restoredFromId ? " · Restauration" : ""}
              </p>
              <details>
                <summary>Voir cette configuration</summary>
                <PreferenceDetails value={item.preferences} />
              </details>
              <button
                className="text-button"
                disabled={
                  busy || samePreferences(item.preferences, preferences)
                }
                onClick={() => ask({ kind: "revision", id: item.id })}
              >
                {samePreferences(item.preferences, preferences)
                  ? "Réglages déjà appliqués"
                  : "Restaurer cette version"}
              </button>
            </article>
          ))}
        {revisions.length > revisionLimit && (
          <button
            className="text-button"
            onClick={() => setRevisionLimit((count) => count + 20)}
          >
            Voir les versions précédentes
          </button>
        )}
        {revisions.length > 0 && (
          <button
            className="text-button danger"
            disabled={busy}
            onClick={() => ask({ kind: "history" })}
          >
            Effacer les anciennes versions
          </button>
        )}
      </section>
      <p className="small muted">
        Ces informations sont locales et incluses dans la sauvegarde
        d’organisation v7. La recherche générale n’indexe pas les décisions :
        utilisez le champ du carnet. Aucun suivi Vie n’alimente les conseils.
        Les historiques décrivent vos choix ; ils ne constituent pas un journal
        certifié.
      </p>
    </div>
  );
}
