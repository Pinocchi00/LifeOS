import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useMemo,
  useDeferredValue,
  type FormEvent,
} from "react";
import { flushSync } from "react-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
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
  Trash2,
  Waves,
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
import {
  AssistantOverview,
  AssistantsCenter,
  MissionForm,
  MissionInstructions,
  UsageForm,
} from "./components/Assistants";
import { type Assistant, type Mission, type Usage } from "./domain/assistants";
import { DailyGarden } from "./components/DailyGarden";
import { FocusSession } from "./components/FocusSession";
import { useMotion } from "./experience/useMotion";
import { UpdateNotice } from "./components/UpdateNotice";
import type { GardenAction } from "./domain/garden";
import { Planning } from "./components/Planning";
import {
  GoalForm,
  RoutineForm,
  TaskScheduleFields,
} from "./components/PlanningForms";
import {
  type Goal,
  type Routine,
  scheduleSchema,
} from "./domain/planningSchema";
import { removeTask, setRoutineDone } from "./domain/planning";
import { Modal } from "./components/Modal";
import { usePersonalBusy } from "./storage/usePersonal";
const PersonalSpace = lazy(() =>
  import("./components/personal/PersonalSpace").then((module) => ({
    default: module.PersonalSpace,
  })),
);
import {
  ResourceForm,
  LearningPathForm,
  LearningEntryForm,
} from "./components/ExplorerForms";
import type { ExplorerView } from "./components/Explorer";
import type {
  Resource,
  LearningPath,
  LearningEntry,
} from "./domain/exploreSchema";
import {
  ideaFromResource,
  normalizeSearch,
  resourceText,
  removeResource,
  removeLearningPath,
  removeNote,
  saveLearningPath,
  toggleLearningStep,
} from "./domain/explore";
const Explorer = lazy(() =>
  import("./components/Explorer").then((module) => ({
    default: module.Explorer,
  })),
);
import { version } from "../package.json";
import { exportJson } from "./platform/backup";
import { isAndroid } from "./platform/runtime";
import { useAndroid } from "./platform/useAndroid";
import { AndroidReminders } from "./components/AndroidReminders";

import { AdviceCard } from "./components/AdviceCard";
import { PreferencesForm, DecisionForm } from "./components/AdaptationForms";
import { changePreferences, recordFeedback } from "./domain/adaptation";
import type { Decision } from "./domain/adaptationSchema";
const AdaptationPanel = lazy(() =>
  import("./components/AdaptationPanel").then((module) => ({
    default: module.AdaptationPanel,
  })),
);

type Space = "home" | "agenda" | "projects" | "life" | "explore";
type Editor =
  | {
      type: "task";
      value?: Task;
      due?: string;
      scheduleDay?: string;
      goalId?: string;
    }
  | { type: "routine"; value?: Routine }
  | { type: "goal"; value?: Goal }
  | { type: "project"; value?: Project }
  | {
      type: "note";
      value?: Note;
      draft?: { title: string; body: string };
      resourceId?: string;
    }
  | { type: "resource"; value?: Resource }
  | { type: "learningPath"; value?: LearningPath }
  | {
      type: "learningEntry";
      value?: LearningEntry;
      pathId?: string;
      stepId?: string;
    }
  | { type: "adaptation" }
  | { type: "preferences" }
  | { type: "decision"; value?: Decision }
  | { type: "backup" }
  | { type: "search" }
  | { type: "mission"; value?: Mission }
  | { type: "usage"; assistant: Assistant }
  | { type: "instructions"; mission: Mission }
  | { type: "focus"; taskId?: string }
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

