import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { addDays } from "../../domain/planning";
import {
  type Workout,
  type Recipe,
  type Ingredient,
  type ShoppingItem,
  type Habit,
  type Sleep,
  type Meal,
  type PersonalData,
  workoutSchema,
  recipeSchema,
  pantrySchema,
  shoppingSchema,
  habitSchema,
  sleepSchema,
  units,
  makeMeal,
  recordedDay,
  localInput,
  inputToISO,
} from "../../domain/personal";

function useSave<T>(save: (value: T) => Promise<void>, close: () => void) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function run(parse: () => T) {
    setError("");
    setSaving(true);
    try {
      const value = parse();
      await save(value);
      close();
    } catch (error) {
      setError(
        error instanceof z.ZodError
          ? "Vérifiez les champs, les quantités et les dates du formulaire."
          : error instanceof Error
            ? error.message
            : "Enregistrement impossible. Réessayez.",
      );
    } finally {
      setSaving(false);
    }
  }
  return { run, error, saving };
}
function Actions({
  state,
  close,
  label,
}: {
  state: { error: string; saving: boolean };
  close: () => void;
  label: string;
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
          className="button secondary"
          type="button"
          onClick={close}
          disabled={state.saving}
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
export function WorkoutForm({
  workout,
  copy,
  day,
  today,
  save,
  close,
}: {
  workout?: Workout;
  copy?: boolean;
  day: string;
  today: string;
  save: (value: Workout) => Promise<void>;
  close: () => void;
}) {
  const [exercises, setExercises] = useState(() =>
    (workout?.exercises ?? []).map((item) => ({
      ...item,
      key: crypto.randomUUID(),
    })),
  );
  const state = useSave(save, close);
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void state.run(() => {
          const day = String(values.get("day"));
          recordedDay(day, today);
          return workoutSchema.parse({
            id: !copy && workout ? workout.id : crypto.randomUUID(),
            day,
            title: values.get("title"),
            minutes: Number(values.get("minutes")),
            notes: values.get("notes"),
            exercises: exercises.map(({ key }) => ({
              name: values.get(`exercise-${key}`),
              sets: Number(values.get(`sets-${key}`)),
              reps: Number(values.get(`reps-${key}`)),
              load: Number(values.get(`load-${key}`)),
            })),
            createdAt:
              !copy && workout ? workout.createdAt : new Date().toISOString(),
          });
        });
      }}
    >
      {copy && (
        <p className="personal-hint">
          Cette séance sert de modèle. Ajustez les valeurs à ce que vous avez
          réellement fait avant d’enregistrer.
        </p>
      )}
      <label>
        Nom de la séance
        <input
          name="title"
          required
          maxLength={180}
          defaultValue={workout?.title}
          placeholder="Marche, mobilité, séance de force…"
        />
      </label>
      <div className="form-grid">
        <label>
          Date de la séance
          <input
            type="date"
            name="day"
            required
            max={today}
            defaultValue={
              !copy && workout ? workout.day : day > today ? today : day
            }
          />
        </label>
        <label>
          Durée réalisée (minutes)
          <input
            type="number"
            name="minutes"
            min={1}
            max={1440}
            required
            defaultValue={workout?.minutes ?? 30}
          />
        </label>
      </div>
      <fieldset className="schedule-fields">
        <legend>Exercices (facultatifs)</legend>
        <p className="muted small">
          Les charges sont en kg. Laissez cette partie vide pour une activité
          suivie uniquement par sa durée.
        </p>
        {exercises.map((exercise, index) => (
          <div className="personal-form-row" key={exercise.key}>
            <label>
              Exercice {index + 1}
              <input
                name={`exercise-${exercise.key}`}
                required
                maxLength={180}
                defaultValue={exercise.name}
              />
            </label>
            <div className="form-grid">
              <label>
                Séries {index + 1}
                <input
                  name={`sets-${exercise.key}`}
                  type="number"
                  min={1}
                  max={100}
                  required
                  defaultValue={exercise.sets}
                />
              </label>
              <label>
                Répétitions {index + 1}
                <input
                  name={`reps-${exercise.key}`}
                  type="number"
                  min={1}
                  max={1000}
                  required
                  defaultValue={exercise.reps}
                />
              </label>
              <label>
                Charge {index + 1} (kg)
                <input
                  name={`load-${exercise.key}`}
                  type="number"
                  min={0}
                  max={1000}
                  step="0.1"
                  required
                  defaultValue={exercise.load}
                />
              </label>
            </div>
            <button
              type="button"
              data-dirties
              className="text-button"
              onClick={() =>
                setExercises((current) =>
                  current.filter((item) => item.key !== exercise.key),
                )
              }
            >
              <Trash2 size={13} />
              Retirer l’exercice {index + 1}
            </button>
          </div>
        ))}
        <button
          className="text-button"
          type="button"
          data-dirties
          disabled={exercises.length >= 100}
          onClick={() =>
            setExercises((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                name: "",
                sets: 3,
                reps: 10,
                load: 0,
              },
            ])
          }
        >
          <Plus size={14} />
          Ajouter un exercice
        </button>
      </fieldset>
      <label>
        Notes de séance
        <textarea
          name="notes"
          rows={2}
          maxLength={10000}
          defaultValue={workout?.notes}
        />
      </label>
      <Actions state={state} close={close} label="Enregistrer la séance" />
    </form>
  );
}
export function RecipeForm({
  recipe,
  save,
  close,
}: {
  recipe?: Recipe;
  save: (value: Recipe) => Promise<void>;
  close: () => void;
}) {
  const [ingredients, setIngredients] = useState<
    Array<{
      key: string;
      name: string;
      quantity: number;
      unit: Ingredient["unit"];
    }>
  >(() =>
    (
      recipe?.ingredients ?? [{ name: "", quantity: 1, unit: "piece" as const }]
    ).map((item) => ({ ...item, key: crypto.randomUUID() })),
  );
  const state = useSave(save, close);
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void state.run(() =>
          recipeSchema.parse({
            id: recipe?.id ?? crypto.randomUUID(),
            title: values.get("title"),
            portions: Number(values.get("portions")),
            minutes: Number(values.get("minutes")),
            ingredients: ingredients.map(({ key }) => ({
              name: values.get(`name-${key}`),
              quantity: Number(values.get(`quantity-${key}`)),
              unit: values.get(`unit-${key}`),
            })),
            instructions: values.get("instructions"),
            createdAt: recipe?.createdAt ?? new Date().toISOString(),
          }),
        );
      }}
    >
      <label>
        Nom de la recette
        <input
          name="title"
          required
          maxLength={180}
          defaultValue={recipe?.title}
        />
      </label>
      <div className="form-grid">
        <label>
          Nombre de portions
          <input
            name="portions"
            type="number"
            min={1}
            max={100}
            required
            defaultValue={recipe?.portions ?? 2}
          />
        </label>
        <label>
          Temps de préparation (minutes)
          <input
            name="minutes"
            type="number"
            min={1}
            max={1440}
            required
            defaultValue={recipe?.minutes ?? 20}
          />
        </label>
      </div>
      <fieldset className="schedule-fields">
        <legend>Ingrédients</legend>
        {ingredients.map((item, index) => (
          <div className="personal-form-row" key={item.key}>
            <label>
              Nom de l’ingrédient {index + 1}
              <input
                name={`name-${item.key}`}
                required
                maxLength={180}
                defaultValue={item.name}
              />
            </label>
            <div className="form-grid">
              <label>
                Quantité {index + 1}
                <input
                  type="number"
                  name={`quantity-${item.key}`}
                  min={0.0001}
                  max={1000000}
                  step="any"
                  required
                  defaultValue={item.quantity}
                />
              </label>
              <label>
                Unité {index + 1}
                <select name={`unit-${item.key}`} defaultValue={item.unit}>
                  {Object.entries(units).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              data-dirties
              className="text-button"
              disabled={ingredients.length === 1}
              onClick={() =>
                setIngredients((current) =>
                  current.filter((value) => value.key !== item.key),
                )
              }
            >
              <Trash2 size={13} />
              Retirer l’ingrédient {index + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          data-dirties
          className="text-button"
          disabled={ingredients.length >= 100}
          onClick={() =>
            setIngredients((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                name: "",
                quantity: 1,
                unit: "piece",
              },
            ])
          }
        >
          <Plus size={14} />
          Ajouter un ingrédient
        </button>
      </fieldset>
      <label>
        Préparation
        <textarea
          name="instructions"
          maxLength={10000}
          rows={4}
          defaultValue={recipe?.instructions}
        />
      </label>
      <Actions state={state} close={close} label="Enregistrer la recette" />
    </form>
  );
}
export function IngredientForm({
  item,
  shopping,
  save,
  close,
}: {
  item?: Ingredient | ShoppingItem;
  shopping: boolean;
  save: (value: Ingredient | ShoppingItem) => Promise<void>;
  close: () => void;
}) {
  const state = useSave(save, close);
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void state.run(() =>
          (shopping ? shoppingSchema : pantrySchema).parse({
            id: item?.id ?? crypto.randomUUID(),
            name: values.get("name"),
            quantity: Number(values.get("quantity")),
            unit: values.get("unit"),
            ...(shopping
              ? { checked: item && "checked" in item ? item.checked : false }
              : {}),
          }),
        );
      }}
    >
      <label>
        Nom de l’ingrédient
        <input
          name="name"
          required
          maxLength={180}
          defaultValue={item?.name}
          placeholder="Le même nom que dans vos recettes"
        />
      </label>
      <div className="form-grid">
        <label>
          Quantité
          <input
            name="quantity"
            type="number"
            required
            min={0.0001}
            max={1000000}
            step="any"
            defaultValue={item?.quantity ?? 1}
          />
        </label>
        <label>
          Unité
          <select name="unit" defaultValue={item?.unit ?? "piece"}>
            {Object.entries(units).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small">
        Les noms sont rapprochés sans tenir compte des accents ou des
        majuscules. g/kg et ml/l sont convertis ; les unités et les poids
        restent distincts.
      </p>
      <Actions
        state={state}
        close={close}
        label={shopping ? "Enregistrer l’achat" : "Enregistrer le stock"}
      />
    </form>
  );
}
export function MealForm({
  recipe,
  meal,
  day,
  today,
  save,
  close,
}: {
  recipe: Recipe | Meal;
  meal?: Meal;
  day: string;
  today: string;
  save: (value: Meal) => Promise<void>;
  close: () => void;
}) {
  const state = useSave(save, close);
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void state.run(() => {
          const selectedDay = String(values.get("day"));
          if (meal?.status === "eaten") recordedDay(selectedDay, today);
          const next = makeMeal(
            recipe,
            selectedDay,
            values.get("slot") as Meal["slot"],
            Number(values.get("portions")),
          );
          return meal
            ? {
                ...next,
                id: meal.id,
                status: meal.status,
                createdAt: meal.createdAt,
              }
            : next;
        });
      }}
    >
      <p className="personal-hint">
        {recipe.title} · les quantités sont ajustées au nombre de portions et
        conservées avec ce repas.
      </p>
      <label>
        Jour du repas
        <input
          name="day"
          type="date"
          required
          defaultValue={meal?.day ?? day}
        />
      </label>
      <div className="form-grid">
        <label>
          Moment du repas
          <select name="slot" defaultValue={meal?.slot ?? "midi"}>
            <option value="matin">Matin</option>
            <option value="midi">Midi</option>
            <option value="soir">Soir</option>
            <option value="autre">Autre</option>
          </select>
        </label>
        <label>
          Portions prévues
          <input
            name="portions"
            type="number"
            min={0.1}
            max={100}
            step="0.1"
            required
            defaultValue={recipe.portions}
          />
        </label>
      </div>
      <Actions
        state={state}
        close={close}
        label={meal ? "Enregistrer le repas" : "Prévoir ce repas"}
      />
    </form>
  );
}
export function HabitForm({
  habit,
  today,
  save,
  close,
}: {
  habit?: Habit;
  today: string;
  save: (value: Habit) => Promise<void>;
  close: () => void;
}) {
  const state = useSave(save, close);
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void state.run(() =>
          habitSchema.parse({
            id: habit?.id ?? crypto.randomUUID(),
            title: values.get("title"),
            note: values.get("note"),
            weekdays: values.getAll("weekdays").map(Number),
            startDate: values.get("startDate"),
            paused: values.has("paused"),
            createdAt: habit?.createdAt ?? new Date().toISOString(),
          }),
        );
      }}
    >
      <label>
        Nom de l’habitude
        <input
          name="title"
          required
          maxLength={180}
          defaultValue={habit?.title}
          placeholder="Un repère personnel simple"
        />
      </label>
      <label>
        Ce qui m’aide
        <textarea
          name="note"
          rows={2}
          maxLength={10000}
          defaultValue={habit?.note}
        />
      </label>
      <fieldset className="schedule-fields">
        <legend>Jours choisis</legend>
        <div className="weekday-picker">
          {[
            "Lundi",
            "Mardi",
            "Mercredi",
            "Jeudi",
            "Vendredi",
            "Samedi",
            "Dimanche",
          ].map((name, index) => (
            <label key={name}>
              <input
                type="checkbox"
                name="weekdays"
                value={index + 1}
                defaultChecked={
                  habit ? habit.weekdays.includes(index + 1) : true
                }
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        Premier jour
        <input
          type="date"
          name="startDate"
          required
          defaultValue={habit?.startDate ?? today}
        />
      </label>
      <label className="check-label">
        <input type="checkbox" name="paused" defaultChecked={habit?.paused} />
        Mettre cette habitude en pause
      </label>
      <p className="muted small">
        Les réalisations restent dans Vie. Elles ne créent pas de tâche et
        n’entrent pas dans la recherche générale.
      </p>
      <Actions state={state} close={close} label="Enregistrer l’habitude" />
    </form>
  );
}
export function SleepForm({
  entry,
  day,
  save,
  close,
  data,
}: {
  entry?: Sleep;
  day: string;
  data: PersonalData;
  save: (value: Sleep) => Promise<void>;
  close: () => void;
}) {
  const state = useSave(save, close);
  const [start, setStart] = useState(
    entry ? localInput(entry.start) : `${addDays(day, -1)}T23:00`,
  );
  const [end, setEnd] = useState(
    entry ? localInput(entry.end) : `${day}T07:00`,
  );
  const duration =
    (new Date(end).getTime() - new Date(start).getTime()) / 60000;
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        void state.run(() => {
          const startISO = inputToISO(start),
            endISO = inputToISO(end);
          if (Date.parse(endISO) > Date.now())
            throw new Error("Le réveil doit être déjà passé.");
          const wakeDay = end.slice(0, 10);
          if (
            data.sleep.some(
              (value) => value.wakeDay === wakeDay && value.id !== entry?.id,
            )
          )
            throw new Error(
              "Une nuit est déjà enregistrée à cette date. Ouvrez-la pour la modifier.",
            );
          return sleepSchema.parse({
            id: entry?.id ?? crypto.randomUUID(),
            wakeDay,
            start: startISO,
            end: endISO,
            quality: Number(values.get("quality")),
            notes: values.get("notes"),
          });
        });
      }}
    >
      <div className="form-grid">
        <label>
          Début du sommeil
          <input
            type="datetime-local"
            required
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          Réveil
          <input
            type="datetime-local"
            required
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>
      <p className="personal-hint">
        {Number.isFinite(duration) && duration > 0 && duration <= 1440
          ? `Durée calculée : ${Math.floor(duration / 60)} h ${Math.round(duration % 60)} min.`
          : "Renseignez une période cohérente de 24 h au maximum."}{" "}
        Une entrée par date de réveil.
      </p>
      <label>
        Ressenti au réveil
        <select name="quality" defaultValue={entry?.quality ?? 3}>
          <option value={1}>1 · Très difficile</option>
          <option value={2}>2 · Difficile</option>
          <option value={3}>3 · Moyen</option>
          <option value={4}>4 · Bon</option>
          <option value={5}>5 · Très bon</option>
        </select>
      </label>
      <label>
        Note personnelle
        <textarea
          name="notes"
          rows={2}
          maxLength={10000}
          defaultValue={entry?.notes}
        />
      </label>
      <p className="muted small">
        Ce carnet décrit vos saisies. Il ne produit ni diagnostic ni estimation
        automatique du sommeil.
      </p>
      <Actions state={state} close={close} label="Enregistrer la nuit" />
    </form>
  );
}
