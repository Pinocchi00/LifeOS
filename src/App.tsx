import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FolderKanban,
  Heart,
  House,
  Leaf,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import {
  briefing,
  localDay,
  parseBackup,
  priorityNames,
  removeProject,
  serializeBackup,
  sortedTasks,
  type Data,
  type Note,
  type Project,
  type Task,
} from "./domain/model";
import { useLifeOS } from "./storage/useLifeOS";

type Space = "home" | "agenda" | "projects" | "life" | "explore";
type Editor =
  | { type: "task"; value?: Task; due?: string }
  | { type: "project"; value?: Project }
  | { type: "note"; value?: Note }
  | { type: "backup" }
  | { type: "search" }
  | { type: "assistants" }
  | null;
const navigation = [
  { id: "home", label: "Accueil", icon: House },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "projects", label: "Projets", icon: FolderKanban },
  { id: "life", label: "Vie", icon: Heart },
  { id: "explore", label: "Explorer", icon: BookOpen },
] as const;
const dateLabel = (
  day: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) => new Date(day + "T12:00:00").toLocaleDateString("fr-FR", options);

function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={close}
      onClick={(event) => {
        if (event.target === ref.current) close();
      }}
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="Fermer" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function TaskForm({
  task,
  due,
  projects,
  save,
  close,
}: {
  task?: Task;
  due?: string;
  projects: Project[];
  save: (task: Task) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get("title")).trim();
    if (!title) {
      setError("Saisissez un titre.");
      return;
    }
    setSaving(true);
    try {
      await save({
        id: task?.id ?? crypto.randomUUID(),
        title,
        description: String(fields.get("description")).trim(),
        due: String(fields.get("due")),
        priority: fields.get("priority") as Task["priority"],
        projectId: String(fields.get("projectId")),
        status: task?.status ?? "todo",
        createdAt: task?.createdAt ?? new Date().toISOString(),
        completedAt: task?.completedAt ?? null,
      });
      close();
    } catch {
      setError("La tâche n’a pas pu être enregistrée. Réessayez.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="form">
      <label>
        Titre
        <input
          name="title"
          autoFocus
          required
          maxLength={180}
          defaultValue={task?.title}
          placeholder="Que souhaitez-vous accomplir ?"
        />
      </label>
      <label>
        Notes
        <textarea
          name="description"
          maxLength={10000}
          defaultValue={task?.description}
          placeholder="Un détail, une prochaine étape…"
          rows={3}
        />
      </label>
      <div className="form-grid">
        <label>
          Échéance
          <input type="date" name="due" defaultValue={task?.due ?? due ?? ""} />
        </label>
        <label>
          Priorité
          <select name="priority" defaultValue={task?.priority ?? "medium"}>
            <option value="high">Haute</option>
            <option value="medium">Normale</option>
            <option value="low">Basse</option>
          </select>
        </label>
      </div>
      <label htmlFor="task-project">Projet</label>
      <select
        id="task-project"
        aria-label="Projet"
        name="projectId"
        defaultValue={task?.projectId ?? ""}
      >
        <option value="">Sans projet</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={close}>
          Annuler
        </button>
        <button disabled={saving} className="button primary">
          {saving ? "Enregistrement…" : "Enregistrer la tâche"}
        </button>
      </div>
    </form>
  );
}

function ProjectForm({
  project,
  save,
  close,
}: {
  project?: Project;
  save: (project: Project) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name")).trim();
    if (!name) {
      setError("Saisissez un nom.");
      return;
    }
    setSaving(true);
    try {
      await save({
        id: project?.id ?? crypto.randomUUID(),
        name,
        description: String(fields.get("description")).trim(),
        color: fields.get("color") as Project["color"],
        status: fields.get("status") as Project["status"],
        createdAt: project?.createdAt ?? new Date().toISOString(),
      });
      close();
    } catch {
      setError("Le projet n’a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Nom du projet
        <input
          autoFocus
          name="name"
          required
          maxLength={180}
          defaultValue={project?.name}
          placeholder="Un projet qui vous tient à cœur"
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          maxLength={10000}
          rows={3}
          defaultValue={project?.description}
          placeholder="Quelle est votre intention ?"
        />
      </label>
      <div className="form-grid">
        <label>
          Couleur
          <select name="color" defaultValue={project?.color ?? "sage"}>
            <option value="sage">Sauge</option>
            <option value="amber">Ambre</option>
            <option value="blue">Bleu</option>
            <option value="rose">Rose</option>
            <option value="violet">Violet</option>
          </select>
        </label>
        <label>
          Statut
          <select name="status" defaultValue={project?.status ?? "active"}>
            <option value="active">En cours</option>
            <option value="paused">En pause</option>
            <option value="done">Terminé</option>
          </select>
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={close}>
          Annuler
        </button>
        <button disabled={saving} className="button primary">
          Enregistrer le projet
        </button>
      </div>
    </form>
  );
}

function NoteForm({
  note,
  save,
  close,
}: {
  note?: Note;
  save: (note: Note) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get("title")).trim();
    if (!title) {
      setError("Saisissez un titre.");
      return;
    }
    setSaving(true);
    try {
      await save({
        id: note?.id ?? crypto.randomUUID(),
        title,
        body: String(fields.get("body")).trim(),
        createdAt: note?.createdAt ?? new Date().toISOString(),
      });
      close();
    } catch {
      setError("La note n’a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Titre de l’idée
        <input
          autoFocus
          required
          name="title"
          maxLength={180}
          defaultValue={note?.title}
          placeholder="Ne laissez pas cette idée s’envoler…"
        />
      </label>
      <label>
        Votre note
        <textarea
          name="body"
          rows={6}
          maxLength={10000}
          defaultValue={note?.body}
          placeholder="Une inspiration, une ressource, une décision…"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={close}>
          Annuler
        </button>
        <button disabled={saving} className="button primary">
          Enregistrer l’idée
        </button>
      </div>
    </form>
  );
}

function Backup({
  data,
  restore,
  close,
}: {
  data: Data;
  restore: (data: Data) => Promise<void>;
  close: () => void;
}) {
  const [pending, setPending] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function download() {
    const url = URL.createObjectURL(
      new Blob([serializeBackup(data)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lifeos-${localDay()}-${Date.now()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="form">
      <p className="muted">
        Vos données restent sur cet appareil, dans ce navigateur. Exportez
        régulièrement une copie dans un endroit sûr. Le fichier JSON est lisible
        et n’est pas chiffré.
      </p>
      <div className="backup-counts">
        <span>
          <b>{data.tasks.length}</b> tâches
        </span>
        <span>
          <b>{data.projects.length}</b> projets
        </span>
        <span>
          <b>{data.notes.length}</b> idées
        </span>
      </div>
      <button className="button primary" onClick={download}>
        <ArrowDownToLine size={17} /> Exporter mes données
      </button>
      <hr />
      <label>
        Restaurer une sauvegarde JSON
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (event) => {
            setError("");
            setPending(null);
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 10 * 1024 * 1024) throw new Error();
              setPending(parseBackup(await file.text()));
            } catch {
              setError(
                "Fichier invalide ou incompatible. Utilisez une sauvegarde LifeOS v1 de moins de 10 Mo. Aucune donnée n’a été modifiée.",
              );
            }
            event.target.value = "";
          }}
        />
      </label>
      {pending && (
        <div className="restore-warning">
          <strong>Remplacer les données actuelles ?</strong>
          <p>
            Le fichier contient {pending.tasks.length} tâches,{" "}
            {pending.projects.length} projets et {pending.notes.length} idées.
            Exportez vos données actuelles avant de continuer.
          </p>
          <button
            disabled={busy}
            className="button danger"
            onClick={async () => {
              setBusy(true);
              try {
                await restore(pending);
                close();
              } catch {
                setError(
                  "Échec de restauration. Les données actuelles sont conservées.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirmer le remplacement
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="small muted">
        <ShieldCheck size={15} /> Aucun fichier n’est envoyé à un serveur. Une
        autre fenêtre de LifeOS est bloquée pour éviter les écritures
        concurrentes.
      </p>
    </div>
  );
}

export default function App() {
  const { data, ready, error, busy, mutate } = useLifeOS();
  const [space, setSpace] = useState<Space>("home");
  const [editor, setEditor] = useState<Editor>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState("open");
  const [briefingMode, setBriefingMode] = useState<"morning" | "evening">(
    "morning",
  );
  const [today, setToday] = useState(localDay());
  const [selectedDay, setSelectedDay] = useState(localDay());
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  useEffect(() => {
    const interval = setInterval(() => setToday(localDay()), 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setEditor({ type: "search" });
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const brief = briefing(data, today);
  const completed = data.tasks.filter((task) => task.status === "done").length;
  const progress = data.tasks.length
    ? Math.round((completed / data.tasks.length) * 100)
    : 0;
  const close = () => setEditor(null);
  async function change(
    operation: (value: Data) => Data,
    notice = "Modification enregistrée",
  ) {
    await mutate(operation);
    setMessage(notice);
  }
  const safeChange = (operation: (value: Data) => Data, notice?: string) => {
    void change(operation, notice).catch(() => undefined);
  };
  const saveTask = (task: Task) =>
    change(
      (previous) => ({
        ...previous,
        tasks: [...previous.tasks.filter((item) => item.id !== task.id), task],
      }),
      "Tâche enregistrée",
    );
  const saveProject = (project: Project) =>
    change(
      (previous) => ({
        ...previous,
        projects: [
          ...previous.projects.filter((item) => item.id !== project.id),
          project,
        ],
      }),
      "Projet enregistré",
    );
  const saveNote = (note: Note) =>
    change(
      (previous) => ({
        ...previous,
        notes: [...previous.notes.filter((item) => item.id !== note.id), note],
      }),
      "Idée enregistrée",
    );
  function toggle(task: Task) {
    safeChange(
      (previous) => ({
        ...previous,
        tasks: previous.tasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: item.status === "done" ? "todo" : "done",
                completedAt:
                  item.status === "done" ? null : new Date().toISOString(),
              }
            : item,
        ),
      }),
      task.status === "done"
        ? "Tâche rouverte"
        : "Une belle avancée. Tâche terminée !",
    );
  }
  function taskRow(task: Task) {
    const project = data.projects.find(
      (project) => project.id === task.projectId,
    );
    return (
      <div
        className={`task-row ${task.status === "done" ? "completed" : ""}`}
        key={task.id}
      >
        <button
          disabled={busy}
          className="task-check"
          aria-label={`${task.status === "done" ? "Rouvrir" : "Terminer"} ${task.title}`}
          onClick={() => toggle(task)}
        >
          {task.status === "done" && <Check size={14} />}
        </button>
        <button
          className="task-content"
          onClick={() => setEditor({ type: "task", value: task })}
        >
          <strong>{task.title}</strong>
          <span>
            {project && (
              <span className={`project-label ${project.color}`}>
                <i />
                {project.name}
              </span>
            )}
            {task.due && (
              <span
                className={
                  task.due < today && task.status !== "done" ? "overdue" : ""
                }
              >
                {dateLabel(task.due)}
                {task.due < today && task.status !== "done"
                  ? " · En retard"
                  : ""}
              </span>
            )}
            {!project && !task.due && <span>Sans échéance</span>}
          </span>
        </button>
        <span className={`priority ${task.priority}`}>
          {priorityNames[task.priority]}
        </span>
        <button
          className="icon-button delete"
          aria-label={`Supprimer ${task.title}`}
          onClick={() =>
            setConfirm({
              title: "Supprimer cette tâche ?",
              message: task.title,
              action: () =>
                change(
                  (previous) => ({
                    ...previous,
                    tasks: previous.tasks.filter((item) => item.id !== task.id),
                  }),
                  "Tâche supprimée",
                ),
            })
          }
        >
          <Trash2 size={15} />
        </button>
      </div>
    );
  }
  function projectCard(project: Project) {
    const tasks = data.tasks.filter((task) => task.projectId === project.id);
    const done = tasks.filter((task) => task.status === "done").length;
    const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return (
      <article key={project.id} className="project-card">
        <div className="between">
          <span className={`project-symbol ${project.color}`}>
            <FolderKanban size={21} />
          </span>
          <button
            className="icon-button"
            aria-label={`Modifier ${project.name}`}
            onClick={() => setEditor({ type: "project", value: project })}
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
        <button
          className="project-title"
          onClick={() => setEditor({ type: "project", value: project })}
        >
          {project.name}
        </button>
        <p className="project-description">
          {project.description || "Une intention, de nouvelles possibilités."}
        </p>
        <div className="between small">
          <span>
            {project.status === "active"
              ? "En cours"
              : project.status === "paused"
                ? "En pause"
                : "Terminé"}
          </span>
          <span>{percent} %</span>
        </div>
        <div className={`progress-bar ${project.color}`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="between small muted">
          <span>
            {done} / {tasks.length} tâches
          </span>
          {space === "projects" && (
            <button
              className="icon-button"
              aria-label={`Supprimer le projet ${project.name}`}
              onClick={() =>
                setConfirm({
                  title: "Supprimer ce projet ?",
                  message: `« ${project.name} » sera supprimé. Ses tâches seront conservées, sans projet associé.`,
                  action: () =>
                    change(
                      (previous) => removeProject(previous, project.id),
                      "Projet supprimé ; tâches conservées",
                    ),
                })
              }
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </article>
    );
  }
  const empty = (
    title: string,
    description: string,
    action?: () => void,
    label?: string,
  ) => (
    <div className="empty">
      <Sprout size={30} strokeWidth={1.4} />
      <strong>{title}</strong>
      <p>{description}</p>
      {action && (
        <button className="text-button" onClick={action}>
          {label}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
  const monthStart =
    (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const monthDays = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const resultQuery = query.trim().toLocaleLowerCase("fr");
  const matches = (text: string) =>
    text.toLocaleLowerCase("fr").includes(resultQuery);

  if (!ready)
    return (
      <div className="loading">
        <Leaf size={40} />
        <h1>LifeOS</h1>
        <p role={error ? "alert" : "status"}>
          {error || "Ouverture de votre espace…"}
        </p>
      </div>
    );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setSpace("home");
          }}
        >
          <span className="brand-mark">
            <Leaf size={23} />
          </span>
          LifeOS<span className="brand-dot">✦</span>
        </a>
        <div className="workspace">
          <span className="avatar">A</span>
          <div>
            <strong>Mon espace personnel</strong>
            <span>Un peu plus de clarté, chaque jour.</span>
          </div>
        </div>
        <p className="nav-caption">VOTRE QUOTIDIEN</p>
        <nav aria-label="Navigation principale">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSpace(id)}
              className={`nav-item ${space === id ? "active" : ""}`}
              aria-current={space === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {space === id && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <button
          className="nav-item"
          onClick={() => setEditor({ type: "assistants" })}
        >
          <Sparkles size={19} />
          <span>Mes assistants</span>
          <span className="soon">À venir</span>
        </button>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-dot" />
            <strong>Votre vie vous appartient.</strong>
            <p>
              Données locales.
              <br />
              Aucune connexion IA requise.
            </p>
            <button
              className="text-button"
              onClick={() => setEditor({ type: "backup" })}
            >
              Gérer mes sauvegardes
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="nav-item"
            onClick={() => setEditor({ type: "backup" })}
          >
            <Settings2 size={18} />
            <span>Données & sauvegardes</span>
          </button>
          <span className="version">LifeOS 0.1 · Pensé pour vous</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Mon espace <ChevronRight size={13} />
            <strong>
              {navigation.find((item) => item.id === space)?.label}
            </strong>
          </span>
          <span className="mobile-brand">
            <Leaf size={20} /> LifeOS
          </span>
          <div className="top-actions">
            <button
              className="search-button"
              aria-label="Rechercher dans LifeOS"
              onClick={() => {
                setQuery("");
                setEditor({ type: "search" });
              }}
            >
              <Search size={17} />
              <span>Rechercher dans LifeOS</span>
              <kbd>Ctrl K</kbd>
            </button>
            <span className="private-badge">
              <ShieldCheck size={15} /> Privé & local
            </span>
            <button
              className="avatar avatar-button"
              aria-label="Ouvrir les sauvegardes"
              onClick={() => setEditor({ type: "backup" })}
            >
              A
            </button>
          </div>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                <span />
                {dateLabel(today, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h1>
                {space === "home"
                  ? "Faites de la place à l’essentiel."
                  : space === "agenda"
                    ? "Une journée à votre rythme."
                    : space === "projects"
                      ? "Vos idées prennent forme."
                      : space === "life"
                        ? "Prendre soin de votre quotidien."
                        : "Gardez votre curiosité vivante."}
              </h1>
              <p className="subtitle">
                {space === "home"
                  ? "Un esprit plus libre. Des projets qui avancent. Votre quotidien, en clair."
                  : space === "agenda"
                    ? "Planifiez avec intention, avancez une chose à la fois."
                    : space === "projects"
                      ? "De la première intention au prochain petit pas."
                      : space === "life"
                        ? "Un espace pour votre énergie, vos habitudes et votre équilibre."
                        : "Capturez les idées d’aujourd’hui. Retrouvez les inspirations de demain."}
              </p>
            </div>
            <button
              className="button primary heading-action"
              onClick={() =>
                setEditor(
                  space === "projects"
                    ? { type: "project" }
                    : space === "explore"
                      ? { type: "note" }
                      : { type: "task", due: today },
                )
              }
            >
              <Plus size={17} />
              {space === "projects"
                ? "Nouveau projet"
                : space === "explore"
                  ? "Nouvelle idée"
                  : "Nouvelle tâche"}
            </button>
          </div>

          {space === "home" && (
            <>
              <section
                className="briefing-card"
                aria-label="Briefing quotidien"
              >
                <div className="briefing-text">
                  <div className="briefing-kicker">
                    <Sun size={17} />
                    <span>VOTRE RENDEZ-VOUS AVEC VOUS</span>
                  </div>
                  <div className="segmented">
                    <button
                      className={briefingMode === "morning" ? "selected" : ""}
                      onClick={() => setBriefingMode("morning")}
                    >
                      Le matin
                    </button>
                    <button
                      className={briefingMode === "evening" ? "selected" : ""}
                      onClick={() => setBriefingMode("evening")}
                    >
                      Le soir
                    </button>
                  </div>
                  <h2>
                    {briefingMode === "morning"
                      ? "Un pas.\nPuis un autre."
                      : "Le chemin\nparcouru."}
                  </h2>
                  <p>
                    {briefingMode === "morning"
                      ? brief.priorities.length
                        ? `${brief.priorities.length} priorité${brief.priorities.length > 1 ? "s" : ""} pour avancer aujourd’hui. Vous n’avez pas besoin de tout faire, seulement de commencer.`
                        : "Pas encore de priorité ? Choisissez ce qui mérite votre attention aujourd’hui."
                      : `${brief.completed.length} tâche${brief.completed.length > 1 ? "s terminées" : " terminée"} aujourd’hui. Chaque avancée compte.`}
                  </p>
                  <button
                    className="button light"
                    onClick={() => {
                      setSpace("agenda");
                      setSelectedDay(today);
                    }}
                  >
                    {briefingMode === "morning"
                      ? "Composer ma journée"
                      : "Voir mes avancées"}
                    <ArrowRight size={16} />
                  </button>
                  <span className="briefing-source">
                    Briefing calculé à partir de vos données locales
                  </span>
                </div>
                <div className="zen-art" aria-hidden="true">
                  <span className="zen-art-index">L / 01</span>
                  <svg className="enso" viewBox="0 0 320 320" fill="none">
                    <path
                      d="M226 58C171 17 89 43 56 102C18 168 52 252 121 274C186 295 257 255 277 195C294 144 278 98 247 77"
                      stroke="currentColor"
                      strokeWidth="33"
                      strokeLinecap="butt"
                    />
                    <path
                      d="M233 64C187 31 117 38 75 82"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeLinecap="butt"
                    />
                  </svg>
                  <span className="zen-art-seal" />
                  <span className="zen-art-caption">
                    CALME INTÉRIEUR.
                    <br />
                    MOUVEMENT EXTÉRIEUR.
                  </span>
                </div>
              </section>
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-icon sage">
                    <ClipboardList size={19} />
                  </span>
                  <div>
                    <span>Tâches du jour</span>
                    <strong>
                      {brief.planned.length}
                      <small>à accomplir</small>
                    </strong>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon amber">
                    <FolderKanban size={19} />
                  </span>
                  <div>
                    <span>Projets en cours</span>
                    <strong>
                      {
                        data.projects.filter(
                          (project) => project.status === "active",
                        ).length
                      }
                      <small>à faire grandir</small>
                    </strong>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon blue">
                    <Check size={19} />
                  </span>
                  <div>
                    <span>Progression globale</span>
                    <strong>
                      {progress}
                      <small>% des tâches terminées</small>
                    </strong>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon rose">
                    <Lightbulb size={19} />
                  </span>
                  <div>
                    <span>Idées capturées</span>
                    <strong>
                      {data.notes.length}
                      <small>à explorer</small>
                    </strong>
                  </div>
                </div>
              </div>
              <div className="dashboard-grid">
                <section className="panel priorities-panel">
                  <div className="section-heading">
                    <h2>
                      {briefingMode === "morning"
                        ? "Vos priorités du jour"
                        : "Vos avancées du jour"}
                      <span className="count">
                        {briefingMode === "morning"
                          ? brief.priorities.length
                          : brief.completed.length}
                      </span>
                    </h2>
                    <button
                      className="text-button"
                      onClick={() => setSpace("agenda")}
                    >
                      Voir l’agenda
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <p className="section-description">
                    {briefingMode === "morning"
                      ? "L’essentiel d’abord. Le reste peut attendre."
                      : "Les tâches réellement terminées aujourd’hui."}
                  </p>
                  {(briefingMode === "morning"
                    ? brief.priorities
                    : brief.completed
                  ).map(taskRow)}
                  {(briefingMode === "morning"
                    ? brief.priorities
                    : brief.completed
                  ).length === 0 &&
                    empty(
                      briefingMode === "morning"
                        ? "Votre prochain petit pas ?"
                        : "Le chemin reste ouvert.",
                      briefingMode === "morning"
                        ? "Ajoutez une tâche pour aujourd’hui ou sans échéance. Vos trois priorités apparaîtront ici."
                        : "Les tâches cochées aujourd’hui apparaîtront ici.",
                      () => setEditor({ type: "task", due: today }),
                      "Créer une tâche",
                    )}
                  <button
                    className="add-row"
                    onClick={() => setEditor({ type: "task", due: today })}
                  >
                    <Plus size={16} />
                    Ajouter une tâche
                  </button>
                </section>
                <section className="insight-card">
                  <span className="insight-icon">
                    <Sparkles size={21} />
                  </span>
                  <p className="eyebrow">UN PEU DE RECUL</p>
                  <h2>
                    {brief.overdue.length
                      ? "Retrouvez un peu\nde légèreté."
                      : "Moins de dispersion,\nplus d’intention."}
                  </h2>
                  <p>{brief.recommendation}</p>
                  <details>
                    <summary>Pourquoi ce conseil ?</summary>
                    <p>{brief.reason}</p>
                  </details>
                  <button
                    className="text-button"
                    onClick={() => setSpace("agenda")}
                  >
                    Faire le point
                    <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className="section-heading project-section-heading">
                <h2>Vos projets, pas à pas</h2>
                <button
                  className="text-button"
                  onClick={() => setSpace("projects")}
                >
                  Tous les projets
                  <ArrowUpRight size={15} />
                </button>
              </div>
              {data.projects.length ? (
                <div className="project-grid">
                  {data.projects.slice(0, 3).map(projectCard)}
                </div>
              ) : (
                <section className="panel">
                  {empty(
                    "De belles choses à construire.",
                    "Donnez un espace à votre prochain projet et reliez-y vos tâches.",
                    () => setEditor({ type: "project" }),
                    "Créer mon premier projet",
                  )}
                </section>
              )}
              <button
                className="capture-banner"
                onClick={() => setEditor({ type: "note" })}
              >
                <span className="capture-icon">
                  <Lightbulb size={22} />
                </span>
                <span>
                  <strong>Une idée vous traverse l’esprit ?</strong>
                  <small>
                    Capturez-la maintenant, faites-la grandir plus tard.
                  </small>
                </span>
                <span className="capture-action">
                  Capturer une idée
                  <Plus size={16} />
                </span>
              </button>
            </>
          )}

          {space === "agenda" && (
            <div className="agenda-layout">
              <section className="panel calendar-panel">
                <div className="section-heading">
                  <h2 className="capitalize">
                    {month.toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <div className="inline">
                    <button
                      className="icon-button"
                      aria-label="Mois précédent"
                      onClick={() =>
                        setMonth(
                          new Date(
                            month.getFullYear(),
                            month.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Mois suivant"
                      onClick={() =>
                        setMonth(
                          new Date(
                            month.getFullYear(),
                            month.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <div className="calendar-grid">
                  {["L", "M", "M", "J", "V", "S", "D"].map((day, index) => (
                    <span key={`heading-${index}`} className="day-name">
                      {day}
                    </span>
                  ))}
                  {Array.from({ length: monthStart }, (_, index) => (
                    <span key={`blank-${index}`} />
                  ))}
                  {Array.from({ length: monthDays }, (_, index) => {
                    const day = localDay(
                      new Date(
                        month.getFullYear(),
                        month.getMonth(),
                        index + 1,
                      ),
                    );
                    return (
                      <button
                        key={day}
                        aria-label={dateLabel(day, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                        aria-pressed={selectedDay === day}
                        className={`calendar-day ${day === selectedDay ? "selected" : ""} ${day === today ? "today" : ""}`}
                        onClick={() => setSelectedDay(day)}
                      >
                        {index + 1}
                        {data.tasks.some(
                          (task) => task.due === day && task.status === "todo",
                        ) && <i />}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setMonth(
                      new Date(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        1,
                      ),
                    );
                    setSelectedDay(today);
                  }}
                >
                  Revenir à aujourd’hui
                  <ArrowRight size={14} />
                </button>
                <hr />
                <h3 className="capitalize">
                  {dateLabel(selectedDay, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                {data.tasks
                  .filter((task) => task.due === selectedDay)
                  .map(taskRow)}
                {!data.tasks.some((task) => task.due === selectedDay) && (
                  <p className="muted small">
                    Un peu d’espace dans cette journée.
                  </p>
                )}
                <button
                  className="add-row"
                  onClick={() => setEditor({ type: "task", due: selectedDay })}
                >
                  <Plus size={16} />
                  Planifier une tâche
                </button>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Toutes vos tâches</h2>
                  <span className="count">{data.tasks.length}</span>
                </div>
                <div className="task-toolbar">
                  <label className="sr-only" htmlFor="task-filter">
                    Filtrer les tâches
                  </label>
                  <select
                    id="task-filter"
                    value={taskFilter}
                    onChange={(event) => setTaskFilter(event.target.value)}
                  >
                    <option value="open">À faire</option>
                    <option value="done">Terminées</option>
                    <option value="all">Toutes</option>
                    <option value="overdue">En retard</option>
                  </select>
                </div>
                {sortedTasks(
                  data.tasks.filter(
                    (task) =>
                      taskFilter === "all" ||
                      (taskFilter === "open"
                        ? task.status === "todo"
                        : taskFilter === "done"
                          ? task.status === "done"
                          : task.status === "todo" &&
                            task.due &&
                            task.due < today),
                  ),
                ).map(taskRow)}
                {!data.tasks.length &&
                  empty(
                    "À chaque journée son intention.",
                    "Ajoutez votre première tâche. Vous pourrez la planifier, la modifier et suivre son avancement.",
                    () => setEditor({ type: "task", due: today }),
                    "Ajouter une tâche",
                  )}
              </section>
            </div>
          )}

          {space === "projects" && (
            <>
              <div className="section-heading">
                <h2>Votre jardin de projets</h2>
                <span className="muted small">
                  {data.projects.length} projet
                  {data.projects.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="project-grid full">
                {data.projects.map(projectCard)}
                <button
                  className="new-project"
                  onClick={() => setEditor({ type: "project" })}
                >
                  <Plus size={28} strokeWidth={1.3} />
                  <strong>Planter une nouvelle idée</strong>
                  <span>Chaque projet commence ici.</span>
                </button>
              </div>
            </>
          )}

          {space === "life" && (
            <section className="life-intro">
              <span className="life-art">
                <Heart size={50} strokeWidth={1.2} />
                <Leaf size={30} />
              </span>
              <p className="eyebrow">BIENTÔT, UN QUOTIDIEN PLUS ÉQUILIBRÉ</p>
              <h2>
                Votre énergie mérite
                <br />
                aussi son espace.
              </h2>
              <p>
                Le suivi du sport, des repas et des habitudes arrivera dans un
                prochain lot. Aucune donnée de santé n’est enregistrée dans
                cette version.
              </p>
              <div className="life-topics">
                <span>
                  <Sprout size={19} />
                  Habitudes
                </span>
                <span>
                  <Heart size={19} />
                  Mouvement
                </span>
                <span>
                  <Leaf size={19} />
                  Nutrition
                </span>
              </div>
              <button
                className="button primary"
                onClick={() => setEditor({ type: "task", due: today })}
              >
                <Plus size={17} />
                Planifier un moment pour moi
              </button>
              <p className="small muted">
                Cette action crée une tâche ordinaire dans votre agenda.
              </p>
            </section>
          )}

          {space === "explore" && (
            <>
              <div className="section-heading">
                <h2>Votre carnet d’idées</h2>
                <span className="muted small">
                  Local, personnel, à votre rythme.
                </span>
              </div>
              {data.notes.length ? (
                <div className="notes-grid">
                  {[...data.notes]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((note) => (
                      <article className="note-card" key={note.id}>
                        <div className="between">
                          <Lightbulb size={20} />
                          <button
                            className="icon-button"
                            aria-label={`Supprimer l’idée ${note.title}`}
                            onClick={() =>
                              setConfirm({
                                title: "Supprimer cette idée ?",
                                message: note.title,
                                action: () =>
                                  change(
                                    (previous) => ({
                                      ...previous,
                                      notes: previous.notes.filter(
                                        (item) => item.id !== note.id,
                                      ),
                                    }),
                                    "Idée supprimée",
                                  ),
                              })
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <button
                          className="note-title"
                          onClick={() =>
                            setEditor({ type: "note", value: note })
                          }
                        >
                          {note.title}
                        </button>
                        <p>{note.body || "Une idée à développer…"}</p>
                        <span className="small muted">
                          {new Date(note.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </article>
                    ))}
                </div>
              ) : (
                <section className="panel">
                  {empty(
                    "Un endroit pour les étincelles.",
                    "Idées, ressources, inspirations ou décisions : gardez ce que vous souhaitez retrouver.",
                    () => setEditor({ type: "note" }),
                    "Capturer ma première idée",
                  )}
                </section>
              )}
              <div className="source-notice">
                <CircleHelp size={18} />
                <p>
                  Les actualités et la veille IA ne sont pas encore connectées.
                  Aucune information en temps réel n’est présentée ici.
                </p>
              </div>
            </>
          )}
          <footer>
            <span>
              <Leaf size={13} />
              Un quotidien qui vous ressemble.
            </span>
            <span>
              <span className="local-dot" />
              {busy ? "Enregistrement…" : "Stockage local · Sur cet appareil"}
            </span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navigation mobile">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={space === id ? "active" : ""}
            aria-current={space === id ? "page" : undefined}
            onClick={() => setSpace(id)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {message && (
        <div className="toast" role="status">
          <Check size={17} />
          {message}
        </div>
      )}
      {editor && (
        <Modal
          close={close}
          title={
            editor.type === "task"
              ? editor.value
                ? "Modifier la tâche"
                : "Un nouveau petit pas"
              : editor.type === "project"
                ? editor.value
                  ? "Modifier le projet"
                  : "Un nouveau projet"
                : editor.type === "note"
                  ? editor.value
                    ? "Modifier l’idée"
                    : "Capturer une idée"
                  : editor.type === "backup"
                    ? "Vos données, en sécurité"
                    : editor.type === "search"
                      ? "Retrouver l’essentiel"
                      : "Vos assistants, au même endroit"
          }
        >
          {editor.type === "task" && (
            <TaskForm
              task={editor.value}
              due={editor.due}
              projects={data.projects}
              save={saveTask}
              close={close}
            />
          )}
          {editor.type === "project" && (
            <ProjectForm
              project={editor.value}
              save={saveProject}
              close={close}
            />
          )}
          {editor.type === "note" && (
            <NoteForm note={editor.value} save={saveNote} close={close} />
          )}
          {editor.type === "backup" && (
            <Backup
              data={data}
              restore={(value) => change(() => value, "Sauvegarde restaurée")}
              close={close}
            />
          )}
          {editor.type === "assistants" && (
            <div className="form">
              <div className="assistant-logos">
                <span>ChatGPT</span>
                <span>Claude</span>
              </div>
              <p>
                Le centre de missions est prévu au prochain lot : objectifs,
                fichiers, critères de réussite, rapports et suivi manuel des
                limites.
              </p>
              <p className="muted">
                Aucun assistant n’est connecté. Aucun rapport n’est généré ou
                simulé. Vous pouvez déjà organiser votre travail dans Projets.
              </p>
              <button
                className="button primary"
                onClick={() => {
                  close();
                  setSpace("projects");
                }}
              >
                Ouvrir mes projets
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {editor.type === "search" && (
            <div className="form">
              <label className="search-input">
                <Search size={19} />
                <input
                  autoFocus
                  placeholder="Tâches, projets, idées…"
                  aria-label="Rechercher"
                  value={query}
                  maxLength={180}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="search-results">
                {!resultQuery ? (
                  <p className="muted">
                    Commencez à écrire pour rechercher dans votre espace
                    personnel.
                  </p>
                ) : (
                  <>
                    {data.tasks
                      .filter((task) =>
                        matches(task.title + " " + task.description),
                      )
                      .map((task) => (
                        <button
                          key={task.id}
                          onClick={() =>
                            setEditor({ type: "task", value: task })
                          }
                        >
                          <ClipboardList size={18} />
                          <span>
                            {task.title}
                            <small>Tâche</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    {data.projects
                      .filter((project) =>
                        matches(project.name + " " + project.description),
                      )
                      .map((project) => (
                        <button
                          key={project.id}
                          onClick={() =>
                            setEditor({ type: "project", value: project })
                          }
                        >
                          <FolderKanban size={18} />
                          <span>
                            {project.name}
                            <small>Projet</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    {data.notes
                      .filter((note) => matches(note.title + " " + note.body))
                      .map((note) => (
                        <button
                          key={note.id}
                          onClick={() =>
                            setEditor({ type: "note", value: note })
                          }
                        >
                          <Lightbulb size={18} />
                          <span>
                            {note.title}
                            <small>Idée</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    {!data.tasks.some((task) =>
                      matches(task.title + " " + task.description),
                    ) &&
                      !data.projects.some((project) =>
                        matches(project.name + " " + project.description),
                      ) &&
                      !data.notes.some((note) =>
                        matches(note.title + " " + note.body),
                      ) && (
                        <p className="muted">
                          Aucun résultat pour « {query} ».
                        </p>
                      )}
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm.title} close={() => setConfirm(null)}>
          <div className="form">
            <p>{confirm.message}</p>
            <p className="muted small">
              Cette suppression ne pourra pas être annulée dans l’application.
              Vous pouvez exporter une sauvegarde avant de continuer.
            </p>
            <div className="form-actions">
              <button
                className="button secondary"
                onClick={() => setConfirm(null)}
              >
                Annuler
              </button>
              <button
                disabled={busy}
                className="button danger"
                onClick={async () => {
                  try {
                    await confirm.action();
                    setConfirm(null);
                  } catch {
                    /* Main error banner retains failure. */
                  }
                }}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
