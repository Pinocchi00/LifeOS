import { describe, expect, it } from "vitest";
import { emptyData, parseBackup, serializeBackup } from "./model";
import {
  type Habit,
  type Recipe,
  type Sleep,
  type Workout,
  completeGroceries,
  emptyPersonal,
  habitDue,
  inputToISO,
  localInput,
  makeMeal,
  missingGroceries,
  parsePersonal,
  personalSchema,
  personalSummary,
  recipeSchema,
  recordedDay,
  restorePersonal,
  serializePersonal,
  sleepMinutes,
  sleepSchema,
  storePurchases,
  toggleHabit,
} from "./personal";
const createdAt = "2026-10-19T09:00:00.000Z";
const recipe = (patch: Partial<Recipe> = {}): Recipe => ({
  id: "recipe1",
  title: "Repas test",
  portions: 2,
  minutes: 20,
  ingredients: [{ name: "Riz", quantity: 200, unit: "g" }],
  instructions: "Préparer.",
  createdAt,
  ...patch,
});
const habit = (patch: Partial<Habit> = {}): Habit => ({
  id: "h1",
  title: "Un repère personnel",
  note: "",
  weekdays: [1, 2, 3, 4, 5],
  startDate: "2026-10-19",
  paused: false,
  createdAt,
  ...patch,
});
const workout: Workout = {
  id: "w1",
  title: "Séance réelle",
  day: "2026-10-19",
  minutes: 30,
  notes: "",
  exercises: [{ name: "Exercice", sets: 3, reps: 10, load: 20 }],
  createdAt,
};
const sleep: Sleep = {
  id: "s1",
  wakeDay: "2026-10-19",
  start: "2026-10-18T21:00:00.000Z",
  end: "2026-10-19T05:30:00.000Z",
  quality: 3,
  notes: "Note privée de nuit",
};
describe("Recettes, repas et courses", () => {
  it("ajuste les portions et garde un instantané indépendant de la recette", () => {
    const original = recipe();
    const meal = makeMeal(original, "2026-10-20", "soir", 3);
    expect(meal.ingredients[0].quantity).toBe(300);
    expect(meal.status).toBe("planned");
    original.ingredients[0].quantity = 900;
    original.title = "Autre nom";
    expect(meal.ingredients[0].quantity).toBe(300);
    expect(meal.title).toBe("Repas test");
  });
  it("additionne les repas et convertit g/kg en rapprochant accents et casse", () => {
    const base = recipe({
      ingredients: [{ name: "Blé", quantity: 200, unit: "g" }],
    });
    const data = {
      ...emptyPersonal(),
      meals: [
        makeMeal(base, "2026-10-19", "midi", 2),
        makeMeal(base, "2026-10-20", "midi", 2),
      ],
      pantry: [
        { id: "stock", name: " BLE ", quantity: 0.25, unit: "kg" as const },
      ],
    };
    expect(missingGroceries(data)).toEqual([
      { name: "Blé", quantity: 150, unit: "g" },
    ]);
    expect(
      missingGroceries({
        ...data,
        meals: data.meals.map((meal) => ({ ...meal, status: "eaten" })),
      }),
    ).toEqual([]);
  });
  it("ne mélange pas les volumes, poids et unités", () => {
    const data = {
      ...emptyPersonal(),
      meals: [
        makeMeal(
          recipe({ ingredients: [{ name: "Lait", quantity: 0.5, unit: "l" }] }),
          "2026-10-19",
          "midi",
          2,
        ),
      ],
      pantry: [{ id: "s", name: "Lait", quantity: 200, unit: "g" as const }],
    };
    expect(missingGroceries(data)).toEqual([
      { name: "Lait", quantity: 500, unit: "ml" },
    ]);
  });
  it("complète sans doublon puis range explicitement les achats dans le stock", () => {
    const data = {
      ...emptyPersonal(),
      meals: [makeMeal(recipe(), "2026-10-19", "midi", 2)],
      pantry: [{ id: "s", name: "riz", quantity: 0.05, unit: "kg" as const }],
    };
    const shopping = completeGroceries(data);
    expect(shopping.shopping).toHaveLength(1);
    expect(shopping.shopping[0].quantity).toBe(150);
    expect(completeGroceries(shopping)).toEqual(shopping);
    shopping.shopping[0].checked = true;
    expect(missingGroceries(shopping)).toEqual([]);
    const stored = storePurchases(shopping);
    expect(stored.pantry[0].quantity).toBe(0.2);
    expect(stored.shopping).toEqual([]);
    expect(storePurchases(stored)).toEqual(stored);
    expect(data.pantry[0].quantity).toBe(0.05);
  });
  it("refuse les quantités impossibles et ingrédients dupliqués d’une recette", () => {
    expect(recipeSchema.safeParse(recipe({ portions: 0 })).success).toBe(false);
    expect(
      recipeSchema.safeParse(
        recipe({ ingredients: [{ name: "Riz", quantity: -1, unit: "g" }] }),
      ).success,
    ).toBe(false);
    expect(
      recipeSchema.safeParse(
        recipe({
          ingredients: [
            { name: "Riz", quantity: 200, unit: "g" },
            { name: "RIZ", quantity: 0.2, unit: "kg" },
          ],
        }),
      ).success,
    ).toBe(false);
  });
});
describe("Suivis personnels datés", () => {
  it("enregistre et rouvre une habitude sans créer de tâche ni de réalisation future", () => {
    const data = { ...emptyPersonal(), habits: [habit()] };
    expect(habitDue(habit(), "2026-10-19")).toBe(true);
    expect(habitDue(habit(), "2026-10-18")).toBe(false);
    const done = toggleHabit(data, "h1", "2026-10-19", "2026-10-19");
    expect(done.habitEntries).toHaveLength(1);
    done.habits[0] = habit({ title: "Autre nom", paused: true });
    expect(done.habitEntries[0].title).toBe("Un repère personnel");
    expect(
      toggleHabit(done, "h1", "2026-10-19", "2026-10-19").habitEntries,
    ).toEqual([]);
    expect(() => toggleHabit(data, "h1", "2026-10-20", "2026-10-19")).toThrow(
      "future",
    );
    expect(() => recordedDay("2026-10-20", "2026-10-19")).toThrow();
  });
  it("calcule une nuit traversant minuit et refuse fin antérieure, excès et doublons", () => {
    expect(sleepMinutes(sleep)).toBe(510);
    expect(sleepSchema.safeParse({ ...sleep, end: sleep.start }).success).toBe(
      false,
    );
    expect(
      sleepSchema.safeParse({ ...sleep, end: "2026-10-20T05:30:00.000Z" })
        .success,
    ).toBe(false);
    expect(
      personalSchema.safeParse({
        ...emptyPersonal(),
        sleep: [sleep, { ...sleep, id: "s2" }],
      }).success,
    ).toBe(false);
  });
  it("respecte les instants réels lors du changement d’heure et les entrées locales", () => {
    expect(
      sleepMinutes({
        ...sleep,
        start: "2026-10-24T21:00:00.000Z",
        end: "2026-10-25T07:00:00.000Z",
      }),
    ).toBe(600);
    const local = "2026-10-19T07:30";
    expect(localInput(inputToISO(local))).toBe(local);
    expect(() => inputToISO("pas une date")).toThrow();
  });
  it("synthétise seulement les saisies du jour et des sept jours correspondants", () => {
    const data = {
      ...emptyPersonal(),
      workouts: [workout, { ...workout, id: "old", day: "2026-10-01" }],
      sleep: [sleep],
    };
    expect(personalSummary(data, "2026-10-19")).toMatchObject({
      workoutMinutes: 30,
      workoutCount: 1,
      habitsDone: 0,
      mealsEaten: 0,
      sleep,
    });
    expect(personalSummary(data, "2026-10-20").sleep).toBeUndefined();
  });
});
describe("Confidentialité et sauvegardes sélectives", () => {
  it("exclut tous les suivis Vie de l’export général et les autres rubriques de l’export sélectif", () => {
    const data = {
      ...emptyPersonal(),
      workouts: [workout],
      recipes: [recipe()],
      sleep: [sleep],
    };
    const cuisine = serializePersonal(data, ["cuisine"]);
    expect(Object.keys(parsePersonal(cuisine).sections)).toEqual(["cuisine"]);
    expect(cuisine).not.toContain("Note privée de nuit");
    expect(cuisine).not.toContain("Séance réelle");
    expect(serializeBackup(emptyData())).not.toContain("sleep");
    expect(() => parseBackup(cuisine)).toThrow();
    expect(() => parsePersonal(serializeBackup(emptyData()))).toThrow();
  });
  it("restaure uniquement les rubriques choisies et conserve le reste", () => {
    const original = {
      ...emptyPersonal(),
      workouts: [workout],
      sleep: [sleep],
    };
    const backup = parsePersonal(
      serializePersonal({ ...emptyPersonal(), recipes: [recipe()] }, [
        "cuisine",
      ]),
    );
    const restored = restorePersonal(original, backup, ["cuisine"]);
    expect(restored.recipes).toHaveLength(1);
    expect(restored.workouts).toEqual([workout]);
    expect(restored.sleep).toEqual([sleep]);
    expect(() => restorePersonal(original, backup, ["sommeil"])).toThrow();
    expect(() => serializePersonal(original, [])).toThrow();
  });
  it("valide l’aller-retour complet, les références et les doublons", () => {
    const data = toggleHabit(
      {
        ...emptyPersonal(),
        workouts: [workout],
        sleep: [sleep],
        recipes: [recipe()],
        habits: [habit()],
      },
      "h1",
      "2026-10-19",
      "2026-10-19",
    );
    expect(
      restorePersonal(
        emptyPersonal(),
        parsePersonal(
          serializePersonal(data, ["sport", "cuisine", "habitudes", "sommeil"]),
        ),
        ["sport", "cuisine", "habitudes", "sommeil"],
      ),
    ).toEqual(data);
    expect(personalSchema.safeParse({ ...data, habits: [] }).success).toBe(
      false,
    );
    expect(
      personalSchema.safeParse({
        ...data,
        habitEntries: [
          ...data.habitEntries,
          { ...data.habitEntries[0], id: "duplicate" },
        ],
      }).success,
    ).toBe(false);
    expect(() => parsePersonal(" ".repeat(10 * 1024 * 1024 + 1))).toThrow(
      "10 Mo",
    );
  });
});
