import { useState, type FormEvent } from "react";
import {
  decisionSchema,
  preferencesSchema,
  ruleNames,
  type Decision,
  type Preferences,
} from "../domain/adaptationSchema";
export const orderLabel = (value: Preferences["taskOrder"]) =>
  value === "priority" ? "Priorité, puis échéance" : "Échéance, puis priorité";

export function PreferencesForm({
  value,
  save,
  close,
}: {
  value: Preferences;
  save: (value: Preferences, reason: string) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fields = new FormData(event.currentTarget);
    const next = preferencesSchema.safeParse({
      priorityCount: Number(fields.get("priorityCount")),
      taskOrder: fields.get("taskOrder"),
      suggestions: fields.has("suggestions"),
      mutedRules: fields.getAll("mutedRules"),
    });
    if (!next.success) {
      setError("Vérifiez vos réglages.");
      return;
    }
    setBusy(true);
    try {
      await save(next.data, String(fields.get("reason")));
      close();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Réglages non enregistrés.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form adaptation-preferences" onSubmit={submit}>
      <p className="muted">
        Ces choix s’appliquent au briefing, au mode concentration et aux
        conseils. Ils ne changent ni les tâches ni les dates enregistrées.
      </p>
      <label>
        Nombre de priorités affichées
        <select
          autoFocus
          name="priorityCount"
          defaultValue={value.priorityCount}
        >
          {[1, 2, 3, 4, 5].map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? "priorité" : "priorités"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ordre des priorités
        <select name="taskOrder" defaultValue={value.taskOrder}>
          <option value="priority">Priorité, puis échéance</option>
          <option value="due">Échéance, puis priorité</option>
        </select>
      </label>
      <p className="small muted">
        Seules les tâches disponibles sont proposées : échéance atteinte,
        créneau passé/du jour, ou absence de date. Les tâches uniquement futures
        restent dans l’agenda. À égalité, la date de création puis l’identifiant
        départagent les tâches.
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          name="suggestions"
          defaultChecked={value.suggestions}
        />
        Afficher les conseils locaux
      </label>
      <fieldset className="schedule-fields">
        <legend>Types de conseils à masquer</legend>
        {Object.entries(ruleNames).map(([id, name]) => (
          <label className="check-label" key={id}>
            <input
              type="checkbox"
              name="mutedRules"
              value={id}
              defaultChecked={value.mutedRules.includes(
                id as keyof typeof ruleNames,
              )}
            />
            {name}
          </label>
        ))}
      </fieldset>
      <p className="small muted">
        Un type masqué ne revient qu’après votre modification. « Pas aujourd’hui
        » masque seulement la règle pour la date locale du jour. Aucun retour ne
        modifie ces réglages automatiquement.
      </p>
      <label>
        Pourquoi ce changement ?
        <textarea
          name="reason"
          required
          maxLength={1000}
          rows={3}
          placeholder="Par exemple : garder une seule priorité pendant une semaine chargée."
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={close}
        >
          Annuler
        </button>
        <button className="button primary" disabled={busy}>
          Appliquer mes réglages
        </button>
      </div>
    </form>
  );
}
export function DecisionForm({
  decision,
  save,
  close,
}: {
  decision?: Decision;
  save: (value: Decision) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const value = decisionSchema.safeParse({
      id: decision?.id ?? crypto.randomUUID(),
      title: fields.get("title"),
      choice: fields.get("choice"),
      context: fields.get("context"),
      reason: fields.get("reason"),
      reviewDay: fields.get("reviewDay"),
      status: fields.get("status"),
      createdAt: decision?.createdAt ?? now,
      updatedAt: now,
    });
    if (!value.success) {
      setError(
        "Ajoutez un titre, une décision et une date valide si renseignée.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await save(value.data);
      close();
    } catch {
      setError(
        "La décision n’a pas pu être enregistrée. Votre saisie est conservée.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <p className="muted">
        Gardez votre choix, son contexte et sa raison pour pouvoir le relire.
        Cette note ne déclenche aucune action ni rappel.
      </p>
      <label>
        Titre de la décision
        <input
          autoFocus
          name="title"
          required
          maxLength={180}
          defaultValue={decision?.title}
        />
      </label>
      <label>
        Mon choix
        <textarea
          name="choice"
          required
          maxLength={10000}
          rows={3}
          defaultValue={decision?.choice}
        />
      </label>
      <label>
        Contexte
        <textarea
          name="context"
          maxLength={10000}
          rows={3}
          defaultValue={decision?.context}
        />
      </label>
      <label>
        Raison du choix
        <textarea
          name="reason"
          maxLength={10000}
          rows={3}
          defaultValue={decision?.reason}
        />
      </label>
      <label>
        Date de réexamen facultative
        <input
          type="date"
          name="reviewDay"
          defaultValue={decision?.reviewDay}
        />
      </label>
      <label>
        État de la décision
        <select name="status" defaultValue={decision?.status ?? "active"}>
          <option value="active">En vigueur</option>
          <option value="reconsidered">Reconsidérée</option>
        </select>
      </label>
      {decision && (
        <p className="small muted">
          La modification remplace le texte de cette décision. Pour conserver
          deux choix successifs, créez une nouvelle décision et marquez
          l’ancienne reconsidérée.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={close}
        >
          Annuler
        </button>
        <button className="button primary" disabled={busy}>
          Enregistrer la décision
        </button>
      </div>
    </form>
  );
}
