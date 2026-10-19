import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import type { Data } from "../domain/model";
import {
  duplicateResource,
  makeLearningEntry,
  normalizeSearch,
} from "../domain/explore";
import {
  type Resource,
  type LearningPath,
  type LearningEntry,
  resourceKinds,
  resourceStatuses,
  resourceSchema,
  learningPathSchema,
  learningEntrySchema,
} from "../domain/exploreSchema";

function useSave<T>(save: (value: T) => Promise<void>, close: () => void) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function run(parse: () => T) {
    setError("");
    setSaving(true);
    try {
      await save(parse());
      close();
    } catch (error) {
      setError(
        error instanceof z.ZodError
          ? (error.issues.find((issue) => issue.code === "custom")?.message ??
              "Vérifiez les champs du formulaire.")
          : error instanceof Error
            ? error.message
            : "Enregistrement impossible. Réessayez.",
      );
    } finally {
      setSaving(false);
    }
  }
  return { error, saving, run };
}
function Actions({
  state,
  label,
  close,
}: {
  state: { error: string; saving: boolean };
  label: string;
  close: () => void;
}) {
  return (
    <>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button secondary"
          disabled={state.saving}
          onClick={close}
        >
          Annuler
        </button>
        <button className="button primary" disabled={state.saving}>
          {state.saving ? "Enregistrement…" : label}
        </button>
      </div>
    </>
  );
}
export function ResourceForm({
  resource,
  data,
  today,
  save,
  close,
}: {
  resource?: Resource;
  data: Data;
  today: string;
  save: (resource: Resource) => Promise<void>;
  close: () => void;
}) {
  const state = useSave(save, close);
  const [kind, setKind] = useState<Resource["kind"]>(
    resource?.kind ?? "article",
  );
  const [url, setUrl] = useState(resource?.url ?? "");
  const [selected, setSelected] = useState(resource?.noteIds ?? []);
  const [query, setQuery] = useState("");
  const duplicate = duplicateResource(data.resources, url, resource?.id);
  const notes = data.notes.filter((note) =>
    normalizeSearch(note.title + " " + note.body).includes(
      normalizeSearch(query),
    ),
  );
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        void state.run(() => {
          const status = fields.get("status") as Resource["status"];
          const publishedOn = String(fields.get("publishedOn"));
          const consultedOn = String(fields.get("consultedOn"));
          if (publishedOn > today || consultedOn > today)
            throw new Error(
              "Les dates de publication et de consultation ne peuvent pas être futures.",
            );
          return resourceSchema.parse({
            id: resource?.id ?? crypto.randomUUID(),
            title: fields.get("title"),
            kind,
            source: fields.get("source"),
            url: url.trim(),
            reference: fields.get("reference"),
            publishedOn,
            consultedOn,
            summary: fields.get("summary"),
            tags: [
              ...new Map(
                String(fields.get("tags"))
                  .split(/[,;]/)
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => [tag.toLocaleLowerCase("fr"), tag]),
              ).values(),
            ],
            status,
            completedAt:
              status === "done"
                ? (resource?.completedAt ?? new Date().toISOString())
                : null,
            favorite: fields.has("favorite"),
            projectId: fields.get("projectId"),
            noteIds: selected,
            createdAt: resource?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
      }}
    >
      <label>
        Titre de la ressource
        <input
          name="title"
          required
          maxLength={180}
          defaultValue={resource?.title}
          placeholder="Ce que vous souhaitez retrouver"
        />
      </label>
      <div className="form-grid">
        <label>
          Format
          <select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as Resource["kind"])
            }
          >
            {Object.entries(resourceKinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          État de lecture
          <select name="status" defaultValue={resource?.status ?? "saved"}>
            {Object.entries(resourceStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="schedule-fields">
        <legend>Retrouver la source</legend>
        <label>
          Auteur ou organisme source
          <input
            name="source"
            required
            maxLength={180}
            defaultValue={resource?.source}
            placeholder="Nom de l’auteur, éditeur, organisme…"
          />
        </label>
        <label>
          Lien de la source
          <input
            type="url"
            maxLength={2000}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
          />
        </label>
        {duplicate && (
          <p className="planning-warning" role="status">
            Ce lien est déjà associé à « {duplicate.title} ». Vous pouvez
            conserver une fiche distincte si elle vous est utile.
          </p>
        )}
        <label>
          Référence hors ligne
          <textarea
            name="reference"
            maxLength={10000}
            rows={2}
            defaultValue={resource?.reference}
            placeholder="Titre, édition, page, référence de fichier… Nécessaire sans lien."
          />
        </label>
        <div className="form-grid">
          <label>
            Publié le{kind === "news" ? " (obligatoire)" : " (facultatif)"}
            <input
              type="date"
              name="publishedOn"
              required={kind === "news"}
              max={today}
              defaultValue={resource?.publishedOn}
            />
          </label>
          <label>
            Source consultée le (facultatif)
            <input
              type="date"
              name="consultedOn"
              max={today}
              defaultValue={resource?.consultedOn}
            />
          </label>
        </div>
        <p className="muted small">
          Métadonnées saisies par vous. Aucun contenu n’est téléchargé ni
          vérifié automatiquement. Une actualité exige sa date de publication
          déclarée.
        </p>
      </fieldset>
      <label>
        Ce que je retiens
        <textarea
          name="summary"
          rows={4}
          maxLength={10000}
          defaultValue={resource?.summary}
          placeholder="Une idée utile, une question, une limite de la source…"
        />
      </label>
      <label>
        Thèmes (séparés par une virgule)
        <input
          name="tags"
          maxLength={500}
          defaultValue={resource?.tags.join(", ")}
          placeholder="10 thèmes au maximum, 32 caractères chacun"
        />
      </label>
      <label>
        Projet associé
        <select name="projectId" defaultValue={resource?.projectId ?? ""}>
          <option value="">Sans projet</option>
          {data.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          name="favorite"
          defaultChecked={resource?.favorite}
        />
        Garder parmi mes favoris
      </label>
      {data.notes.length > 0 && (
        <details className="explore-note-picker">
          <summary>
            Relier des idées · {selected.length} sélectionnée(s)
          </summary>
          <label>
            Rechercher une idée à relier
            <input
              type="search"
              maxLength={180}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="goal-task-picker">
            {notes.slice(0, 100).map((note) => (
              <label className="check-label" key={note.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(note.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, note.id]
                        : current.filter((id) => id !== note.id),
                    )
                  }
                />
                {note.title}
              </label>
            ))}
          </div>
          {notes.length > 100 && (
            <p className="muted small">
              Précisez la recherche pour voir les autres idées.
            </p>
          )}
        </details>
      )}
      <Actions state={state} label="Enregistrer la ressource" close={close} />
    </form>
  );
}
export function LearningPathForm({
  path,
  data,
  save,
  close,
}: {
  path?: LearningPath;
  data: Data;
  save: (path: LearningPath) => Promise<void>;
  close: () => void;
}) {
  const state = useSave(save, close);
  const [steps, setSteps] = useState(
    () =>
      path?.steps ?? [
        {
          id: crypto.randomUUID(),
          title: "",
          resourceId: "",
          completedAt: null,
        },
      ],
  );
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        void state.run(() =>
          learningPathSchema.parse({
            id: path?.id ?? crypto.randomUUID(),
            title: fields.get("title"),
            intention: fields.get("intention"),
            projectId: fields.get("projectId"),
            targetDay: fields.get("targetDay"),
            paused: fields.has("paused"),
            steps: steps.map((step) => ({
              ...step,
              title: fields.get(`title-${step.id}`),
              resourceId: fields.get(`resource-${step.id}`),
            })),
            createdAt: path?.createdAt ?? new Date().toISOString(),
          }),
        );
      }}
    >
      <label>
        Nom du parcours
        <input
          name="title"
          required
          maxLength={180}
          defaultValue={path?.title}
          placeholder="Ce que vous voulez apprendre"
        />
      </label>
      <label>
        À quoi cela me servira
        <textarea
          name="intention"
          maxLength={10000}
          rows={3}
          defaultValue={path?.intention}
        />
      </label>
      <div className="form-grid">
        <label>
          Date cible (facultative)
          <input type="date" name="targetDay" defaultValue={path?.targetDay} />
        </label>
        <label>
          Projet du parcours
          <select name="projectId" defaultValue={path?.projectId ?? ""}>
            <option value="">Sans projet</option>
            {data.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="schedule-fields">
        <legend>Étapes concrètes</legend>
        {steps.map((step, index) => (
          <div className="explore-step-fields" key={step.id}>
            <label>
              Étape {index + 1}
              <input
                name={`title-${step.id}`}
                required
                maxLength={180}
                defaultValue={step.title}
                placeholder="Lire, essayer, expliquer ou réaliser…"
              />
            </label>
            <label>
              Ressource de l’étape {index + 1}
              <select
                name={`resource-${step.id}`}
                defaultValue={step.resourceId}
              >
                <option value="">Sans ressource liée</option>
                {data.resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              data-dirties
              className="text-button"
              disabled={steps.length <= 1}
              onClick={() =>
                setSteps((current) =>
                  current.filter((item) => item.id !== step.id),
                )
              }
            >
              <Trash2 size={14} />
              Retirer l’étape {index + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          data-dirties
          className="text-button"
          disabled={steps.length >= 200}
          onClick={() =>
            setSteps((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                title: "",
                resourceId: "",
                completedAt: null,
              },
            ])
          }
        >
          <Plus size={14} />
          Ajouter une étape
        </button>
        <p className="muted small">
          Terminer une ressource ne coche pas une étape à votre place. Retirer
          une étape conserve les séances déjà enregistrées dans l’historique.
        </p>
      </fieldset>
      <label className="check-label">
        <input type="checkbox" name="paused" defaultChecked={path?.paused} />
        Mettre le parcours en pause
      </label>
      <Actions state={state} label="Enregistrer le parcours" close={close} />
    </form>
  );
}
export function LearningEntryForm({
  data,
  entry,
  pathId,
  stepId,
  today,
  save,
  close,
}: {
  data: Data;
  entry?: LearningEntry;
  pathId?: string;
  stepId?: string;
  today: string;
  save: (entry: LearningEntry) => Promise<void>;
  close: () => void;
}) {
  const state = useSave(save, close);
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        void state.run(() => {
          const day = String(fields.get("day"));
          if (day > today)
            throw new Error(
              "Une séance future ne peut pas être enregistrée comme réalisée.",
            );
          if (entry)
            return learningEntrySchema.parse({
              ...entry,
              day,
              minutes: Number(fields.get("minutes")),
              notes: fields.get("notes"),
            });
          const path = data.learningPaths.find((item) => item.id === pathId);
          if (!path) throw new Error("Ce parcours n’existe plus.");
          return makeLearningEntry(
            path,
            stepId ?? "",
            day,
            Number(fields.get("minutes")),
            String(fields.get("notes")),
            today,
          );
        });
      }}
    >
      <p className="explore-form-context">
        {entry?.pathTitle ??
          data.learningPaths.find((path) => path.id === pathId)?.title}
        <br />
        <strong>
          {entry?.stepTitle ??
            data.learningPaths
              .find((path) => path.id === pathId)
              ?.steps.find((step) => step.id === stepId)?.title}
        </strong>
      </p>
      <div className="form-grid">
        <label>
          Jour de la séance
          <input
            name="day"
            type="date"
            max={today}
            required
            defaultValue={entry?.day ?? today}
          />
        </label>
        <label>
          Temps réellement consacré (minutes)
          <input
            name="minutes"
            type="number"
            min={1}
            max={720}
            required
            defaultValue={entry?.minutes ?? 20}
          />
        </label>
      </div>
      <label>
        Ce que j’ai appris ou essayé
        <textarea
          name="notes"
          rows={4}
          maxLength={10000}
          defaultValue={entry?.notes}
        />
      </label>
      <p className="muted small">
        Le temps est déclaré, sans chronomètre automatique. L’enregistrement ne
        termine pas l’étape : vous gardez ce choix dans le parcours.
      </p>
      <Actions
        state={state}
        label="Enregistrer la séance d’apprentissage"
        close={close}
      />
    </form>
  );
}
