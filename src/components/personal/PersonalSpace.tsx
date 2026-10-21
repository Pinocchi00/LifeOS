import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Leaf,
  Moon,
  Plus,
  Repeat2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Modal } from "../Modal";
import { usePersonal } from "../../storage/usePersonal";
import { addDays } from "../../domain/planning";
import {
  type PersonalData,
  type Workout,
  type Recipe,
  type Ingredient,
  type ShoppingItem,
  type Habit,
  type Sleep,
  type Meal,
  completeGroceries,
  foodKey,
  habitDue,
  missingGroceries,
  normalizeFood,
  personalSummary,
  recordedDay,
  sleepMinutes,
  storePurchases,
  toggleHabit,
  units,
} from "../../domain/personal";
import {
  WorkoutForm,
  RecipeForm,
  IngredientForm,
  MealForm,
  HabitForm,
  SleepForm,
} from "./PersonalForms";
import { PersonalBackupForm } from "./PersonalBackup";

type View = "day" | "sport" | "food" | "habits" | "sleep";
type Editor =
  | { type: "workout"; value?: Workout; copy?: boolean }
  | { type: "recipe"; value?: Recipe }
  | { type: "pantry"; value?: Ingredient }
  | { type: "shopping"; value?: ShoppingItem }
  | { type: "meal"; recipe: Recipe | Meal; value?: Meal }
  | { type: "habit"; value?: Habit }
  | { type: "sleep"; value?: Sleep }
  | { type: "backup" }
  | null;
