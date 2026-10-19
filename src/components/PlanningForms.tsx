import { useState, type FormEvent } from "react";
import { type Data, type Task } from "../domain/model";
import { conflicts, dayAppointments } from "../domain/planning";
import {
  type Goal,
  type Routine,
  goalSchema,
  routineSchema,
  scheduleSchema,
} from "../domain/planningSchema";

export function TaskScheduleFields({
  task,
  day,
  data,
}: {
  task?: Task;
  day?: string;
  data: Data;
}) {
  const [enabled, setEnabled] = useState(!!task?.schedule || !!day);
  const [date, setDate] = useState(task?.schedule?.day ?? day ?? "");
  const [start, setStart] = useState(task?.schedule?.start ?? "09:00");
  const [duration, setDuration] = useState(task?.schedule?.duration ?? 30);
  const parsed = scheduleSchema.safeParse({ day: date, start, duration });
  const overlap =
    enabled &&
    parsed.success &&
    conflicts([
      ...dayAppointments(data, date).filter(
        (item) => item.key !== `task/${task?.id}`,
      ),
      {
        key: "draft",
        kind: "task",
        id: "draft",
        title: "",
        start,
        duration,
        done: task?.status === "done",
      },
    ]).has("draft");
  return (
    <fieldset className="schedule-fields">
      <legend>Réserver du temps</legend>
      <label className="check-label">
        <input
          type="checkbox"
          name="reserve"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Attribuer un créneau à cette tâche
      </label>
      <p className="muted small">
        L’échéance indique la date limite. Le créneau indique quand vous comptez
        y travailler.
      </p>
      {enabled && (
        <>
          <div className="form-grid">
            <label>
              Jour du créneau
              <input
                name="scheduleDay"
                type="date"
                value={date}
                required
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label>
              Heure de début
              <input
                name="scheduleStart"
                type="time"
                value={start}
                required
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label>
              Durée (minutes)
              <input
                name="scheduleDuration"
                type="number"
                min={5}
                max={720}
                value={duration}
                required
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </label>
          </div>
          {date && start && !parsed.success && (
            <p className="error" role="alert">
              Le créneau doit durer entre 5 et 720 minutes et finir avant
              minuit.
            </p>
          )}
          {overlap && (
            <p className="planning-warning" role="status">
              Ce créneau chevauche un autre engagement. Vous pouvez ajuster
              l’horaire ou conserver ce choix.
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}

const weekdays = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
export function RoutineForm({
  routine,
  today,
  save,
  close,
}: {
  routine?: Routine;
  today: string;
  save: (routine: Routine) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const parsed = routineSchema.safeParse({
      id: routine?.id ?? crypto.randomUUID(),
      title: values.get("title"),
      description: values.get("description"),
      weekdays: values.getAll("weekdays").map(Number),
      startDate: values.get("startDate"),
      endDate: values.get("endDate"),
      time: values.get("time"),
      duration: Number(values.get("duration")),
      paused: values.has("paused"),
      createdAt: routine?.createdAt ?? new Date().toISOString(),
    });
    if (!parsed.success) {
      setError(
        "Choisissez au moins un jour, des dates cohérentes et une durée de 5 à 720 minutes finissant avant minuit.",
      );
      return;
    }
    setSaving(true);
    try {
      await save(parsed.data);
      close();
    } catch {
      setError("La routine n’a pas pu être enregistrée. Réessayez.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Nom de la routine
        <input
          name="title"
          required
          maxLength={180}
          defaultValue={routine?.title}
          placeholder="Préparer la journée"
        />
      </label>
      <label>
        Repère utile
        <textarea
          name="description"
          rows={2}
          maxLength={10000}
          defaultValue={routine?.description}
          placeholder="Ce qui vous aide à commencer…"
        />
      </label>
      <fieldset className="schedule-fields">
        <legend>Jours de répétition</legend>
        <div className="weekday-picker">
          {weekdays.map((name, index) => (
            <label key={name}>
              <input
                type="checkbox"
                name="weekdays"
                value={index + 1}
                defaultChecked={
                  routine ? routine.weekdays.includes(index + 1) : index < 5
                }
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form-grid">
        <label>
          À partir du
          <input
            type="date"
            name="startDate"
            required
            defaultValue={routine?.startDate ?? today}
          />
        </label>
        <label>
          Jusqu’au (facultatif)
          <input type="date" name="endDate" defaultValue={routine?.endDate} />
        </label>
        <label>
          Heure (facultative)
          <input type="time" name="time" defaultValue={routine?.time} />
        </label>
        <label>
          Durée (minutes)
          <input
            type="number"
            name="duration"
            min={5}
            max={720}
            required
            defaultValue={routine?.duration ?? 15}
          />
        </label>
      </div>
      <label className="check-label">
        <input type="checkbox" name="paused" defaultChecked={routine?.paused} />
        Mettre en pause
      </label>
      <p className="muted small">
        La routine apparaît les jours choisis. Chaque réalisation est
        enregistrée séparément, sans créer de tâches en double. Une modification
        du rythme conserve vos réalisations passées.
      </p>
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
          {saving ? "Enregistrement…" : "Enregistrer la routine"}
        </button>
      </div>
    </form>
  );
}

export function GoalForm({
  goal,
  data,
  save,
  close,
}: {
  goal?: Goal;
  data: Data;
  save: (goal: Goal) => Promise<void>;
  close: () => void;
}) {
  const [selected, setSelected] = useState(goal?.taskIds ?? []);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const candidates = data.tasks.filter((task) =>
    task.title.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const parsed = goalSchema.safeParse({
      id: goal?.id ?? crypto.randomUUID(),
      title: values.get("title"),
      description: values.get("description"),
      deadline: values.get("deadline"),
      taskIds: selected,
      paused: values.has("paused"),
      createdAt: goal?.createdAt ?? new Date().toISOString(),
    });
    if (!parsed.success) {
      setError("Vérifiez le titre et la date de votre objectif.");
      return;
    }
    setSaving(true);
    try {
      await save(parsed.data);
      close();
    } catch {
      setError("L’objectif n’a pas pu être enregistré. Réessayez.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Nom de l’objectif
        <input
          name="title"
          required
          maxLength={180}
          defaultValue={goal?.title}
          placeholder="Quel résultat souhaitez-vous atteindre ?"
        />
      </label>
      <label>
        Résultat attendu
        <textarea
          name="description"
          rows={2}
          maxLength={10000}
          defaultValue={goal?.description}
        />
      </label>
      <label>
        Date cible (facultative)
        <input type="date" name="deadline" defaultValue={goal?.deadline} />
      </label>
      <fieldset className="schedule-fields">
        <legend>Étapes concrètes · {selected.length} associée(s)</legend>
        <p className="muted small">
          Chaque tâche associée compte pour une étape. La progression suit les
          tâches terminées et rouvre l’objectif si une étape est rouverte.
        </p>
        {data.tasks.length ? (
          <>
            <label>
              Rechercher une étape
              <input
                type="search"
                value={query}
                maxLength={180}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="goal-task-picker">
              {candidates.slice(0, 100).map((task) => (
                <label className="check-label" key={task.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(task.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, task.id]
                          : current.filter((id) => id !== task.id),
                      )
                    }
                  />
                  <span>
                    {task.title}
                    <small>
                      {task.status === "done" ? "Terminée" : "À faire"}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            {candidates.length > 100 && (
              <p className="muted small">
                100 étapes affichées. Précisez la recherche pour retrouver les
                autres.
              </p>
            )}
            {!candidates.length && (
              <p className="muted small">
                Aucune tâche ne correspond à cette recherche.
              </p>
            )}
          </>
        ) : (
          <p className="muted small">
            Vous pourrez créer une première étape depuis cet objectif après
            l’avoir enregistré.
          </p>
        )}
      </fieldset>
      <label className="check-label">
        <input type="checkbox" name="paused" defaultChecked={goal?.paused} />
        Mettre l’objectif en pause
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
          {saving ? "Enregistrement…" : "Enregistrer l’objectif"}
        </button>
      </div>
    </form>
  );
}