function TaskForm({
  task,
  due,
  scheduleDay,
  data,
  projects,
  save,
  close,
}: {
  task?: Task;
  due?: string;
  scheduleDay?: string;
  data: Data;
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
    const reserve = fields.has("reserve");
    const slot = reserve
      ? scheduleSchema.safeParse({
          day: fields.get("scheduleDay"),
          start: fields.get("scheduleStart"),
          duration: Number(fields.get("scheduleDuration")),
        })
      : null;
    if (slot && !slot.success) {
      setError(
        "Vérifiez le créneau : date, heure et durée, avec une fin avant minuit.",
      );
      return;
    }
    setSaving(true);
    try {
      await save({
        id: task?.id ?? crypto.randomUUID(),
        title,
        description: String(fields.get("description")).trim(),
        due: String(fields.get("due")),
        ...(slot?.success ? { schedule: slot.data } : {}),
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
      <TaskScheduleFields task={task} day={scheduleDay} data={data} />
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
  draft,
  save,
  close,
}: {
  note?: Note;
  draft?: { title: string; body: string };
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
          defaultValue={note?.title ?? draft?.title}
          placeholder="Ne laissez pas cette idée s’envoler…"
        />
      </label>
      <label>
        Votre note
        <textarea
          name="body"
          rows={6}
          maxLength={10000}
          defaultValue={note?.body ?? draft?.body}
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
  const [exporting, setExporting] = useState(false);
  async function download() {
    setError("");
    setExporting(true);
    try {
      await exportJson(
        serializeBackup(data),
        `lifeos-${localDay()}-${Date.now()}.json`,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Export impossible. Réessayez.",
      );
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="form">
      <p className="muted">
        Vos données d’organisation restent sur cet appareil. Les suivis Vie ont
        leur propre sauvegarde. Exportez régulièrement une copie dans un endroit
        sûr. Le fichier JSON est lisible et n’est pas chiffré.
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
        <span>
          <b>{data.resources.length}</b> ressources
        </span>
        <span>
          <b>{data.learningPaths.length}</b> parcours
        </span>
        <span>
          <b>{data.learningEntries.length}</b> séances d’apprentissage
        </span>
        <span>
          <b>{data.missions.length}</b> missions
        </span>
        <span>
          <b>{data.routines.length}</b> routines
        </span>
        <span>
          <b>{data.goals.length}</b> objectifs
        </span>
        <span>
          <b>{data.routineEntries.length}</b> réalisations de routines
        </span>
        <span>
          <b>{data.adaptation.decisions.length}</b> décisions
        </span>
        <span>
          <b>{data.adaptation.feedback.length}</b> retours
        </span>
        <span>
          <b>{data.adaptation.revisions.length}</b> versions de réglages
        </span>
      </div>
      <p className="small muted">
        Les réglages, les décisions et leurs historiques font partie de cette
        sauvegarde d’organisation v5.
      </p>
      <button
        className="button primary"
        onClick={() => void download()}
        disabled={busy || exporting}
      >
        <ArrowDownToLine size={17} /> Exporter mes données
      </button>
      {isAndroid() && (
        <p className="small muted">
          Le partage Android permet de choisir une application ou un emplacement
          pour conserver le JSON. Fermer ce partage ne garantit pas qu’une copie
          a été enregistrée.
        </p>
      )}
      <hr />
      <label>
        Restaurer une sauvegarde JSON
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy || exporting}
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
                "Fichier invalide ou incompatible. Utilisez une sauvegarde LifeOS v1 à v5 de moins de 10 Mo. Aucune donnée n’a été modifiée.",
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
            {pending.projects.length} projets, {pending.notes.length} idées,{" "}
            {pending.missions.length} missions et {pending.usage.length}{" "}
            compteurs, {pending.routines.length} routines,{" "}
            {pending.routineEntries.length} réalisations et{" "}
            {pending.goals.length} objectifs, {pending.resources.length}{" "}
            ressources, {pending.learningPaths.length} parcours et{" "}
            {pending.learningEntries.length} séances d’apprentissage. Exportez
            vos données actuelles avant de continuer. Vos réglages seront
            également remplacés, avec {pending.adaptation.decisions.length}{" "}
            décisions, {pending.adaptation.feedback.length} retours et{" "}
            {pending.adaptation.revisions.length} versions de réglages. Les
            suivis Vie ne seront pas modifiés.
          </p>
          <button
            disabled={busy || exporting}
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
        <ShieldCheck size={15} /> Aucun export n’est envoyé automatiquement. Une
        autre fenêtre de LifeOS est bloquée pour éviter les écritures
        concurrentes.
      </p>
      <AndroidReminders />
    </div>
  );
}

export default function App() {
  const { data, ready, error, busy, mutate } = useLifeOS();
  const [space, updateSpace] = useState<Space>("home");
  const motion = useMotion();
  const personalBusy = usePersonalBusy();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const transition = useRef<ViewTransition | null>(null);
  function setSpace(next: Space) {
    if (next === space) return;
    transition.current?.skipTransition();
    const commit = () => flushSync(() => updateSpace(next));
    if (
      !isAndroid() &&
      !motion.calm &&
      typeof document.startViewTransition === "function" &&
      !document.hidden
    ) {
      const current = document.startViewTransition(commit);
      transition.current = current;
      void current.finished
        .catch(() => undefined)
        .finally(() => {
          if (transition.current === current) transition.current = null;
        });
    } else commit();
  }
  useAndroid(
    () => {
      if (space === "home") return false;
      setSpace("home");
      return true;
    },
    () => setSpace("home"),
  );
  useEffect(() => {
    document.title = `LifeOS — ${navigation.find((item) => item.id === space)?.label}`;
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [space]);
  const [exploreView, setExploreView] = useState<ExplorerView>("resources");
  const [projectView, setProjectView] = useState<"projects" | "missions">(
    "projects",
  );
  const [editor, setEditor] = useState<Editor>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  useEffect(() => setConfirmError(""), [confirm]);
  const [undo, setUndo] = useState<Task | null>(null);
  const [noticePause, setNoticePause] = useState({
    hover: false,
    focus: false,
  });
  const [query, setQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState("open");
  const [briefingMode, setBriefingMode] = useState<"morning" | "evening">(
    "morning",
  );
  const [today, setToday] = useState(localDay());
  const [selectedDay, setSelectedDay] = useState(localDay());
  useEffect(() => {
    const interval = setInterval(() => setToday(localDay()), 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (
      !message ||
      noticePause.hover ||
      noticePause.focus ||
      editor?.type === "focus"
    )
      return;
    const timer = setTimeout(
      () => {
        setMessage("");
        setUndo(null);
      },
      undo ? 10000 : 4000,
    );
    return () => clearTimeout(timer);
  }, [message, undo, noticePause, editor?.type]);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        if (!document.querySelector("dialog[open]"))
          setEditor({ type: "search" });
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const brief = useMemo(() => briefing(data, today), [data, today]);
  const completed = data.tasks.filter((task) => task.status === "done").length;
  const close = () => setEditor(null);
  const openMissions = () => {
    setSpace("projects");
    setProjectView("missions");
  };
  function gardenAct(action: GardenAction, taskId?: string) {
    if (action === "focus") setEditor({ type: "focus", taskId });
    else if (action === "task") setEditor({ type: "task", due: today });
    else if (action === "projects") {
      if (data.projects.length) {
        setProjectView("projects");
        setSpace("projects");
      } else setEditor({ type: "project" });
    } else if (action === "assistants") {
      openMissions();
      if (!data.missions.length) setEditor({ type: "mission" });
    } else {
      setSelectedDay(today);
      setTaskFilter(briefingMode === "evening" ? "done" : "open");
      setSpace("agenda");
    }
  }
  async function change(
    operation: (value: Data) => Data,
    notice = "Modification enregistrée",
  ) {
    await mutate(operation);
    setUndo(null);
    setMessage(notice);
  }
  function undoChange() {
    if (!undo) return Promise.resolve();
    const original = undo;
    return change(
      (previous) => ({
        ...previous,
        tasks: previous.tasks.map((item) =>
          item.id === original.id
            ? {
                ...item,
                status: original.status,
                completedAt: original.completedAt,
              }
            : item,
        ),
      }),
      "Action annulée",
    );
  }
  const saveTask = (task: Task) =>
    change(
      (previous) => ({
        ...previous,
        tasks: [...previous.tasks.filter((item) => item.id !== task.id), task],
      }),
      "Tâche enregistrée",
    );
  const saveMission = (mission: Mission) =>
    change(
      (previous) => ({
        ...previous,
        missions: [
          ...previous.missions.filter((item) => item.id !== mission.id),
          mission,
        ],
      }),
      "Mission enregistrée",
    );
  const saveUsage = (usage: Usage) =>
    change(
      (previous) => ({
        ...previous,
        usage: [
          ...previous.usage.filter(
            (item) => item.assistant !== usage.assistant,
          ),
          usage,
        ],
      }),
      "Compteur enregistré",
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
  async function toggle(task: Task) {
    await change(
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
      task.status === "done" ? "Tâche rouverte" : "Tâche terminée",
    );
    setUndo(task);
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
          onClick={() => {
            void toggle(task).catch(() => undefined);
          }}
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
            {task.schedule && (
              <span>
                {dateLabel(task.schedule.day)} · {task.schedule.start} ·{" "}
                {task.schedule.duration} min
              </span>
            )}
            {task.due && (
              <span
                className={
                  task.due < today && task.status !== "done" ? "overdue" : ""
                }
              >
                Échéance : {dateLabel(task.due)}
                {task.due < today && task.status !== "done"
                  ? " · En retard"
                  : ""}
              </span>
            )}
            {!project && !task.due && !task.schedule && (
              <span>Sans échéance</span>
            )}
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
                    ...removeTask(previous, task.id),
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
                  message: `« ${project.name} » sera supprimé. Ses tâches, missions, ressources et parcours seront conservés, sans projet associé.`,
                  action: () =>
                    change(
                      (previous) => removeProject(previous, project.id),
                      "Projet supprimé ; tâches et missions conservées",
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
  const deferredQuery = useDeferredValue(query);
  const resultQuery = deferredQuery.trim().toLocaleLowerCase("fr");
  const matches = (text: string) =>
    normalizeSearch(text).includes(normalizeSearch(resultQuery));

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
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
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
              onClick={() => {
                setSpace(id);
                if (id === "projects") setProjectView("projects");
              }}
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
        <button className="nav-item" onClick={openMissions}>
          <Sparkles size={19} />
          <span>Mes assistants</span>
          <span className="soon">
            {
              data.missions.filter((mission) => mission.status !== "done")
                .length
            }
          </span>
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
          <span className="version">LifeOS {version} · Pensé pour vous</span>
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
              className="personalize-button"
              aria-label="Personnaliser LifeOS"
              title="Mes réglages et décisions"
              onClick={() => setEditor({ type: "adaptation" })}
            >
              <Settings2 size={18} />
            </button>
            <button
              className="motion-toggle"
              aria-label={
                motion.preference === "calm"
                  ? "Suivre les préférences d’animation de l’appareil"
                  : motion.systemReduced
                    ? "Animations réduites par votre appareil"
                    : "Réduire les animations"
              }
              disabled={motion.systemReduced && motion.preference !== "calm"}
              aria-pressed={motion.calm}
              title={
                motion.systemReduced
                  ? "Votre appareil demande des animations réduites."
                  : motion.calm
                    ? "Revenir au mouvement automatique"
                    : "Activer le mode calme"
              }
              onClick={motion.toggle}
            >
              <Waves size={18} />
              <span>{motion.calm ? "Mode calme" : "Mouvement"}</span>
            </button>
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
        <main data-space={space} id="main-content" tabIndex={-1}>
          <UpdateNotice busy={busy || personalBusy} />
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
              <h1 ref={headingRef} tabIndex={-1}>
                {space === "home"
                  ? "Faites de la place à l’essentiel."
                  : space === "agenda"
                    ? "Une journée à votre rythme."
                    : space === "projects"
                      ? projectView === "missions"
                        ? "Cultiver le travail à deux."
                        : "Vos idées prennent forme."
                      : space === "life"
                        ? "Prendre soin de votre quotidien."
                        : "Gardez votre curiosité vivante."}
              </h1>
              <p className="subtitle">
                {space === "home"
                  ? "Une prochaine action claire. Vos projets et vos idées à portée de main."
                  : space === "agenda"
                    ? "Réservez du temps, trouvez votre rythme et avancez vers vos objectifs."
                    : space === "projects"
                      ? projectView === "missions"
                        ? "Vos missions, leurs résultats, votre validation."
                        : "Reliez vos projets à leurs tâches et à leurs missions."
                      : space === "life"
                        ? "Votre mouvement, vos repas et vos repères, réunis dans un espace personnel."
                        : "Conservez vos sources, reliez vos idées et donnez une suite à votre curiosité."}
              </p>
            </div>
            {space !== "life" && (
              <button
                className="button primary heading-action"
                onClick={() =>
                  setEditor(
                    space === "projects"
                      ? projectView === "missions"
                        ? { type: "mission" }
                        : { type: "project" }
                      : space === "explore"
                        ? exploreView === "resources"
                          ? { type: "resource" }
                          : exploreView === "learning"
                            ? { type: "learningPath" }
                            : { type: "note" }
                        : {
                            type: "task",
                            due: space === "agenda" ? selectedDay : today,
                          },
                  )
                }
              >
                <Plus size={17} />
                {space === "projects"
                  ? projectView === "missions"
                    ? "Nouvelle mission"
                    : "Nouveau projet"
                  : space === "explore"
                    ? exploreView === "resources"
                      ? "Nouvelle ressource"
                      : exploreView === "learning"
                        ? "Nouveau parcours"
                        : "Nouvelle idée"
                    : "Nouvelle tâche"}
              </button>
            )}
          </div>

          {space === "home" && (
            <>
              <DailyGarden
                data={data}
                today={today}
                evening={briefingMode === "evening"}
                setEvening={(value) =>
                  setBriefingMode(value ? "evening" : "morning")
                }
                act={gardenAct}
              />
              <div className="stats-grid" aria-label="Accès à votre activité">
                <button
                  className="stat"
                  aria-label="Voir les tâches d’aujourd’hui"
                  onClick={() => {
                    setSelectedDay(today);
                    setTaskFilter("open");
                    setSpace("agenda");
                  }}
                >
                  <span className="stat-icon sage">
                    <CalendarDays size={19} />
                  </span>
                  <span className="stat-copy">
                    <span>Tâches aujourd’hui</span>
                    <strong>{brief.planned.length}</strong>
                    <small>
                      Ouvrir l’agenda <ArrowUpRight size={12} />
                    </small>
                  </span>
                </button>
                <button
                  className="stat"
                  aria-label="Voir les projets en cours"
                  onClick={() => {
                    setProjectView("projects");
                    setSpace("projects");
                  }}
                >
                  <span className="stat-icon amber">
                    <FolderKanban size={19} />
                  </span>
                  <span className="stat-copy">
                    <span>Projets en cours</span>
                    <strong>
                      {
                        data.projects.filter(
                          (project) => project.status === "active",
                        ).length
                      }
                    </strong>
                    <small>
                      Retrouver les projets <ArrowUpRight size={12} />
                    </small>
                  </span>
                </button>
                <button
                  className="stat"
                  aria-label="Voir les tâches terminées"
                  onClick={() => {
                    setTaskFilter("done");
                    setSpace("agenda");
                  }}
                >
                  <span className="stat-icon blue">
                    <Check size={19} />
                  </span>
                  <span className="stat-copy">
                    <span>Tâches terminées</span>
                    <strong>
                      {completed}
                      <em> / {data.tasks.length}</em>
                    </strong>
                    <small>
                      Consulter les réalisations <ArrowUpRight size={12} />
                    </small>
                  </span>
                </button>
                <button
                  className="stat"
                  aria-label="Retrouver les idées capturées"
                  onClick={() => {
                    setExploreView("ideas");
                    setSpace("explore");
                  }}
                >
                  <span className="stat-icon rose">
                    <Lightbulb size={19} />
                  </span>
                  <span className="stat-copy">
                    <span>Idées conservées</span>
                    <strong>{data.notes.length}</strong>
                    <small>
                      Ouvrir le carnet <ArrowUpRight size={12} />
                    </small>
                  </span>
                </button>
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
                        ? "Ajoutez une tâche pour aujourd’hui ou sans échéance. Vos priorités apparaîtront ici, selon vos réglages."
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
                <AdviceCard
                  data={data}
                  today={today}
                  react={(advice, choice) =>
                    change(
                      (previous) =>
                        recordFeedback(previous, advice, choice, localDay()),
                      "Retour enregistré",
                    )
                  }
                  settings={() => setEditor({ type: "adaptation" })}
                  act={(action) => {
                    if (action === "missions") openMissions();
                    else if (action === "learning") {
                      setExploreView("learning");
                      setSpace("explore");
                    } else if (action === "task")
                      setEditor({ type: "task", due: today });
                    else {
                      setSelectedDay(today);
                      setTaskFilter("open");
                      setSpace("agenda");
                    }
                  }}
                />
              </div>
              <AssistantOverview
                data={data}
                evening={briefingMode === "evening"}
                open={openMissions}
              />
              <div className="section-heading project-section-heading">
                <h2>Vos projets, pas à pas</h2>
                <button
                  className="text-button"
                  onClick={() => {
                    setProjectView("projects");
                    setSpace("projects");
                  }}
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
              <Planning
                data={data}
                today={today}
                selectedDay={selectedDay}
                selectDay={setSelectedDay}
                busy={busy}
                renderTask={taskRow}
                toggleTask={toggle}
                editTask={(task) => setEditor({ type: "task", value: task })}
                createTask={(scheduleDay, goalId) =>
                  setEditor({ type: "task", scheduleDay, goalId })
                }
                editRoutine={(value) => setEditor({ type: "routine", value })}
                toggleRoutine={(id, day) =>
                  change(
                    (previous) => setRoutineDone(previous, id, day, today),
                    "Réalisation de routine mise à jour",
                  )
                }
                deleteRoutine={(routine) =>
                  setConfirm({
                    title: "Supprimer cette routine ?",
                    message: `« ${routine.title} » et son historique seront supprimés. Vous pouvez aussi la mettre en pause pour les conserver.`,
                    action: () =>
                      change(
                        (previous) => ({
                          ...previous,
                          routines: previous.routines.filter(
                            (item) => item.id !== routine.id,
                          ),
                          routineEntries: previous.routineEntries.filter(
                            (entry) => entry.routineId !== routine.id,
                          ),
                        }),
                        "Routine supprimée",
                      ),
                  })
                }
                editGoal={(value) => setEditor({ type: "goal", value })}
                deleteGoal={(goal) =>
                  setConfirm({
                    title: "Supprimer cet objectif ?",
                    message: `« ${goal.title} » sera supprimé. Ses tâches seront conservées.`,
                    action: () =>
                      change(
                        (previous) => ({
                          ...previous,
                          goals: previous.goals.filter(
                            (item) => item.id !== goal.id,
                          ),
                        }),
                        "Objectif supprimé ; tâches conservées",
                      ),
                  })
                }
              />
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
            <div
              className="project-tabs"
              role="group"
              aria-label="Espaces des projets"
            >
              <button
                aria-pressed={projectView === "projects"}
                onClick={() => setProjectView("projects")}
              >
                Projets
              </button>
              <button
                aria-pressed={projectView === "missions"}
                onClick={() => setProjectView("missions")}
              >
                Missions IA <span>{data.missions.length}</span>
              </button>
            </div>
          )}
          {space === "projects" && projectView === "missions" && (
            <AssistantsCenter
              data={data}
              edit={(mission) => setEditor({ type: "mission", value: mission })}
              instructions={(mission) =>
                setEditor({ type: "instructions", mission })
              }
              editUsage={(assistant) => setEditor({ type: "usage", assistant })}
              remove={(mission) =>
                setConfirm({
                  title: "Supprimer cette mission ?",
                  message: `« ${mission.title} » et ses ${mission.reports.length} compte-rendu(s) seront supprimés.`,
                  action: () =>
                    change(
                      (previous) => ({
                        ...previous,
                        missions: previous.missions.filter(
                          (item) => item.id !== mission.id,
                        ),
                      }),
                      "Mission supprimée",
                    ),
                })
              }
            />
          )}
          {space === "projects" && projectView === "projects" && (
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
            <Suspense fallback={<p role="status">Ouverture de Vie…</p>}>
              <PersonalSpace today={today} />
            </Suspense>
          )}

          {space === "explore" && (
            <Suspense fallback={<p role="status">Ouverture d’Explorer…</p>}>
              <Explorer
                data={data}
                today={today}
                busy={busy}
                view={exploreView}
                setView={setExploreView}
                editResource={(value) => setEditor({ type: "resource", value })}
                saveResource={(resource) =>
                  change(
                    (previous) => ({
                      ...previous,
                      resources: [
                        ...previous.resources.filter(
                          (item) => item.id !== resource.id,
                        ),
                        resource,
                      ],
                    }),
                    "Ressource enregistrée",
                  )
                }
                deleteResource={(resource) =>
                  setConfirm({
                    title: "Supprimer cette ressource ?",
                    message: `« ${resource.title} » sera supprimée. Les idées, étapes et séances seront conservées ; les étapes ne seront plus liées à cette fiche.`,
                    action: () =>
                      change(
                        (previous) => removeResource(previous, resource.id),
                        "Ressource supprimée ; étapes et idées conservées",
                      ),
                  })
                }
                captureIdea={(resource) =>
                  setEditor({
                    type: "note",
                    draft: ideaFromResource(resource),
                    resourceId: resource.id,
                  })
                }
                editNote={(value) => setEditor({ type: "note", value })}
                editPath={(value) => setEditor({ type: "learningPath", value })}
                deletePath={(path) =>
                  setConfirm({
                    title: "Supprimer ce parcours ?",
                    message: `« ${path.title} » et ses étapes seront supprimés. Les séances garderont leurs titres et leurs notes dans l’historique.`,
                    action: () =>
                      change(
                        (previous) => removeLearningPath(previous, path.id),
                        "Parcours supprimé ; historique conservé",
                      ),
                  })
                }
                toggleStep={(pathId, stepId) =>
                  change(
                    (previous) => toggleLearningStep(previous, pathId, stepId),
                    "État de l’étape mis à jour",
                  )
                }
                log={(pathId, stepId) =>
                  setEditor({ type: "learningEntry", pathId, stepId })
                }
                editEntry={(value) =>
                  setEditor({ type: "learningEntry", value })
                }
                deleteEntry={(entry) =>
                  setConfirm({
                    title: "Supprimer cette séance d’apprentissage ?",
                    message: `${entry.stepTitle} · ${dateLabel(entry.day)}. L’état des étapes restera inchangé.`,
                    action: () =>
                      change(
                        (previous) => ({
                          ...previous,
                          learningEntries: previous.learningEntries.filter(
                            (item) => item.id !== entry.id,
                          ),
                        }),
                        "Séance d’apprentissage supprimée",
                      ),
                  })
                }
                notes={
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
                          .sort((a, b) =>
                            b.createdAt.localeCompare(a.createdAt),
                          )
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
                                          (previous) =>
                                            removeNote(previous, note.id),
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
                                {new Date(note.createdAt).toLocaleDateString(
                                  "fr-FR",
                                )}
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
                  </>
                }
              />
            </Suspense>
          )}
          <footer>
            <span>
              <Leaf size={13} />
              Votre espace. Vos décisions.
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
            onClick={() => {
              setSpace(id);
              if (id === "projects") setProjectView("projects");
            }}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {message && (
        <div
          className="toast"
          role="status"
          onPointerEnter={() =>
            setNoticePause((value) => ({ ...value, hover: true }))
          }
          onPointerLeave={() =>
            setNoticePause((value) => ({ ...value, hover: false }))
          }
          onFocusCapture={() =>
            setNoticePause((value) => ({ ...value, focus: true }))
          }
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setNoticePause((value) => ({ ...value, focus: false }));
          }}
        >
          <Check size={17} />
          {message}
          {undo && (
            <button
              className="undo-button"
              onClick={() => {
                void undoChange().catch(() => undefined);
              }}
            >
              Annuler
            </button>
          )}
        </div>
      )}
      {editor && (
        <Modal
          close={close}
          title={
            editor.type === "adaptation"
              ? "Vos repères, vos choix"
              : editor.type === "preferences"
                ? "Ajuster mes réglages"
                : editor.type === "decision"
                  ? editor.value
                    ? "Relire ma décision"
                    : "Consigner une décision"
                  : editor.type === "resource"
                    ? editor.value
                      ? "Modifier la ressource"
                      : "Garder une ressource"
                    : editor.type === "learningPath"
                      ? editor.value
                        ? "Modifier le parcours"
                        : "Un parcours d’apprentissage"
                      : editor.type === "learningEntry"
                        ? "Votre séance d’apprentissage"
                        : editor.type === "routine"
                          ? editor.value
                            ? "Modifier la routine"
                            : "Nouvelle routine"
                          : editor.type === "goal"
                            ? editor.value
                              ? "Modifier l’objectif"
                              : "Nouvel objectif"
                            : editor.type === "task"
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
                                      : editor.type === "mission"
                                        ? editor.value
                                          ? "Modifier la mission"
                                          : "Nouvelle mission"
                                        : editor.type === "usage"
                                          ? "Votre compteur personnel"
                                          : editor.type === "focus"
                                            ? "Une chose à la fois"
                                            : "Instructions de mission"
          }
        >
          {editor.type === "adaptation" && (
            <Suspense fallback={<p role="status">Ouverture de vos repères…</p>}>
              <AdaptationPanel
                data={data}
                today={today}
                change={(operation) => change(operation, "Repères mis à jour")}
                editPreferences={() => setEditor({ type: "preferences" })}
                editDecision={(value) => setEditor({ type: "decision", value })}
              />
            </Suspense>
          )}
          {editor.type === "preferences" && (
            <PreferencesForm
              value={data.adaptation.preferences}
              save={(value, reason) =>
                change(
                  (previous) => changePreferences(previous, value, reason),
                  "Réglages enregistrés",
                )
              }
              close={() =>
                setEditor((current) =>
                  current === editor ? { type: "adaptation" } : current,
                )
              }
            />
          )}
          {editor.type === "decision" && (
            <DecisionForm
              decision={editor.value}
              save={(value) =>
                change(
                  (previous) => ({
                    ...previous,
                    adaptation: {
                      ...previous.adaptation,
                      decisions: [
                        ...previous.adaptation.decisions.filter(
                          (item) => item.id !== value.id,
                        ),
                        value,
                      ],
                    },
                  }),
                  "Décision enregistrée",
                )
              }
              close={() =>
                setEditor((current) =>
                  current === editor ? { type: "adaptation" } : current,
                )
              }
            />
          )}
          {editor.type === "focus" && (
            <FocusSession
              data={data}
              today={today}
              taskId={editor.taskId}
              complete={toggle}
              undo={
                undo?.status === "todo"
                  ? { taskId: undo.id, run: undoChange }
                  : undefined
              }
              edit={(task) => setEditor({ type: "task", value: task })}
              close={close}
            />
          )}
          {editor.type === "task" && (
            <TaskForm
              task={editor.value}
              due={editor.due}
              scheduleDay={editor.scheduleDay}
              data={data}
              projects={data.projects}
              save={async (task) => {
                if (!editor.goalId) return saveTask(task);
                await change(
                  (previous) => ({
                    ...previous,
                    tasks: [
                      ...previous.tasks.filter((item) => item.id !== task.id),
                      task,
                    ],
                    goals: previous.goals.map((goal) =>
                      goal.id === editor.goalId
                        ? {
                            ...goal,
                            taskIds: [...new Set([...goal.taskIds, task.id])],
                          }
                        : goal,
                    ),
                  }),
                  "Étape ajoutée à l’objectif",
                );
              }}
              close={close}
            />
          )}
          {editor.type === "routine" && (
            <RoutineForm
              routine={editor.value}
              today={today}
              close={close}
              save={(routine) =>
                change(
                  (previous) => ({
                    ...previous,
                    routines: [
                      ...previous.routines.filter(
                        (item) => item.id !== routine.id,
                      ),
                      routine,
                    ],
                  }),
                  "Routine enregistrée",
                )
              }
            />
          )}
          {editor.type === "goal" && (
            <GoalForm
              goal={editor.value}
              data={data}
              close={close}
              save={(goal) =>
                change(
                  (previous) => ({
                    ...previous,
                    goals: [
                      ...previous.goals.filter((item) => item.id !== goal.id),
                      goal,
                    ],
                  }),
                  "Objectif enregistré",
                )
              }
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
            <NoteForm
              note={editor.value}
              draft={editor.draft}
              save={async (note) => {
                if (!editor.resourceId) return saveNote(note);
                await change(
                  (previous) => ({
                    ...previous,
                    notes: [
                      ...previous.notes.filter((item) => item.id !== note.id),
                      note,
                    ],
                    resources: previous.resources.map((resource) =>
                      resource.id === editor.resourceId
                        ? {
                            ...resource,
                            noteIds: [
                              ...new Set([...resource.noteIds, note.id]),
                            ],
                          }
                        : resource,
                    ),
                  }),
                  "Idée enregistrée et reliée à sa source",
                );
              }}
              close={close}
            />
          )}
          {editor.type === "resource" && (
            <ResourceForm
              resource={editor.value}
              data={data}
              today={today}
              close={close}
              save={(resource) =>
                change(
                  (previous) => ({
                    ...previous,
                    resources: [
                      ...previous.resources.filter(
                        (item) => item.id !== resource.id,
                      ),
                      resource,
                    ],
                  }),
                  "Ressource enregistrée",
                )
              }
            />
          )}
          {editor.type === "learningPath" && (
            <LearningPathForm
              path={editor.value}
              data={data}
              close={close}
              save={(path) =>
                change(
                  (previous) => saveLearningPath(previous, path),
                  "Parcours enregistré",
                )
              }
            />
          )}
          {editor.type === "learningEntry" && (
            <LearningEntryForm
              entry={editor.value}
              pathId={editor.pathId}
              stepId={editor.stepId}
              data={data}
              today={today}
              close={close}
              save={(entry) =>
                change(
                  (previous) => ({
                    ...previous,
                    learningEntries: [
                      ...previous.learningEntries.filter(
                        (item) => item.id !== entry.id,
                      ),
                      entry,
                    ],
                  }),
                  "Séance d’apprentissage enregistrée",
                )
              }
            />
          )}

          {editor.type === "backup" && (
            <Backup
              data={data}
              restore={(value) => change(() => value, "Sauvegarde restaurée")}
              close={close}
            />
          )}
          {editor.type === "mission" && (
            <MissionForm
              mission={editor.value}
              projects={data.projects}
              save={saveMission}
              close={close}
            />
          )}
          {editor.type === "usage" && (
            <UsageForm
              assistant={editor.assistant}
              usage={data.usage.find(
                (item) => item.assistant === editor.assistant,
              )}
              save={saveUsage}
              close={close}
            />
          )}
          {editor.type === "instructions" && (
            <MissionInstructions
              mission={editor.mission}
              project={data.projects.find(
                (project) => project.id === editor.mission.projectId,
              )}
            />
          )}
          {editor.type === "search" && (
            <div className="form">
              <label className="search-input">
                <Search size={19} />
                <input
                  autoFocus
                  placeholder="Tâches, projets, idées, ressources, parcours…"
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
                    {data.resources
                      .filter((resource) => matches(resourceText(resource)))
                      .slice(0, 50)
                      .map((resource) => (
                        <button
                          key={resource.id}
                          onClick={() =>
                            setEditor({ type: "resource", value: resource })
                          }
                        >
                          <BookOpen size={18} />
                          <span>
                            {resource.title}
                            <small>Ressource</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    {data.learningPaths
                      .filter((path) =>
                        matches(
                          path.title +
                            " " +
                            path.intention +
                            " " +
                            path.steps.map((step) => step.title).join(" "),
                        ),
                      )
                      .slice(0, 50)
                      .map((path) => (
                        <button
                          key={path.id}
                          onClick={() =>
                            setEditor({ type: "learningPath", value: path })
                          }
                        >
                          <BookOpen size={18} />
                          <span>
                            {path.title}
                            <small>Parcours</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    {data.learningEntries
                      .filter((entry) =>
                        matches(
                          entry.pathTitle +
                            " " +
                            entry.stepTitle +
                            " " +
                            entry.notes,
                        ),
                      )
                      .slice(0, 50)
                      .map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() =>
                            setEditor({ type: "learningEntry", value: entry })
                          }
                        >
                          <BookOpen size={18} />
                          <span>
                            {entry.stepTitle}
                            <small>Séance d’apprentissage</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    {data.routines
                      .filter((item) =>
                        matches(item.title + " " + item.description),
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            setEditor({ type: "routine", value: item })
                          }
                        >
                          <CalendarDays size={18} />
                          <span>
                            {item.title}
                            <small>Routine</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    {data.goals
                      .filter((item) =>
                        matches(item.title + " " + item.description),
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            setEditor({ type: "goal", value: item })
                          }
                        >
                          <Check size={18} />
                          <span>
                            {item.title}
                            <small>Objectif</small>
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
                    {data.missions
                      .filter((mission) =>
                        matches(
                          mission.title +
                            " " +
                            mission.objective +
                            " " +
                            mission.criteria,
                        ),
                      )
                      .map((mission) => (
                        <button
                          key={mission.id}
                          onClick={() =>
                            setEditor({ type: "mission", value: mission })
                          }
                        >
                          <Sparkles size={18} />
                          <span>
                            {mission.title}
                            <small>Mission</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    {!data.resources.some((resource) =>
                      matches(resourceText(resource)),
                    ) &&
                      !data.learningPaths.some((path) =>
                        matches(
                          path.title +
                            " " +
                            path.intention +
                            " " +
                            path.steps.map((step) => step.title).join(" "),
                        ),
                      ) &&
                      !data.learningEntries.some((entry) =>
                        matches(
                          entry.pathTitle +
                            " " +
                            entry.stepTitle +
                            " " +
                            entry.notes,
                        ),
                      ) &&
                      !data.routines.some((item) =>
                        matches(item.title + " " + item.description),
                      ) &&
                      !data.goals.some((item) =>
                        matches(item.title + " " + item.description),
                      ) &&
                      !data.missions.some((mission) =>
                        matches(
                          mission.title +
                            " " +
                            mission.objective +
                            " " +
                            mission.criteria,
                        ),
                      ) &&
                      !data.tasks.some((task) =>
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
        <Modal
          title={confirm.title}
          close={() => {
            if (!confirmBusy) setConfirm(null);
          }}
        >
          <div className="form">
            <p>{confirm.message}</p>
            {confirmError && (
              <p className="error" role="alert">
                {confirmError}
              </p>
            )}
            <p className="muted small">
              Cette suppression ne pourra pas être annulée dans l’application.
              Vous pouvez exporter une sauvegarde avant de continuer.
            </p>
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={confirmBusy}
                onClick={() => setConfirm(null)}
              >
                Annuler
              </button>
              <button
                disabled={busy || confirmBusy}
                className="button danger"
                onClick={async () => {
                  setConfirmBusy(true);
                  try {
                    await confirm.action();
                    setConfirm(null);
                  } catch {
                    setConfirmError(
                      "La suppression a échoué. Les données précédentes sont conservées. Réessayez.",
                    );
                  } finally {
                    setConfirmBusy(false);
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
