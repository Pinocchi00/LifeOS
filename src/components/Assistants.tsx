import { useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  FileText,
  GitPullRequest,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  assistantNames,
  missionPrompt,
  missionSchema,
  missionStatusNames,
  safeEvidenceUrl,
  usageSchema,
  type Assistant,
  type Mission,
  type Usage,
} from "../domain/assistants";
import { localDay, type Data, type Project } from "../domain/model";

export function MissionForm({
  mission,
  projects,
  save,
  close,
}: {
  mission?: Mission;
  projects: Project[];
  save: (value: Mission) => Promise<void>;
  close: () => void;
}) {
  const [status, setStatus] = useState<Mission["status"]>(
    mission?.status ?? "todo",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const body = String(fields.get("report") ?? "").trim();
    const evidence = String(fields.get("evidence") ?? "").trim();
    if (evidence && !body) {
      setError("Ajoutez le compte-rendu correspondant à ces preuves.");
      return;
    }
    if (status === "done" && fields.get("verified") !== "on") {
      setError("Vérifiez les critères et confirmez la validation.");
      return;
    }
    const result = missionSchema.safeParse({
      id: mission?.id ?? crypto.randomUUID(),
      title: fields.get("title"),
      assistant: fields.get("assistant"),
      projectId: fields.get("projectId"),
      objective: fields.get("objective"),
      criteria: fields.get("criteria"),
      files: fields.get("files"),
      due: fields.get("due"),
      status,
      createdAt: mission?.createdAt ?? now,
      updatedAt: now,
      validatedAt: status === "done" ? now : null,
      reports: [
        ...(mission?.reports ?? []),
        ...(body
          ? [{ id: crypto.randomUUID(), body, evidence, createdAt: now }]
          : []),
      ],
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      await save(result.data);
      close();
    } catch {
      setError("La mission n’a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="form mission-form" onSubmit={submit}>
      <p className="manual-note">
        Gestion manuelle. Ces instructions ne sont pas envoyées à un assistant.
      </p>
      <label>
        Titre de la mission
        <input
          autoFocus
          name="title"
          required
          maxLength={180}
          defaultValue={mission?.title}
          placeholder="Un résultat concret à obtenir"
        />
      </label>
      <div className="form-grid">
        <label>
          Assistant
          <select
            aria-label="Assistant"
            name="assistant"
            defaultValue={mission?.assistant ?? "chatgpt"}
          >
            {Object.entries(assistantNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Projet de la mission
          <select
            aria-label="Projet de la mission"
            name="projectId"
            defaultValue={mission?.projectId ?? ""}
          >
            <option value="">Sans projet</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Objectif
        <textarea
          name="objective"
          required
          maxLength={10000}
          rows={3}
          defaultValue={mission?.objective}
          placeholder="Quel problème faut-il résoudre ?"
        />
      </label>
      <label>
        Critères de réussite
        <textarea
          name="criteria"
          required
          maxLength={10000}
          rows={3}
          defaultValue={mission?.criteria}
          placeholder="Une condition vérifiable par ligne"
        />
      </label>
      <label>
        Fichiers concernés
        <textarea
          name="files"
          maxLength={10000}
          rows={2}
          defaultValue={mission?.files}
          placeholder="Chemins ou documents à fournir à l’assistant"
        />
      </label>
      <div className="form-grid">
        <label>
          Échéance de la mission
          <input type="date" name="due" defaultValue={mission?.due ?? ""} />
        </label>
        <label>
          Statut de la mission
          <select
            aria-label="Statut de la mission"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as Mission["status"])
            }
          >
            {Object.entries(missionStatusNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="report-entry">
        <h3>Ajouter un compte-rendu</h3>
        <p className="muted">
          Collez un résultat réellement obtenu. Les comptes-rendus précédents
          sont conservés.
        </p>
        <label>
          Nouveau compte-rendu
          <textarea
            name="report"
            rows={4}
            maxLength={10000}
            placeholder="Travail effectué, vérifications, difficultés, limites…"
          />
        </label>
        <label>
          Preuves et références
          <textarea
            name="evidence"
            rows={2}
            maxLength={10000}
            placeholder="Liens http(s), noms de fichiers ou observations vérifiables, une référence par ligne"
          />
        </label>
      </div>
      {status === "done" && (
        <label className="verification-check">
          <input type="checkbox" name="verified" required />
          <span>
            J’ai vérifié les critères de réussite et le compte-rendu. Je valide
            cette mission.
          </span>
        </label>
      )}
      {mission?.reports.length ? (
        <section className="report-history">
          <h3>Historique des comptes-rendus</h3>
          {[...mission.reports].reverse().map((report) => (
            <article key={report.id}>
              <span className="small muted">
                Saisi le {new Date(report.createdAt).toLocaleString("fr-FR")}
              </span>
              <p>{report.body}</p>
              {report.evidence && (
                <ul>
                  {report.evidence
                    .split("\n")
                    .filter(Boolean)
                    .map((item, index) => {
                      const url = safeEvidenceUrl(item.trim());
                      return (
                        <li key={index}>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {item}
                            </a>
                          ) : (
                            item
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </article>
          ))}
        </section>
      ) : null}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button secondary" type="button" onClick={close}>
          Annuler
        </button>
        <button className="button primary" disabled={saving}>
          Enregistrer la mission
        </button>
      </div>
    </form>
  );
}

export function UsageForm({
  assistant,
  usage,
  save,
  close,
}: {
  assistant: Assistant;
  usage?: Usage;
  save: (value: Usage) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const localReset = usage?.resetAt
    ? new Date(
        new Date(usage.resetAt).getTime() -
          new Date(usage.resetAt).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const reset = String(fields.get("resetAt"));
    const result = usageSchema.safeParse({
      assistant,
      label: fields.get("label"),
      used: Number(fields.get("used")),
      limit: fields.get("limit") === "" ? null : Number(fields.get("limit")),
      resetAt: reset ? new Date(reset).toISOString() : null,
      note: fields.get("note"),
      updatedAt: new Date().toISOString(),
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      await save(result.data);
      close();
    } catch {
      setError("Le compteur n’a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <p className="manual-note">
        Compteur personnel pour {assistantNames[assistant]}. Il ne lit pas votre
        abonnement et ne se réinitialise pas automatiquement.
      </p>
      <label>
        Nom de la limite
        <input
          name="label"
          autoFocus
          required
          maxLength={180}
          defaultValue={usage?.label ?? "Messages · période personnelle"}
        />
      </label>
      <div className="form-grid">
        <label>
          Usage relevé
          <input
            name="used"
            type="number"
            min={0}
            max={1000000}
            step={1}
            required
            defaultValue={usage?.used ?? 0}
          />
        </label>
        <label>
          Plafond connu
          <input
            name="limit"
            type="number"
            min={1}
            max={1000000}
            step={1}
            defaultValue={usage?.limit ?? ""}
            placeholder="Laisser vide si inconnu"
          />
        </label>
      </div>
      <label>
        Prochaine remise à zéro prévue
        <input name="resetAt" type="datetime-local" defaultValue={localReset} />
      </label>
      <label>
        Notes sur le compteur
        <textarea
          name="note"
          rows={3}
          maxLength={10000}
          defaultValue={usage?.note ?? ""}
          placeholder="Modèle concerné, période, informations affichées par le fournisseur…"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button secondary" type="button" onClick={close}>
          Annuler
        </button>
        <button className="button primary" disabled={saving}>
          Enregistrer le compteur
        </button>
      </div>
    </form>
  );
}

export function MissionInstructions({
  mission,
  project,
  githubReferences = [],
}: {
  mission: Mission;
  project?: Project;
  githubReferences?: string[];
}) {
  const [notice, setNotice] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const prompt =
    missionPrompt(mission, project?.name) +
    (githubReferences.length
      ? "\n\nRÉFÉRENCES GITHUB À VÉRIFIER\n" +
        githubReferences.join("\n") +
        "\nCes liens ne constituent pas une validation ni une preuve d’exécution. Consulter les sources et vérifier les critères."
      : "");
  return (
    <div className="form">
      <p className="muted">
        Copiez ce texte dans {assistantNames[mission.assistant]} et joignez les
        fichiers nécessaires. LifeOS ne transmet rien automatiquement.
      </p>
      <label>
        Instructions préparées
        <textarea ref={ref} readOnly value={prompt} rows={14} />
      </label>
      <button
        className="button primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(prompt);
            setNotice("Instructions copiées.");
          } catch {
            ref.current?.focus();
            ref.current?.select();
            setNotice(
              "Copie non autorisée par le navigateur. Le texte est sélectionné : utilisez Ctrl+C ou Copier.",
            );
          }
        }}
      >
        <ClipboardCopy size={16} />
        Copier les instructions
      </button>
      {notice && (
        <p className="copy-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}

export function AssistantsCenter({
  data,
  edit,
  instructions,
  github,
  ai,
  remove,
  editUsage,
}: {
  data: Data;
  edit: (mission?: Mission) => void;
  instructions: (mission: Mission) => void;
  github: (mission: Mission) => void;
  ai: (mission: Mission) => void;
  remove: (mission: Mission) => void;
  editUsage: (assistant: Assistant) => void;
}) {
  const [assistant, setAssistant] = useState("all");
  const [status, setStatus] = useState("all");
  const [project, setProject] = useState("all");
  const visible = [...data.missions]
    .filter(
      (mission) =>
        (assistant === "all" || mission.assistant === assistant) &&
        (status === "all" || mission.status === status) &&
        (project === "all" || mission.projectId === project),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="assistants-center">
      <div className="assistants-intro">
        <span className="small">ATELIER / DEUX ASSISTANTS, UN CAP</span>
        <p>Définir. Transmettre. Vérifier.</p>
        <span className="manual-tag">
          Validation manuelle · API facultative
        </span>
      </div>
      <section aria-label="Limites des assistants" className="usage-grid">
        {(["chatgpt", "claude"] as const).map((key) => {
          const usage = data.usage.find((item) => item.assistant === key);
          const expired =
            usage?.resetAt && new Date(usage.resetAt).getTime() < Date.now();
          return (
            <article key={key} className={`usage-card ${key}`}>
              <div className="between">
                <h2>{assistantNames[key]}</h2>
                <button
                  className="icon-button"
                  aria-label={`Régler le compteur ${assistantNames[key]}`}
                  onClick={() => editUsage(key)}
                >
                  <Settings2 size={19} />
                </button>
              </div>
              {usage ? (
                <>
                  <p className="usage-label">{usage.label}</p>
                  <strong className="usage-number">
                    {usage.used}
                    <small> / {usage.limit ?? "plafond inconnu"}</small>
                  </strong>
                  {usage.limit && (
                    <progress
                      aria-label={`Usage ${assistantNames[key]}`}
                      value={Math.min(usage.used, usage.limit)}
                      max={usage.limit}
                    />
                  )}
                  <p className="small muted">
                    {usage.limit === null
                      ? "Aucun nombre restant calculé."
                      : `${Math.max(0, usage.limit - usage.used)} restant(s) selon votre saisie${usage.used > usage.limit ? " · plafond dépassé" : ""}`}
                  </p>
                  {usage.resetAt && (
                    <p className={`small ${expired ? "overdue" : "muted"}`}>
                      {expired
                        ? "Échéance passée · vérifiez le compteur"
                        : "Remise à zéro prévue"}{" "}
                      · {new Date(usage.resetAt).toLocaleString("fr-FR")}
                    </p>
                  )}
                  <p className="small muted">
                    Relevé le{" "}
                    {new Date(usage.updatedAt).toLocaleString("fr-FR")}
                  </p>
                </>
              ) : (
                <>
                  <p className="muted">Aucune limite renseignée.</p>
                  <button
                    className="text-button"
                    onClick={() => editUsage(key)}
                  >
                    Renseigner mon compteur
                    <ArrowRight size={14} />
                  </button>
                </>
              )}
            </article>
          );
        })}
      </section>
      <div className="section-heading project-section-heading">
        <h2>
          Missions <span className="count">{data.missions.length}</span>
        </h2>
        <button className="button secondary" onClick={() => edit()}>
          <Plus size={15} />
          Créer une mission
        </button>
      </div>
      <div className="mission-filters">
        <label>
          Assistant
          <select
            aria-label="Filtrer par assistant"
            value={assistant}
            onChange={(event) => setAssistant(event.target.value)}
          >
            <option value="all">Tous</option>
            {Object.entries(assistantNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Statut
          <select
            aria-label="Filtrer les missions par statut"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Tous</option>
            {Object.entries(missionStatusNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Projet
          <select
            aria-label="Filtrer les missions par projet"
            value={project}
            onChange={(event) => setProject(event.target.value)}
          >
            <option value="all">Tous</option>
            <option value="">Sans projet</option>
            {data.projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {visible.length ? (
        <div className="mission-grid">
          {visible.map((mission) => (
            <article key={mission.id} className="mission-card">
              <div className="between">
                <span className={`assistant-tag ${mission.assistant}`}>
                  {assistantNames[mission.assistant]}
                </span>
                <span className={`mission-status ${mission.status}`}>
                  {missionStatusNames[mission.status]}
                </span>
              </div>
              <button
                className="mission-title"
                aria-label={`Modifier la mission ${mission.title}`}
                onClick={() => edit(mission)}
              >
                {mission.title}
              </button>
              <p>{mission.objective}</p>
              <div className="mission-meta">
                <span>
                  {data.projects.find(
                    (project) => project.id === mission.projectId,
                  )?.name ?? "Sans projet"}
                </span>
                <span>
                  {mission.due
                    ? new Date(mission.due + "T12:00:00").toLocaleDateString(
                        "fr-FR",
                      )
                    : "Sans échéance"}
                </span>
              </div>
              <div className="mission-report-count">
                <FileText size={14} />
                {mission.reports.length} compte-rendu(s)
                {mission.validatedAt && (
                  <span>
                    <Check size={13} />
                    Validée
                  </span>
                )}
              </div>
              <div className="mission-github">
                <button
                  className="text-button"
                  aria-label={`GitHub pour ${mission.title}`}
                  onClick={() => github(mission)}
                >
                  <GitPullRequest size={15} />
                  Références GitHub ·{" "}
                  {
                    data.githubLinks.filter(
                      (link) => link.missionId === mission.id,
                    ).length
                  }
                </button>
              </div>
              {mission.assistant === "chatgpt" && (
                <button
                  className="text-button"
                  aria-label={`API OpenAI pour ${mission.title}`}
                  onClick={() => ai(mission)}
                >
                  Préparer une demande API
                </button>
              )}
              <div className="between mission-actions">
                <button
                  className="text-button"
                  aria-label={`Instructions pour ${mission.title}`}
                  onClick={() => instructions(mission)}
                >
                  <ClipboardCopy size={14} />
                  Instructions
                </button>
                <button
                  className="icon-button"
                  aria-label={`Supprimer la mission ${mission.title}`}
                  onClick={() => remove(mission)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel empty">
          <FileText size={28} />
          <strong>
            {data.missions.length
              ? "Aucune mission pour ces filtres."
              : "Donnez une intention à vos assistants."}
          </strong>
          <p>
            {data.missions.length
              ? "Modifiez les filtres pour retrouver vos missions."
              : "Créez une mission, copiez ses instructions, puis conservez le résultat et vos vérifications ici."}
          </p>
          {!data.missions.length && (
            <button className="text-button" onClick={() => edit()}>
              Créer ma première mission
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AssistantOverview({
  data,
  evening,
  open,
}: {
  data: Data;
  evening: boolean;
  open: () => void;
}) {
  const pending = data.missions.filter((mission) => mission.status !== "done");
  const reports = data.missions.flatMap((mission) =>
    mission.reports
      .filter((report) => localDay(new Date(report.createdAt)) === localDay())
      .map((report) => ({ mission, report })),
  );
  return (
    <section className="panel assistant-overview">
      <div className="section-heading">
        <h2>
          {evening ? "Comptes-rendus du jour" : "Vos assistants, en mouvement"}
        </h2>
        <button className="text-button" onClick={open}>
          Ouvrir les missions
          <ArrowRight size={15} />
        </button>
      </div>
      <p className="muted">
        {evening
          ? `${reports.length} compte-rendu(s) saisi(s) aujourd’hui.`
          : `${pending.length} mission(s) ouverte(s), dont ${pending.filter((mission) => mission.status === "review").length} à vérifier et ${pending.filter((mission) => mission.status === "blocked").length} bloquée(s).`}
      </p>
      {evening &&
        reports.slice(0, 3).map(({ mission, report }) => (
          <button key={report.id} className="report-summary" onClick={open}>
            <span>
              {assistantNames[mission.assistant]} · {mission.title}
            </span>
            <small>{report.body.slice(0, 160)}</small>
          </button>
        ))}
      <span className="small muted">
        Données saisies dans LifeOS · aucune activité distante observée.
      </span>
    </section>
  );
}
