import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Repeat2,
  Target,
  Trash2,
} from "lucide-react";
import { type Data, type Task, localDay } from "../domain/model";
import { type Goal, type Routine } from "../domain/planningSchema";
import {
  addDays,
  conflicts,
  dayAppointments,
  endTime,
  goalProgress,
  plannedMinutes,
  weekDays,
} from "../domain/planning";

const label = (
  day: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" },
) => new Date(day + "T12:00:00").toLocaleDateString("fr-FR", options);
const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const durationLabel = (value: number) =>
  `${Math.floor(value / 60) ? `${Math.floor(value / 60)} h ` : ""}${value % 60 ? `${value % 60} min` : ""}`.trim() ||
  "0 min";
type Props = {
  data: Data;
  today: string;
  selectedDay: string;
  selectDay: (day: string) => void;
  busy: boolean;
  renderTask: (task: Task) => ReactNode;
  editTask: (task: Task) => void;
  toggleTask: (task: Task) => Promise<void>;
  createTask: (day?: string, goalId?: string) => void;
  editRoutine: (routine?: Routine) => void;
  deleteRoutine: (routine: Routine) => void;
  toggleRoutine: (id: string, day: string) => Promise<void>;
  editGoal: (goal?: Goal) => void;
  deleteGoal: (goal: Goal) => void;
};
export function Planning(props: Props) {
  const {
    data,
    today,
    selectedDay,
    selectDay,
    busy,
    renderTask,
    editTask,
    createTask,
    editRoutine,
    deleteRoutine,
    toggleRoutine,
    editGoal,
    deleteGoal,
  } = props;
  const [view, setView] = useState<"week" | "month" | "routines" | "goals">(
    "week",
  );
  const week = weekDays(selectedDay);
  const appointments = useMemo(
    () => dayAppointments(data, selectedDay),
    [data, selectedDay],
  );
  const overlaps = useMemo(() => conflicts(appointments), [appointments]);
  const deadlines = data.tasks.filter(
    (task) => task.due === selectedDay && task.schedule?.day !== selectedDay,
  );
  const month = new Date(selectedDay + "T12:00:00");
  const blanks =
    (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const monthLength = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const calendarDays = Array.from({ length: monthLength }, (_, index) =>
    localDay(new Date(month.getFullYear(), month.getMonth(), index + 1, 12)),
  );
  const periodDays = view === "month" ? calendarDays : week;
  const summaries = periodDays.map((day) => ({
    day,
    items: dayAppointments(data, day),
  }));
  const move = (direction: number) =>
    selectDay(
      view === "week"
        ? addDays(selectedDay, direction * 7)
        : localDay(
            new Date(month.getFullYear(), month.getMonth() + direction, 1, 12),
          ),
    );
  return (
    <section className="planning-workspace" aria-label="Planification">
      <div className="planning-tabs" role="group" aria-label="Vues de l’agenda">
        {(
          [
            { id: "week", name: "Semaine" },
            { id: "month", name: "Mois" },
            { id: "routines", name: "Routines" },
            { id: "goals", name: "Objectifs" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={view === item.id}
            onClick={() => setView(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      {(view === "week" || view === "month") && (
        <>
          <section className="panel planning-calendar">
            <div className="section-heading planning-period">
              <div>
                <span className="planning-eyebrow">
                  {view === "week" ? "VOTRE SEMAINE" : "VOTRE MOIS"}
                </span>
                <h2 className="capitalize" aria-live="polite">
                  {view === "week"
                    ? `${label(week[0], { day: "numeric", month: "short", year: "numeric" })} — ${label(week[6], { day: "numeric", month: "short", year: "numeric" })}`
                    : label(selectedDay, { month: "long", year: "numeric" })}
                </h2>
              </div>
              <div className="inline">
                <button
                  className="icon-button"
                  aria-label={
                    view === "week" ? "Semaine précédente" : "Mois précédent"
                  }
                  onClick={() => move(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={
                    view === "week" ? "Semaine suivante" : "Mois suivant"
                  }
                  onClick={() => move(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div
              className={
                view === "week" ? "week-grid" : "calendar-grid planning-month"
              }
            >
              {view === "month" && (
                <>
                  {days.map((day) => (
                    <span className="day-name" key={day}>
                      {day}
                    </span>
                  ))}
                  {Array.from({ length: blanks }, (_, index) => (
                    <span key={`blank-${index}`} />
                  ))}
                </>
              )}
              {summaries.map(({ day, items }) => {
                const deadlineCount = data.tasks.filter(
                  (task) =>
                    task.due === day &&
                    task.status !== "done" &&
                    task.schedule?.day !== day,
                ).length;
                const count =
                  items.filter((item) => !item.done).length + deadlineCount;
                return (
                  <button
                    key={day}
                    className={`${view === "week" ? "week-day" : "calendar-day"} ${day === selectedDay ? "selected" : ""} ${day === today ? "today" : ""}`}
                    aria-label={label(day, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    aria-pressed={day === selectedDay}
                    onClick={() => selectDay(day)}
                  >
                    {view === "week" && (
                      <span>{label(day, { weekday: "short" })}</span>
                    )}
                    <strong>{Number(day.slice(-2))}</strong>
                    {view === "week" ? (
                      <small>{count ? `${count} à faire` : "Libre"}</small>
                    ) : (
                      count > 0 && <i />
                    )}
                    {view === "week" && plannedMinutes(items) > 0 && (
                      <small>{durationLabel(plannedMinutes(items))}</small>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="planning-calendar-footer">
              <button className="text-button" onClick={() => selectDay(today)}>
                Revenir à aujourd’hui <ArrowRight size={14} />
              </button>
              <label>
                Aller au jour
                <input
                  type="date"
                  value={selectedDay}
                  required
                  onChange={(event) => {
                    if (event.target.value) selectDay(event.target.value);
                  }}
                />
              </label>
            </div>
          </section>
          <section
            className="panel day-plan"
            aria-label="Programme du jour sélectionné"
          >
            <div className="section-heading">
              <div>
                <span className="planning-eyebrow">
                  {plannedMinutes(appointments)
                    ? `${durationLabel(plannedMinutes(appointments))} RÉSERVÉES · HORS CHEVAUCHEMENTS`
                    : "VOTRE TEMPS RESTE OUVERT"}
                </span>
                <h2 className="capitalize">
                  {label(selectedDay, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Réserver un créneau"
                onClick={() => createTask(selectedDay)}
              >
                <Plus size={19} />
              </button>
            </div>
            {overlaps.size > 0 && (
              <p className="planning-warning" role="status">
                Des créneaux se chevauchent. Ouvrez une tâche ou une routine
                pour ajuster son horaire.
              </p>
            )}
            {appointments.length > 0 && (
              <div className="day-timeline">
                {appointments.map((item) => (
                  <div
                    className={`appointment ${item.done ? "completed" : ""} ${overlaps.has(item.key) ? "has-conflict" : ""}`}
                    key={item.key}
                  >
                    <span className="appointment-time">
                      {item.start || "À votre rythme"}
                      {item.start && (
                        <small>{endTime(item.start, item.duration)}</small>
                      )}
                    </span>
                    <button
                      className="task-check"
                      disabled={
                        busy || (item.kind === "routine" && selectedDay > today)
                      }
                      aria-label={`${item.done ? "Rouvrir" : "Terminer"} ${item.title}`}
                      onClick={() =>
                        void (
                          item.kind === "routine"
                            ? toggleRoutine(item.id, selectedDay)
                            : props.toggleTask(
                                data.tasks.find((task) => task.id === item.id)!,
                              )
                        ).catch(() => undefined)
                      }
                    >
                      {item.done && <Check size={14} />}
                    </button>
                    <button
                      className="appointment-title"
                      onClick={() =>
                        item.kind === "task"
                          ? editTask(
                              data.tasks.find((task) => task.id === item.id)!,
                            )
                          : editRoutine(
                              data.routines.find(
                                (routine) => routine.id === item.id,
                              )!,
                            )
                      }
                    >
                      <strong>{item.title}</strong>
                      <small>
                        {item.kind === "routine" ? "Routine" : "Créneau"}
                        {overlaps.has(item.key) ? " · Chevauchement" : ""}
                        {item.kind === "routine" && selectedDay > today
                          ? " · Réalisation le jour venu"
                          : ""}
                      </small>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {deadlines.length > 0 && (
              <div className="day-deadlines">
                <h3>Échéances de ce jour</h3>
                {deadlines.map(renderTask)}
              </div>
            )}
            {!appointments.length && !deadlines.length && (
              <p className="planning-empty">
                Un peu d’espace dans cette journée. Réservez un créneau ou
                gardez-la ouverte.
              </p>
            )}
            <button className="add-row" onClick={() => createTask(selectedDay)}>
              <Plus size={16} />
              Planifier une tâche
            </button>
          </section>
        </>
      )}
      {view === "routines" && (
        <section className="panel">
          <div className="section-heading">
            <h2>Un rythme qui vous ressemble.</h2>
            <button className="button primary" onClick={() => editRoutine()}>
              <Plus size={16} />
              Nouvelle routine
            </button>
          </div>
          <p className="muted small">
            Les répétitions apparaissent dans votre agenda. Cochez chaque
            réalisation le jour venu ; les jours oubliés restent tels quels.
          </p>
          {!data.routines.length && (
            <p className="planning-empty">
              Commencez par un rendez-vous régulier avec vous-même.
            </p>
          )}
          {data.routines.map((routine) => (
            <article className="routine-card" key={routine.id}>
              <Repeat2 size={20} />
              <div>
                <button
                  className="planning-title"
                  onClick={() => editRoutine(routine)}
                >
                  {routine.title}
                </button>
                <p>
                  {routine.weekdays.map((day) => days[day - 1]).join(" · ")}
                  {routine.time
                    ? ` · ${routine.time} · ${routine.duration} min`
                    : " · Sans heure fixe"}
                  {routine.paused
                    ? " · En pause"
                    : routine.endDate && routine.endDate < today
                      ? " · Période terminée"
                      : ""}
                </p>
                <p className="muted small">
                  À partir du{" "}
                  {label(routine.startDate, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {routine.endDate
                    ? ` · Jusqu’au ${label(routine.endDate, { day: "numeric", month: "short", year: "numeric" })}`
                    : ""}
                </p>
                {routine.description && (
                  <p className="muted small">{routine.description}</p>
                )}
                <small>
                  {
                    data.routineEntries.filter(
                      (entry) => entry.routineId === routine.id,
                    ).length
                  }{" "}
                  réalisation(s) enregistrée(s)
                </small>
              </div>
              <button
                className="icon-button"
                aria-label={`Modifier la routine ${routine.title}`}
                onClick={() => editRoutine(routine)}
              >
                <Pencil size={15} />
              </button>
              <button
                className="icon-button delete"
                aria-label={`Supprimer la routine ${routine.title}`}
                onClick={() => deleteRoutine(routine)}
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
          {data.routineEntries.length > 0 && (
            <div className="routine-history">
              <h3>Dernières réalisations</h3>
              {[...data.routineEntries]
                .sort(
                  (a, b) =>
                    b.day.localeCompare(a.day) ||
                    b.completedAt.localeCompare(a.completedAt),
                )
                .slice(0, 30)
                .map((entry) => (
                  <div key={entry.id}>
                    <span>
                      {entry.title}
                      <small>
                        {label(entry.day)} · {entry.time || "Sans heure fixe"}
                      </small>
                    </span>
                    <button
                      className="text-button"
                      disabled={busy}
                      aria-label={`Rouvrir ${entry.title} du ${entry.day}`}
                      onClick={() =>
                        void toggleRoutine(entry.routineId, entry.day).catch(
                          () => undefined,
                        )
                      }
                    >
                      Rouvrir
                    </button>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
      {view === "goals" && (
        <section className="panel">
          <div className="section-heading">
            <h2>Un cap, des étapes.</h2>
            <button className="button primary" onClick={() => editGoal()}>
              <Plus size={16} />
              Nouvel objectif
            </button>
          </div>
          <p className="muted small">
            Reliez un résultat aux tâches qui le rendent concret. La progression
            reflète leurs réalisations.
          </p>
          {!data.goals.length && (
            <p className="planning-empty">
              Choisissez un résultat qui compte. Vous pourrez ensuite lui
              associer des tâches.
            </p>
          )}
          <div className="goal-grid">
            {data.goals.map((goal) => {
              const progress = goalProgress(goal, data.tasks);
              return (
                <article className="goal-card" key={goal.id}>
                  <div className="section-heading">
                    <Target size={21} />
                    <span className="goal-state">
                      {goal.paused
                        ? "En pause"
                        : progress.total && progress.done === progress.total
                          ? "Étapes terminées"
                          : "En chemin"}
                    </span>
                    <button
                      className="icon-button delete"
                      aria-label={`Supprimer l’objectif ${goal.title}`}
                      onClick={() => deleteGoal(goal)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <button
                    className="planning-title"
                    onClick={() => editGoal(goal)}
                  >
                    {goal.title}
                  </button>
                  {goal.description && <p>{goal.description}</p>}
                  {goal.deadline && (
                    <p
                      className={
                        goal.deadline < today &&
                        progress.done < progress.total &&
                        !goal.paused
                          ? "overdue"
                          : "muted"
                      }
                    >
                      Cible :{" "}
                      {label(goal.deadline, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  <progress
                    max={100}
                    value={progress.percent}
                    aria-label={`Progression de ${goal.title}`}
                  />
                  <span className="goal-progress">
                    {progress.done} / {progress.total} étape(s) terminée(s) ·{" "}
                    {progress.percent} %
                  </span>
                  {!progress.total && (
                    <p className="muted small">
                      Ajoutez une première étape pour mesurer votre progression.
                    </p>
                  )}
                  {goal.taskIds.length > 0 && (
                    <details>
                      <summary>Voir les étapes</summary>
                      {data.tasks
                        .filter((task) => goal.taskIds.includes(task.id))
                        .map((task) => (
                          <button
                            className="goal-step"
                            key={task.id}
                            onClick={() => editTask(task)}
                          >
                            <span>{task.status === "done" ? "✓" : "○"}</span>
                            {task.title}
                          </button>
                        ))}
                    </details>
                  )}
                  <div className="goal-actions">
                    <button
                      className="text-button"
                      onClick={() => editGoal(goal)}
                    >
                      Modifier l’objectif
                    </button>
                    <button
                      className="text-button"
                      onClick={() => createTask(undefined, goal.id)}
                    >
                      Ajouter une étape <Plus size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
