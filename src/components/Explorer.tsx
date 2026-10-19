import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Leaf,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import type { Data, Note } from "../domain/model";
import { addDays } from "../domain/planning";
import { normalizeSearch, pathProgress, resourceText } from "../domain/explore";
import {
  type Resource,
  type LearningPath,
  type LearningEntry,
  resourceKinds,
  resourceStatuses,
} from "../domain/exploreSchema";
export type ExplorerView = "resources" | "learning" | "ideas";
type Props = {
  data: Data;
  today: string;
  busy: boolean;
  view: ExplorerView;
  setView: (view: ExplorerView) => void;
  notes: ReactNode;
  editResource: (resource?: Resource) => void;
  saveResource: (resource: Resource) => Promise<void>;
  deleteResource: (resource: Resource) => void;
  captureIdea: (resource: Resource) => void;
  editNote: (note: Note) => void;
  editPath: (path?: LearningPath) => void;
  deletePath: (path: LearningPath) => void;
  toggleStep: (pathId: string, stepId: string) => Promise<void>;
  log: (pathId: string, stepId: string) => void;
  editEntry: (entry: LearningEntry) => void;
  deleteEntry: (entry: LearningEntry) => void;
};
const dateLabel = (day: string) =>
  new Date(day + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function Explorer(props: Props) {
  const {
    data,
    today,
    busy,
    view,
    setView,
    notes,
    editResource,
    saveResource,
    deleteResource,
    captureIdea,
    editNote,
    editPath,
    deletePath,
    toggleStep,
    log,
    editEntry,
    deleteEntry,
  } = props;
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("");
  const [project, setProject] = useState("all");
  const [favorites, setFavorites] = useState(false);
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [sort, setSort] = useState("recent");
  const [limit, setLimit] = useState(100);
  const [learningQuery, setLearningQuery] = useState("");
  const [pathFilter, setPathFilter] = useState("all");
  const [pathLimit, setPathLimit] = useState(50);
  const [entryLimit, setEntryLimit] = useState(50);
  const filtered = useMemo(
    () =>
      data.resources
        .filter(
          (resource) =>
            normalizeSearch(resourceText(resource)).includes(
              normalizeSearch(query),
            ) &&
            (kind === "all" || resource.kind === kind) &&
            (status === "all" || resource.status === status) &&
            (!tag ||
              resource.tags.some(
                (value) => normalizeSearch(value) === normalizeSearch(tag),
              )) &&
            (project === "all" || resource.projectId === project) &&
            (!favorites || resource.favorite) &&
            (!after ||
              (!!resource.publishedOn && resource.publishedOn >= after)) &&
            (!before ||
              (!!resource.publishedOn && resource.publishedOn <= before)),
        )
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title, "fr")
            : sort === "publication"
              ? (b.publishedOn || "0000").localeCompare(
                  a.publishedOn || "0000",
                ) || b.updatedAt.localeCompare(a.updatedAt)
              : b.updatedAt.localeCompare(a.updatedAt),
        ),
    [
      data.resources,
      query,
      kind,
      status,
      tag,
      project,
      favorites,
      after,
      before,
      sort,
    ],
  );
  useEffect(
    () => setLimit(100),
    [query, kind, status, tag, project, favorites, after, before, sort],
  );
  const paths = data.learningPaths.filter((path) =>
    normalizeSearch(
      path.title +
        " " +
        path.intention +
        " " +
        path.steps.map((step) => step.title).join(" "),
    ).includes(normalizeSearch(learningQuery)),
  );
  const entries = [...data.learningEntries]
    .filter(
      (entry) =>
        pathFilter === "all" ||
        (pathFilter === "detached"
          ? !entry.pathId
          : entry.pathId === pathFilter),
    )
    .sort(
      (a, b) =>
        b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt),
    );
  const weekMinutes = data.learningEntries
    .filter((entry) => entry.day >= addDays(today, -6) && entry.day <= today)
    .reduce((sum, entry) => sum + entry.minutes, 0);
  function updateResource(resource: Resource, patch: Partial<Resource>) {
    void saveResource({
      ...resource,
      ...patch,
      updatedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }
  return (
    <section className="explorer" aria-label="Bibliothèque et apprentissage">
      <div
        className="explorer-tabs"
        role="group"
        aria-label="Rubriques Explorer"
      >
        {(
          [
            { id: "resources", label: "Ressources" },
            { id: "learning", label: "Apprendre" },
            { id: "ideas", label: "Idées" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {view === "resources" && (
        <>
          <div className="explore-intro">
            <div>
              <span className="explore-kicker">
                CONSERVER · RELIER · RETROUVER
              </span>
              <h2>Une bibliothèque qui sert.</h2>
              <p>
                Gardez une source, ce qu’elle vous apporte et l’envie d’y
                revenir.
              </p>
            </div>
            <BookOpen size={48} strokeWidth={1.2} aria-hidden="true" />
          </div>
          <div className="explore-toolbar">
            <label>
              Rechercher une ressource
              <input
                type="search"
                value={query}
                maxLength={180}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titre, source, thème, annotation…"
              />
            </label>
            <label>
              Filtrer les lectures
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">Tous les états</option>
                {Object.entries(resourceStatuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <details className="explore-refine">
              <summary>Affiner la bibliothèque</summary>
              <div className="explore-refine-grid">
                <label>
                  Filtrer les formats
                  <select
                    value={kind}
                    onChange={(event) => setKind(event.target.value)}
                  >
                    <option value="all">Tous les formats</option>
                    {Object.entries(resourceKinds).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Filtrer les thèmes
                  <select
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                  >
                    <option value="">Tous les thèmes</option>
                    {[
                      ...new Set(
                        data.resources.flatMap((resource) => resource.tags),
                      ),
                    ]
                      .sort((a, b) => a.localeCompare(b, "fr"))
                      .map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                  </select>
                </label>
                <label>
                  Projet des ressources
                  <select
                    value={project}
                    onChange={(event) => setProject(event.target.value)}
                  >
                    <option value="all">Tous les projets</option>
                    <option value="">Sans projet</option>
                    {data.projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Trier les ressources
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                  >
                    <option value="recent">Dernières modifications</option>
                    <option value="publication">Publication déclarée</option>
                    <option value="title">Titre</option>
                  </select>
                </label>
                <label>
                  Publié à partir du
                  <input
                    type="date"
                    value={after}
                    onChange={(event) => setAfter(event.target.value)}
                  />
                </label>
                <label>
                  Publié jusqu’au
                  <input
                    type="date"
                    value={before}
                    onChange={(event) => setBefore(event.target.value)}
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={favorites}
                    onChange={(event) => setFavorites(event.target.checked)}
                  />
                  Favoris uniquement
                </label>
                <button
                  className="text-button"
                  onClick={() => {
                    setKind("all");
                    setStatus("all");
                    setTag("");
                    setProject("all");
                    setFavorites(false);
                    setAfter("");
                    setBefore("");
                    setQuery("");
                    setSort("recent");
                  }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
              <p className="muted small">
                Un filtre de publication exclut les fiches sans date. Les dates
                sont déclarées, sans vérification automatique.
              </p>
            </details>
          </div>
          <p className="explore-result-count" role="status">
            {filtered.length} ressource(s) dans cette sélection
          </p>
          <div className="resource-grid">
            {filtered.slice(0, limit).map((resource, index) => (
              <article
                className={`resource-card resource-${resource.kind}`}
                key={resource.id}
              >
                <div className="resource-card-head">
                  <span>
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {resourceKinds[resource.kind]}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`${resource.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} ${resource.title}`}
                    aria-pressed={resource.favorite}
                    disabled={busy}
                    onClick={() =>
                      updateResource(resource, { favorite: !resource.favorite })
                    }
                  >
                    <Star
                      size={17}
                      fill={resource.favorite ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <button
                  className="resource-title"
                  onClick={() => editResource(resource)}
                >
                  {resource.title}
                </button>
                <p className="resource-source">{resource.source}</p>
                <div className="resource-dates">
                  {resource.publishedOn ? (
                    <span>
                      Publication déclarée · {dateLabel(resource.publishedOn)}
                    </span>
                  ) : (
                    <span>Publication non renseignée</span>
                  )}
                  {resource.consultedOn && (
                    <span>
                      Source consultée le {dateLabel(resource.consultedOn)}
                    </span>
                  )}
                </div>
                <p className="resource-summary">
                  {resource.summary ||
                    "Une source conservée, prête à être explorée."}
                </p>
                {resource.tags.length > 0 && (
                  <div className="resource-tags">
                    {resource.tags.map((value) => (
                      <button
                        key={value}
                        onClick={() => setTag(value)}
                        aria-label={`Filtrer le thème ${value}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                )}
                {resource.projectId && (
                  <p className="explore-project">
                    {
                      data.projects.find(
                        (project) => project.id === resource.projectId,
                      )?.name
                    }
                  </p>
                )}
                <div className="resource-source-link">
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      Ouvrir la source <ArrowUpRight size={15} />
                    </a>
                  ) : (
                    <details>
                      <summary>Retrouver la référence</summary>
                      <p>{resource.reference}</p>
                    </details>
                  )}
                </div>
                <div className="resource-controls">
                  <button
                    className={`resource-state ${resource.status}`}
                    disabled={busy}
                    onClick={() =>
                      updateResource(resource, {
                        status: resource.status === "done" ? "saved" : "done",
                        completedAt:
                          resource.status === "done"
                            ? null
                            : new Date().toISOString(),
                      })
                    }
                    aria-label={`${resource.status === "done" ? "Remettre à découvrir" : "Marquer comme consultée"} ${resource.title}`}
                  >
                    {resource.status === "done" && <Check size={13} />}
                    {resourceStatuses[resource.status]}
                  </button>
                  <button
                    className="icon-button delete"
                    aria-label={`Supprimer la ressource ${resource.title}`}
                    onClick={() => deleteResource(resource)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <details className="resource-related">
                  <summary>Idées reliées · {resource.noteIds.length}</summary>
                  {data.notes
                    .filter((note) => resource.noteIds.includes(note.id))
                    .map((note) => (
                      <button
                        key={note.id}
                        className="text-button"
                        onClick={() => editNote(note)}
                      >
                        {note.title} <ArrowRight size={13} />
                      </button>
                    ))}
                  <button
                    className="text-button"
                    onClick={() => captureIdea(resource)}
                  >
                    Capturer une idée depuis cette source <Plus size={13} />
                  </button>
                </details>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <section className="panel explore-empty">
              <Leaf size={31} />
              <h3>
                {data.resources.length
                  ? "Aucune ressource dans cette sélection."
                  : "Une source vaut la peine d’être gardée."}
              </h3>
              <p>
                {data.resources.length
                  ? "Ajustez les filtres pour retrouver vos fiches."
                  : "Un article, un livre, un cours ou une référence : commencez par ce que vous souhaitez retrouver."}
              </p>
              <button className="button primary" onClick={() => editResource()}>
                <Plus size={16} />
                Ajouter une ressource
              </button>
            </section>
          )}
          {filtered.length > limit && (
            <button
              className="add-row"
              onClick={() => setLimit((value) => value + 100)}
            >
              Afficher davantage de ressources
            </button>
          )}
          <p className="source-notice">
            Les fiches et annotations sont disponibles hors ligne. Les pages
            sources restent sur leurs sites ; leur ouverture peut nécessiter une
            connexion.
          </p>
        </>
      )}
      {view === "learning" && (
        <>
          <div className="explore-intro">
            <div>
              <span className="explore-kicker">
                COMPRENDRE · ESSAYER · TRANSMETTRE
              </span>
              <h2>Transformer une envie en pratique.</h2>
              <p>
                Un cap, des étapes, et une trace de ce que vous avez réellement
                appris.
              </p>
            </div>
            <Leaf size={46} strokeWidth={1.2} aria-hidden="true" />
          </div>
          <div className="learning-stats">
            <span>
              <strong>
                {
                  data.learningPaths.filter(
                    (path) =>
                      !path.paused &&
                      pathProgress(path).done < path.steps.length,
                  ).length
                }
              </strong>
              parcours en cours
            </span>
            <span>
              <strong>{weekMinutes} min</strong>déclarées sur les 7 derniers
              jours
            </span>
            <span>
              <strong>{data.learningEntries.length}</strong>séance(s)
              conservée(s)
            </span>
          </div>
          <label className="explore-search">
            Rechercher un parcours
            <input
              type="search"
              maxLength={180}
              value={learningQuery}
              onChange={(event) => {
                setLearningQuery(event.target.value);
                setPathLimit(50);
              }}
            />
          </label>
          <div className="learning-grid">
            {paths.slice(0, pathLimit).map((path) => {
              const progress = pathProgress(path);
              const next = path.steps.find((step) => !step.completedAt);
              return (
                <article className="learning-card" key={path.id}>
                  <div className="section-heading">
                    <span className="explore-kicker">
                      {path.paused
                        ? "EN PAUSE"
                        : progress.done === progress.total
                          ? "ÉTAPES TERMINÉES"
                          : "EN PRATIQUE"}
                    </span>
                    <button
                      className="icon-button delete"
                      aria-label={`Supprimer le parcours ${path.title}`}
                      onClick={() => deletePath(path)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <button
                    className="resource-title"
                    onClick={() => editPath(path)}
                  >
                    {path.title}
                  </button>
                  {path.intention && (
                    <p className="learning-intention">{path.intention}</p>
                  )}
                  {path.targetDay && (
                    <p className="explore-project">
                      Cible · {dateLabel(path.targetDay)}
                    </p>
                  )}
                  {path.projectId && (
                    <p className="explore-project">
                      {
                        data.projects.find(
                          (project) => project.id === path.projectId,
                        )?.name
                      }
                    </p>
                  )}
                  <progress
                    max={100}
                    value={progress.percent}
                    aria-label={`Progression du parcours ${path.title}`}
                  />
                  <p className="learning-progress">
                    {progress.done} / {progress.total} étape(s) terminée(s) ·{" "}
                    {progress.percent} %
                  </p>
                  {next && !path.paused && (
                    <p className="learning-next">
                      Prochaine étape · {next.title}
                    </p>
                  )}
                  <ol className="learning-steps">
                    {path.steps.map((step) => {
                      const resource = data.resources.find(
                        (resource) => resource.id === step.resourceId,
                      );
                      return (
                        <li
                          key={step.id}
                          className={step.completedAt ? "is-done" : ""}
                        >
                          <button
                            className="task-check"
                            disabled={busy}
                            aria-label={`${step.completedAt ? "Rouvrir" : "Terminer"} l’étape ${step.title}`}
                            onClick={() =>
                              void toggleStep(path.id, step.id).catch(
                                () => undefined,
                              )
                            }
                          >
                            {step.completedAt && <Check size={14} />}
                          </button>
                          <div>
                            <strong>{step.title}</strong>
                            {resource && (
                              <button
                                className="learning-source"
                                onClick={() => editResource(resource)}
                              >
                                <BookOpen size={13} />
                                {resource.title}
                              </button>
                            )}
                            <button
                              className="text-button"
                              onClick={() => log(path.id, step.id)}
                            >
                              <Clock3 size={13} />
                              Noter une séance
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  <button
                    className="text-button"
                    onClick={() => editPath(path)}
                  >
                    Modifier le parcours <ArrowRight size={14} />
                  </button>
                </article>
              );
            })}
          </div>
          {!paths.length && (
            <section className="panel explore-empty">
              <BookOpen size={30} />
              <h3>
                {data.learningPaths.length
                  ? "Aucun parcours ne correspond à la recherche."
                  : "Apprendre commence par une première étape."}
              </h3>
              <p>
                Définissez un résultat et des étapes réalisables, avec ou sans
                ressource liée.
              </p>
              <button className="button primary" onClick={() => editPath()}>
                <Plus size={16} />
                Créer un parcours
              </button>
            </section>
          )}
          {paths.length > pathLimit && (
            <button
              className="add-row"
              onClick={() => setPathLimit((value) => value + 50)}
            >
              Afficher davantage de parcours
            </button>
          )}
          <section className="panel learning-history">
            <div className="section-heading">
              <h2>Ce que vous avez pratiqué</h2>
              <label>
                Parcours de l’historique
                <select
                  value={pathFilter}
                  onChange={(event) => {
                    setPathFilter(event.target.value);
                    setEntryLimit(50);
                  }}
                >
                  <option value="all">Tous les parcours</option>
                  <option value="detached">Étapes détachées</option>
                  {data.learningPaths.map((path) => (
                    <option key={path.id} value={path.id}>
                      {path.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {entries.slice(0, entryLimit).map((entry) => (
              <article className="learning-entry" key={entry.id}>
                <div>
                  <span className="explore-kicker">
                    {dateLabel(entry.day)} · {entry.minutes} MIN DÉCLARÉES
                  </span>
                  <button
                    className="learning-entry-title"
                    onClick={() => editEntry(entry)}
                  >
                    {entry.stepTitle}
                  </button>
                  <p>
                    {entry.pathTitle}
                    {!entry.pathId
                      ? " · Étape détachée, historique conservé"
                      : ""}
                  </p>
                  {entry.notes && (
                    <p className="learning-entry-notes">{entry.notes}</p>
                  )}
                </div>
                <button
                  className="icon-button delete"
                  aria-label={`Supprimer la séance d’apprentissage ${entry.stepTitle} du ${entry.day}`}
                  onClick={() => deleteEntry(entry)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
            {!entries.length && (
              <p className="muted small">
                Aucune séance dans cette sélection. Noter une séance conserve sa
                date, sa durée et vos propres observations.
              </p>
            )}
            {entries.length > entryLimit && (
              <button
                className="add-row"
                onClick={() => setEntryLimit((value) => value + 50)}
              >
                Afficher davantage de séances
              </button>
            )}
          </section>
        </>
      )}
      {view === "ideas" && notes}
      <p className="explore-provenance">
        Aucune information en temps réel n’est collectée. Les actualités
        éventuelles sont des fiches datées et sourcées que vous enregistrez
        vous-même.
      </p>
    </section>
  );
}