const dateLabel = (day: string) =>
  new Date(day + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const durationLabel = (minutes: number) =>
  `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim();
const amount = (quantity: number) =>
  quantity.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export function PersonalSpace({ today }: { today: string }) {
  const { data, ready, error, busy, change } = usePersonal();
  const [view, setView] = useState<View>("day");
  const [day, setDay] = useState(today);
  const [editor, setEditor] = useState<Editor>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    run: () => Promise<void>;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  useEffect(() => setDeleteError(""), [confirm]);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [foodView, setFoodView] = useState<"recipes" | "pantry" | "shopping">(
    "recipes",
  );
  const summary = useMemo(() => personalSummary(data, day), [data, day]);
  const missing = useMemo(() => missingGroceries(data), [data]);
  const recentDays = Array.from({ length: 7 }, (_, index) =>
    addDays(day, index - 6),
  );
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  const close = () => setEditor(null);
  async function commit(
    operation: (previous: PersonalData) => PersonalData,
    notice: string,
  ) {
    await change(operation);
    setMessage(notice);
  }
  const run = (
    operation: (previous: PersonalData) => PersonalData,
    notice: string,
  ) => {
    void commit(operation, notice).catch(() => undefined);
  };
  function remove<T extends { id: string }>(
    key: "workouts" | "recipes" | "pantry" | "shopping" | "meals" | "sleep",
    value: T,
    description: string,
  ) {
    setConfirm({
      title: "Supprimer cet élément de Vie ?",
      description,
      run: () =>
        commit(
          (previous) => ({
            ...previous,
            [key]: previous[key].filter((item) => item.id !== value.id),
          }),
          "Élément Vie supprimé",
        ),
    });
  }
  const habitsOfDay = data.habits.filter(
    (habit) =>
      habitDue(habit, day) ||
      data.habitEntries.some(
        (entry) => entry.habitId === habit.id && entry.day === day,
      ),
  );
  const habitList = (
    <div className="personal-checklist">
      {habitsOfDay.map((habit) => {
        const entry = data.habitEntries.find(
          (entry) => entry.habitId === habit.id && entry.day === day,
        );
        return (
          <div className="personal-check-row" key={habit.id}>
            <button
              className="task-check"
              aria-label={`${entry ? "Rouvrir" : "Réaliser"} l’habitude ${entry?.title ?? habit.title}`}
              disabled={busy || day > today}
              onClick={() =>
                run(
                  (previous) => toggleHabit(previous, habit.id, day, today),
                  entry
                    ? "Réalisation retirée pour ce jour"
                    : "Habitude réalisée pour ce jour",
                )
              }
            >
              {entry && <Check size={14} />}
            </button>
            <button
              className={`personal-row-title ${entry ? "is-done" : ""}`}
              onClick={() => setEditor({ type: "habit", value: habit })}
            >
              <strong>{entry?.title ?? habit.title}</strong>
              <small>
                {day > today
                  ? "À réaliser le jour venu"
                  : entry
                    ? "Réalisation enregistrée"
                    : habit.note || "À votre rythme"}
              </small>
            </button>
          </div>
        );
      })}
      {!habitsOfDay.length && (
        <p className="personal-empty">
          Aucune habitude prévue pour ce jour. Ajoutez un repère simple ou
          laissez cet espace ouvert.
        </p>
      )}
    </div>
  );
  const mealsOfDay = data.meals
    .filter((meal) => meal.day === day)
    .sort(
      (a, b) =>
        ["matin", "midi", "soir", "autre"].indexOf(a.slot) -
        ["matin", "midi", "soir", "autre"].indexOf(b.slot),
    );
  const mealList = (
    <div className="personal-meals">
      {mealsOfDay.map((meal) => (
        <article className="personal-meal" key={meal.id}>
          <span className="personal-kicker">
            {meal.slot} · {meal.status === "eaten" ? "REPAS PRIS" : "PRÉVU"}
          </span>
          <button
            className="personal-title"
            onClick={() =>
              setEditor({ type: "meal", recipe: meal, value: meal })
            }
          >
            {meal.title}
          </button>
          <p>{amount(meal.portions)} portion(s)</p>
          <div className="personal-actions">
            <button
              className="text-button"
              disabled={busy || (meal.day > today && meal.status === "planned")}
              onClick={() => {
                if (meal.status === "planned") recordedDay(meal.day, today);
                run(
                  (previous) => ({
                    ...previous,
                    meals: previous.meals.map((item) =>
                      item.id === meal.id
                        ? {
                            ...item,
                            status:
                              item.status === "planned" ? "eaten" : "planned",
                          }
                        : item,
                    ),
                  }),
                  meal.status === "planned"
                    ? "Repas enregistré comme pris"
                    : "Repas remis dans les prévisions",
                );
              }}
            >
              {meal.status === "eaten" ? "Remettre en prévu" : "Repas pris"}
            </button>
            <button
              className="icon-button delete"
              aria-label={`Supprimer le repas ${meal.title}`}
              onClick={() => remove("meals", meal, meal.title)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
      {!mealsOfDay.length && (
        <p className="personal-empty">
          Aucun repas saisi pour ce jour. Choisissez une recette pour en prévoir
          un.
        </p>
      )}
    </div>
  );
  if (!ready)
    return (
      <section className="panel">
        <p role={error ? "alert" : "status"}>
          {error || "Ouverture de vos suivis personnels…"}
        </p>
      </section>
    );
  const sleepHistory = [...data.sleep]
    .filter((entry) => entry.wakeDay <= day)
    .sort((a, b) => b.wakeDay.localeCompare(a.wakeDay));
  const weekSleep = data.sleep.filter(
    (entry) => entry.wakeDay >= addDays(day, -6) && entry.wakeDay <= day,
  );
  const exerciseHistory = data.workouts
    .flatMap((workout) =>
      workout.exercises
        .filter(
          (exercise) =>
            normalizeFood(exercise.name) === normalizeFood(exerciseQuery),
        )
        .map((exercise) => ({ ...exercise, day: workout.day, id: workout.id })),
    )
    .sort((a, b) => b.day.localeCompare(a.day));
  return (
    <div className="personal-space">
      <div className="personal-boundary">
        <ShieldCheck size={20} />
        <p>
          <strong>Vos suivis, dans leur espace.</strong> Vie dispose d’une
          sauvegarde distincte. Aucun de ces suivis n’entre dans la recherche ou
          l’export général.
        </p>
        <button
          className="text-button"
          onClick={() => setEditor({ type: "backup" })}
        >
          Sauvegarder Vie <ArrowRight size={14} />
        </button>
      </div>
      <div className="personal-tabs" role="group" aria-label="Rubriques Vie">
        {(
          [
            { id: "day", name: "Jour" },
            { id: "sport", name: "Sport" },
            { id: "food", name: "Cuisine" },
            { id: "habits", name: "Habitudes" },
            { id: "sleep", name: "Sommeil" },
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
      <div className="personal-date">
        <div className="inline">
          <button
            className="icon-button"
            aria-label="Jour Vie précédent"
            onClick={() => setDay((value) => addDays(value, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <label>
            Jour des suivis
            <input
              type="date"
              required
              value={day}
              onChange={(event) => {
                if (event.target.value) setDay(event.target.value);
              }}
            />
          </label>
          <button
            className="icon-button"
            aria-label="Jour Vie suivant"
            onClick={() => setDay((value) => addDays(value, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button className="text-button" onClick={() => setDay(today)}>
          Aujourd’hui
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="personal-notice" role="status">
          <Check size={16} />
          {message}
        </p>
      )}
      {view === "day" && (
        <>
          <div className="personal-overview">
            {[
              {
                icon: Dumbbell,
                value: `${summary.workoutMinutes} min`,
                label: "Sport enregistré",
                target: "sport" as View,
              },
              {
                icon: Leaf,
                value: `${summary.mealsEaten}`,
                label: `Repas pris · ${summary.mealsPlanned} prévu(s)`,
                target: "food" as View,
              },
              {
                icon: Repeat2,
                value: `${summary.habitsDone}`,
                label: "Habitudes réalisées",
                target: "habits" as View,
              },
              {
                icon: Moon,
                value: summary.sleep
                  ? durationLabel(sleepMinutes(summary.sleep))
                  : "Non saisi",
                label: "Nuit au réveil de ce jour",
                target: "sleep" as View,
              },
            ].map(({ icon: Icon, value, label, target }) => (
              <button key={target} onClick={() => setView(target)}>
                <Icon size={20} />
                <strong>{value}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="personal-columns">
            <section className="panel">
              <div className="section-heading">
                <h2>Vos repères du jour</h2>
                <button
                  className="icon-button"
                  aria-label="Créer une habitude"
                  onClick={() => setEditor({ type: "habit" })}
                >
                  <Plus size={19} />
                </button>
              </div>
              {habitList}
            </section>
            <section className="panel">
              <div className="section-heading">
                <h2>À votre table</h2>
                <button className="text-button" onClick={() => setView("food")}>
                  Choisir une recette <ArrowRight size={14} />
                </button>
              </div>
              {mealList}
            </section>
          </div>
        </>
      )}
      {view === "sport" && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="personal-kicker">
                {summary.workoutCount} SÉANCE(S) SAISIE(S) SUR LES 7 JOURS
                FINISSANT LE {dateLabel(day)}
              </span>
              <h2>Du mouvement, une trace.</h2>
            </div>
            <button
              className="button primary"
              onClick={() => setEditor({ type: "workout" })}
            >
              <Plus size={16} />
              Enregistrer une séance
            </button>
          </div>
          <p className="muted small">
            Consignez la durée et les exercices réellement effectués. Reprendre
            une séance ouvre un modèle à ajuster, sans l’enregistrer
            automatiquement.
          </p>
          <h3 className="personal-subtitle">Séances du {dateLabel(day)}</h3>
          {data.workouts
            .filter((workout) => workout.day === day)
            .map((workout) => (
              <article className="personal-record" key={workout.id}>
                <div>
                  <button
                    className="personal-title"
                    onClick={() =>
                      setEditor({ type: "workout", value: workout })
                    }
                  >
                    {workout.title}
                  </button>
                  <p>
                    {workout.minutes} min · {workout.exercises.length}{" "}
                    exercice(s)
                  </p>
                  {workout.notes && (
                    <p className="personal-notes">{workout.notes}</p>
                  )}
                  {workout.exercises.length > 0 && (
                    <details>
                      <summary>Voir les exercices</summary>
                      <ul>
                        {workout.exercises.map((exercise, index) => (
                          <li key={index}>
                            {exercise.name} · {exercise.sets} × {exercise.reps}{" "}
                            · {amount(exercise.load)} kg
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <button
                  className="icon-button delete"
                  aria-label={`Supprimer la séance ${workout.title}`}
                  onClick={() => remove("workouts", workout, workout.title)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          {!data.workouts.some((workout) => workout.day === day) && (
            <p className="personal-empty">
              Aucune séance enregistrée pour cette date. Une durée suffit si
              vous ne suivez pas d’exercices.
            </p>
          )}
          <div className="personal-history">
            <h3>Votre progression, exercice par exercice</h3>
            <label>
              Exercice à comparer
              <select
                value={exerciseQuery}
                onChange={(event) => setExerciseQuery(event.target.value)}
              >
                <option value="">Choisir un exercice</option>
                {[
                  ...new Map(
                    data.workouts
                      .flatMap((workout) => workout.exercises)
                      .map((exercise) => [
                        normalizeFood(exercise.name),
                        exercise.name,
                      ]),
                  ).values(),
                ].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            {exerciseQuery && (
              <>
                <p className="muted small">
                  Charges et répétitions consignées, sans estimation de
                  performance. Les exercices portant le même nom sont
                  rapprochés.
                </p>
                <div className="exercise-history">
                  {exerciseHistory.slice(0, 30).map((exercise, index) => (
                    <div key={`${exercise.id}-${index}`}>
                      <span>{dateLabel(exercise.day)}</span>
                      <strong>{amount(exercise.load)} kg</strong>
                      <span>
                        {exercise.sets} × {exercise.reps}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <h3>Dernières séances</h3>
            {[...data.workouts]
              .sort(
                (a, b) =>
                  b.day.localeCompare(a.day) ||
                  b.createdAt.localeCompare(a.createdAt),
              )
              .slice(0, 20)
              .map((workout) => (
                <div className="personal-history-row" key={workout.id}>
                  <button
                    onClick={() =>
                      setEditor({ type: "workout", value: workout })
                    }
                  >
                    {workout.title}
                    <small>
                      {dateLabel(workout.day)} · {workout.minutes} min
                    </small>
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      setEditor({ type: "workout", value: workout, copy: true })
                    }
                  >
                    Reprendre comme modèle
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}
      {view === "food" && (
        <>
          <section className="panel">
            <div className="section-heading">
              <h2>Les repas du {dateLabel(day)}</h2>
              <span className="count">{mealsOfDay.length}</span>
            </div>
            {mealList}
            <p className="muted small">
              Marquer un repas comme pris conserve ses quantités et ne diminue
              pas le stock. Ajustez les réserves vous-même après utilisation.
            </p>
          </section>
          <div
            className="personal-food-tabs"
            role="group"
            aria-label="Cuisine et courses"
          >
            {(
              [
                { id: "recipes", label: "Recettes" },
                { id: "pantry", label: "Mon stock" },
                { id: "shopping", label: "Courses" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                aria-pressed={foodView === item.id}
                onClick={() => setFoodView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <section className="panel">
            {foodView === "recipes" && (
              <>
                <div className="section-heading">
                  <h2>Votre carnet de recettes</h2>
                  <button
                    className="button primary"
                    onClick={() => setEditor({ type: "recipe" })}
                  >
                    <Plus size={16} />
                    Nouvelle recette
                  </button>
                </div>
                <label className="personal-search">
                  Rechercher dans les recettes
                  <input
                    type="search"
                    maxLength={180}
                    value={recipeQuery}
                    onChange={(event) => setRecipeQuery(event.target.value)}
                  />
                </label>
                <div className="personal-recipe-grid">
                  {data.recipes
                    .filter((recipe) =>
                      normalizeFood(
                        recipe.title +
                          " " +
                          recipe.ingredients.map((item) => item.name).join(" "),
                      ).includes(normalizeFood(recipeQuery)),
                    )
                    .map((recipe) => (
                      <article className="personal-recipe" key={recipe.id}>
                        <div className="section-heading">
                          <Leaf size={21} />
                          <span>
                            {recipe.minutes} min · {recipe.portions} portion(s)
                          </span>
                          <button
                            className="icon-button delete"
                            aria-label={`Supprimer la recette ${recipe.title}`}
                            onClick={() =>
                              remove(
                                "recipes",
                                recipe,
                                `« ${recipe.title} » sera supprimée. Les repas déjà prévus ou pris seront conservés avec leurs quantités.`,
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <button
                          className="personal-title"
                          onClick={() =>
                            setEditor({ type: "recipe", value: recipe })
                          }
                        >
                          {recipe.title}
                        </button>
                        <details>
                          <summary>Ingrédients et préparation</summary>
                          <ul>
                            {recipe.ingredients.map((item, index) => (
                              <li key={index}>
                                {item.name} · {amount(item.quantity)}{" "}
                                {units[item.unit]}
                              </li>
                            ))}
                          </ul>
                          <p className="personal-notes">
                            {recipe.instructions ||
                              "Aucune instruction ajoutée."}
                          </p>
                        </details>
                        <button
                          className="text-button"
                          onClick={() => setEditor({ type: "meal", recipe })}
                        >
                          Prévoir un repas <ArrowRight size={14} />
                        </button>
                      </article>
                    ))}
                </div>
                {!data.recipes.length && (
                  <p className="personal-empty">
                    Ajoutez une recette avec ses ingrédients, puis prévoyez un
                    repas pour préparer les courses.
                  </p>
                )}
                {data.recipes.length > 0 &&
                  !data.recipes.some((recipe) =>
                    normalizeFood(
                      recipe.title +
                        " " +
                        recipe.ingredients.map((item) => item.name).join(" "),
                    ).includes(normalizeFood(recipeQuery)),
                  ) && (
                    <p className="personal-empty">
                      Aucune recette ne correspond à cette recherche.
                    </p>
                  )}
              </>
            )}
            {foodView === "pantry" && (
              <>
                <div className="section-heading">
                  <h2>Ce que vous avez</h2>
                  <button
                    className="button primary"
                    onClick={() => setEditor({ type: "pantry" })}
                  >
                    <Plus size={16} />
                    Ajouter au stock
                  </button>
                </div>
                <p className="muted small">
                  Quantités déclarées, sans déduction automatique. Ouvrez une
                  ligne pour l’ajuster ou supprimez-la lorsqu’elle est épuisée.
                </p>
                {data.pantry.map((item) => (
                  <div className="personal-stock-row" key={item.id}>
                    <button
                      onClick={() => setEditor({ type: "pantry", value: item })}
                    >
                      <strong>{item.name}</strong>
                      <small>
                        {amount(item.quantity)} {units[item.unit]}
                      </small>
                    </button>
                    <button
                      className="icon-button delete"
                      aria-label={`Retirer du stock ${item.name}`}
                      onClick={() => remove("pantry", item, item.name)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {!data.pantry.length && (
                  <p className="personal-empty">
                    Le stock est vide. Renseignez vos ingrédients avant de
                    calculer les manquants.
                  </p>
                )}
              </>
            )}
            {foodView === "shopping" && (
              <>
                <div className="section-heading">
                  <h2>Les courses, au juste besoin.</h2>
                  <button
                    className="button secondary"
                    onClick={() => setEditor({ type: "shopping" })}
                  >
                    <Plus size={16} />
                    Ajouter un achat
                  </button>
                </div>
                <p className="personal-hint">
                  Pour tous les repas encore prévus, le stock et les courses
                  déjà listées sont déduits. Les anciennes lignes ne sont pas
                  supprimées automatiquement.
                </p>
                <button
                  className="button primary"
                  disabled={busy || !missing.length}
                  onClick={() =>
                    run(
                      completeGroceries,
                      "Ingrédients manquants ajoutés aux courses",
                    )
                  }
                >
                  Compléter pour les repas prévus
                  {missing.length ? ` · ${missing.length}` : ""}
                </button>
                {!missing.length && (
                  <p className="muted small">
                    Aucun ingrédient supplémentaire à ajouter pour les repas
                    actuellement prévus.
                  </p>
                )}
                <div className="personal-checklist">
                  {data.shopping.map((item) => (
                    <div className="personal-check-row" key={item.id}>
                      <button
                        className="task-check"
                        disabled={busy}
                        aria-label={`${item.checked ? "Décocher" : "Acheter"} ${item.name}`}
                        onClick={() =>
                          run(
                            (previous) => ({
                              ...previous,
                              shopping: previous.shopping.map((value) =>
                                value.id === item.id
                                  ? { ...value, checked: !value.checked }
                                  : value,
                              ),
                            }),
                            item.checked ? "Achat décoché" : "Achat coché",
                          )
                        }
                      >
                        {item.checked && <Check size={14} />}
                      </button>
                      <button
                        className={`personal-row-title ${item.checked ? "is-done" : ""}`}
                        onClick={() =>
                          setEditor({ type: "shopping", value: item })
                        }
                      >
                        <strong>{item.name}</strong>
                        <small>
                          {amount(item.quantity)} {units[item.unit]}
                        </small>
                      </button>
                      <button
                        className="icon-button delete"
                        aria-label={`Supprimer l’achat ${item.name}`}
                        onClick={() => remove("shopping", item, item.name)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="button secondary"
                  disabled={busy || !data.shopping.some((item) => item.checked)}
                  onClick={() =>
                    run(
                      storePurchases,
                      "Achats cochés ajoutés au stock et retirés des courses",
                    )
                  }
                >
                  Ranger les achats cochés
                </button>
              </>
            )}
          </section>
        </>
      )}
      {view === "habits" && (
        <section className="panel">
          <div className="section-heading">
            <h2>Des repères qui tiennent.</h2>
            <button
              className="button primary"
              onClick={() => setEditor({ type: "habit" })}
            >
              <Plus size={16} />
              Nouvelle habitude
            </button>
          </div>
          <p className="muted small">
            Chaque coche correspond à une réalisation choisie. Aucune série ni
            journée manquante n’est inventée.
          </p>
          {habitList}
          <div
            className="personal-week"
            aria-label="Réalisations des sept derniers jours"
          >
            {recentDays.map((date) => (
              <div key={date}>
                <span>{dateLabel(date)}</span>
                <strong>
                  {
                    data.habitEntries.filter((entry) => entry.day === date)
                      .length
                  }
                </strong>
                <small>réalisation(s)</small>
              </div>
            ))}
          </div>
          <h3 className="personal-subtitle">Tous vos repères</h3>
          {data.habits.map((habit) => (
            <div className="personal-record" key={habit.id}>
              <div>
                <button
                  className="personal-title"
                  onClick={() => setEditor({ type: "habit", value: habit })}
                >
                  {habit.title}
                </button>
                <p>
                  {habit.weekdays
                    .map((value) => weekdays[value - 1])
                    .join(" · ")}{" "}
                  · {habit.paused ? "En pause" : "En cours"}
                </p>
                <small>Depuis le {dateLabel(habit.startDate)}</small>
              </div>
              <button
                className="icon-button delete"
                aria-label={`Supprimer l’habitude ${habit.title}`}
                onClick={() =>
                  setConfirm({
                    title: "Supprimer cette habitude et ses réalisations ?",
                    description: `« ${habit.title} » et son historique seront supprimés. La pause permet de les conserver.`,
                    run: () =>
                      commit(
                        (previous) => ({
                          ...previous,
                          habits: previous.habits.filter(
                            (value) => value.id !== habit.id,
                          ),
                          habitEntries: previous.habitEntries.filter(
                            (value) => value.habitId !== habit.id,
                          ),
                        }),
                        "Habitude et réalisations supprimées",
                      ),
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {data.habitEntries.length > 0 && (
            <div className="personal-history">
              <h3>Dernières réalisations</h3>
              {[...data.habitEntries]
                .sort((a, b) => b.day.localeCompare(a.day))
                .slice(0, 30)
                .map((entry) => (
                  <div className="personal-history-row" key={entry.id}>
                    <span>
                      {entry.title}
                      <small>{dateLabel(entry.day)}</small>
                    </span>
                    <button
                      className="text-button"
                      disabled={busy || entry.day > today}
                      aria-label={`Rouvrir l’habitude ${entry.title} du ${entry.day}`}
                      onClick={() =>
                        run(
                          (previous) =>
                            toggleHabit(
                              previous,
                              entry.habitId,
                              entry.day,
                              today,
                            ),
                          "Réalisation retirée pour ce jour",
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
      {view === "sleep" && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="personal-kicker">
                UNE NUIT PAR DATE DE RÉVEIL
              </span>
              <h2>Garder une trace du repos.</h2>
            </div>
            <button
              className="button primary"
              onClick={() => setEditor({ type: "sleep", value: summary.sleep })}
            >
              <Plus size={16} />
              {summary.sleep ? "Modifier la nuit" : "Enregistrer une nuit"}
            </button>
          </div>
          <p className="personal-hint">
            {weekSleep.length
              ? `Sur les 7 jours finissant le ${dateLabel(day)}, ${weekSleep.length} nuit(s) saisie(s) · moyenne calculée sur ces seules saisies : ${durationLabel(Math.round(weekSleep.reduce((sum, entry) => sum + sleepMinutes(entry), 0) / weekSleep.length))}.`
              : "Aucune nuit saisie sur ces sept jours. Les jours absents ne valent pas zéro heure de sommeil."}
          </p>
          <p className="muted small">
            Les durées et ressentis proviennent de vos entrées. Aucun conseil
            médical ni mesure automatique.
          </p>
          {summary.sleep && (
            <article className="personal-sleep-today">
              <Moon size={27} />
              <div>
                <span className="personal-kicker">
                  RÉVEIL DU {dateLabel(day)}
                </span>
                <strong>{durationLabel(sleepMinutes(summary.sleep))}</strong>
                <p>Ressenti : {summary.sleep.quality} / 5</p>
              </div>
            </article>
          )}
          <h3 className="personal-subtitle">
            Dernières nuits jusqu’au {dateLabel(day)}
          </h3>
          {sleepHistory.slice(0, 30).map((entry) => (
            <div className="personal-record" key={entry.id}>
              <div>
                <button
                  className="personal-title"
                  onClick={() => setEditor({ type: "sleep", value: entry })}
                >
                  {dateLabel(entry.wakeDay)} ·{" "}
                  {durationLabel(sleepMinutes(entry))}
                </button>
                <p>
                  {new Date(entry.start).toLocaleString("fr-FR")} →{" "}
                  {new Date(entry.end).toLocaleString("fr-FR")} · ressenti{" "}
                  {entry.quality}/5
                </p>
                {entry.notes && <p className="personal-notes">{entry.notes}</p>}
              </div>
              <button
                className="icon-button delete"
                aria-label={`Supprimer la nuit du ${entry.wakeDay}`}
                onClick={() =>
                  remove(
                    "sleep",
                    entry,
                    `Réveil du ${dateLabel(entry.wakeDay)}`,
                  )
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {!sleepHistory.length && (
            <p className="personal-empty">
              Enregistrez le début et la fin d’une nuit passée pour retrouver
              vos propres repères.
            </p>
          )}
        </section>
      )}
      {editor && (
        <Modal
          key={editor.type}
          close={close}
          title={
            editor.type === "workout"
              ? editor.copy
                ? "Reprendre une séance"
                : "Votre séance"
              : editor.type === "recipe"
                ? "Votre recette"
                : editor.type === "meal"
                  ? "Votre repas"
                  : editor.type === "pantry"
                    ? "Votre stock"
                    : editor.type === "shopping"
                      ? "Un achat"
                      : editor.type === "habit"
                        ? "Votre habitude"
                        : editor.type === "sleep"
                          ? "Votre nuit"
                          : "Sauvegarde de Vie"
          }
        >
          {editor.type === "workout" && (
            <WorkoutForm
              workout={editor.value}
              copy={editor.copy}
              day={day}
              today={today}
              close={close}
              save={(value) =>
                commit(
                  (previous) => ({
                    ...previous,
                    workouts: [
                      ...previous.workouts.filter(
                        (item) => item.id !== value.id,
                      ),
                      value,
                    ],
                  }),
                  "Séance enregistrée",
                )
              }
            />
          )}
          {editor.type === "recipe" && (
            <RecipeForm
              recipe={editor.value}
              close={close}
              save={(value) =>
                commit(
                  (previous) => ({
                    ...previous,
                    recipes: [
                      ...previous.recipes.filter(
                        (item) => item.id !== value.id,
                      ),
                      value,
                    ],
                  }),
                  "Recette enregistrée",
                )
              }
            />
          )}
          {editor.type === "meal" && (
            <MealForm
              recipe={editor.recipe}
              meal={editor.value}
              day={day}
              today={today}
              close={close}
              save={(value) =>
                commit(
                  (previous) => ({
                    ...previous,
                    meals: [
                      ...previous.meals.filter((item) => item.id !== value.id),
                      value,
                    ],
                  }),
                  "Repas enregistré",
                )
              }
            />
          )}
          {(editor.type === "pantry" || editor.type === "shopping") && (
            <IngredientForm
              item={editor.value}
              shopping={editor.type === "shopping"}
              close={close}
              save={async (value) => {
                if (
                  editor.type === "pantry" &&
                  data.pantry.some(
                    (item) =>
                      item.id !== value.id &&
                      foodKey(item.name, item.unit) ===
                        foodKey(value.name, value.unit),
                  )
                )
                  throw new Error(
                    "Cet ingrédient existe dans le stock. Ouvrez sa ligne pour modifier sa quantité.",
                  );
                await commit(
                  (previous) =>
                    editor.type === "pantry"
                      ? {
                          ...previous,
                          pantry: [
                            ...previous.pantry.filter(
                              (item) => item.id !== value.id,
                            ),
                            value as Ingredient,
                          ],
                        }
                      : {
                          ...previous,
                          shopping: [
                            ...previous.shopping.filter(
                              (item) => item.id !== value.id,
                            ),
                            value as ShoppingItem,
                          ],
                        },
                  "Quantité enregistrée",
                );
              }}
            />
          )}
          {editor.type === "habit" && (
            <HabitForm
              habit={editor.value}
              today={today}
              close={close}
              save={(value) =>
                commit(
                  (previous) => ({
                    ...previous,
                    habits: [
                      ...previous.habits.filter((item) => item.id !== value.id),
                      value,
                    ],
                  }),
                  "Habitude enregistrée",
                )
              }
            />
          )}
          {editor.type === "sleep" && (
            <SleepForm
              entry={editor.value}
              day={day > today ? today : day}
              data={data}
              close={close}
              save={(value) =>
                commit(
                  (previous) => ({
                    ...previous,
                    sleep: [
                      ...previous.sleep.filter((item) => item.id !== value.id),
                      value,
                    ],
                  }),
                  "Nuit enregistrée",
                )
              }
            />
          )}
          {editor.type === "backup" && (
            <PersonalBackupForm
              data={data}
              writing={busy}
              change={(operation) =>
                commit(operation, "Rubriques Vie restaurées")
              }
              close={close}
            />
          )}
        </Modal>
      )}
      {confirm && (
        <Modal
          title={confirm.title}
          close={() => {
            if (!deleting) setConfirm(null);
          }}
        >
          <div className="form">
            <p>{confirm.description}</p>
            {deleteError && (
              <p role="alert" className="error">
                {deleteError}
              </p>
            )}
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={deleting}
                onClick={() => setConfirm(null)}
              >
                Conserver
              </button>
              <button
                className="button danger"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await confirm.run();
                    setConfirm(null);
                  } catch {
                    setDeleteError(
                      "La suppression a échoué. Les données précédentes sont conservées. Réessayez.",
                    );
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                Confirmer la suppression Vie
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
