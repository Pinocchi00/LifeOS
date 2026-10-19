import { z } from "zod";
import { day, id, text, title } from "./validation";
import { localDay } from "./model";
import { addDays } from "./planning";

export const unitSchema = z.enum(["g", "kg", "ml", "l", "piece"]);
export const units = { g: "g", kg: "kg", ml: "ml", l: "l", piece: "unité(s)" };
export type Unit = z.infer<typeof unitSchema>;
const quantity = z.number().finite().positive().max(1000000);
export const ingredientSchema = z
  .object({ name: title, quantity, unit: unitSchema })
  .strict();
export const normalizeFood = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr")
    .trim()
    .replace(/\s+/g, " ");
const baseUnit = (unit: Unit) =>
  unit === "kg" ? "g" : unit === "l" ? "ml" : unit;
const baseQuantity = (value: number, unit: Unit) =>
  value * (unit === "kg" || unit === "l" ? 1000 : 1);
export const foodKey = (name: string, unit: Unit) =>
  `${normalizeFood(name)}/${baseUnit(unit)}`;
export const recipeSchema = z
  .object({
    id,
    title,
    portions: z.number().int().min(1).max(100),
    minutes: z.number().int().min(1).max(1440),
    ingredients: z.array(ingredientSchema).min(1).max(100),
    instructions: text,
    createdAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (recipe) =>
      new Set(recipe.ingredients.map((item) => foodKey(item.name, item.unit)))
        .size === recipe.ingredients.length,
    "Regroupez les ingrédients identiques de même unité.",
  );
export const pantrySchema = ingredientSchema
  .extend({ id })
  .refine((item) => !!normalizeFood(item.name));
export const shoppingSchema = ingredientSchema.extend({
  id,
  checked: z.boolean(),
});
export const mealSchema = z
  .object({
    id,
    day,
    slot: z.enum(["matin", "midi", "soir", "autre"]),
    title,
    portions: quantity.max(100),
    ingredients: z.array(ingredientSchema).min(1).max(100),
    status: z.enum(["planned", "eaten"]),
    createdAt: z.string().datetime(),
  })
  .strict();
export const exerciseSchema = z
  .object({
    name: title,
    sets: z.number().int().min(1).max(100),
    reps: z.number().int().min(1).max(1000),
    load: z.number().min(0).max(1000),
  })
  .strict();
export const workoutSchema = z
  .object({
    id,
    day,
    title,
    minutes: z.number().int().min(1).max(1440),
    notes: text,
    exercises: z.array(exerciseSchema).max(100),
    createdAt: z.string().datetime(),
  })
  .strict();
export const habitSchema = z
  .object({
    id,
    title,
    note: text,
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1)
      .max(7)
      .refine((values) => new Set(values).size === values.length),
    startDate: day,
    paused: z.boolean(),
    createdAt: z.string().datetime(),
  })
  .strict();
export const habitEntrySchema = z
  .object({ id, habitId: id, day, title, completedAt: z.string().datetime() })
  .strict();
export const sleepSchema = z
  .object({
    id,
    wakeDay: day,
    start: z.string().datetime(),
    end: z.string().datetime(),
    quality: z.number().int().min(1).max(5),
    notes: text,
  })
  .strict()
  .refine((value) => {
    const duration = Date.parse(value.end) - Date.parse(value.start);
    return duration > 0 && duration <= 24 * 60 * 60 * 1000;
  }, "Vérifiez les heures : la fin doit suivre le début, dans une période de 24 h au maximum.");
export const personalSchema = z
  .object({
    version: z.literal(1),
    workouts: z.array(workoutSchema).max(10000),
    recipes: z.array(recipeSchema).max(2000),
    pantry: z.array(pantrySchema).max(5000),
    shopping: z.array(shoppingSchema).max(5000),
    meals: z.array(mealSchema).max(20000),
    habits: z.array(habitSchema).max(2000),
    habitEntries: z.array(habitEntrySchema).max(50000),
    sleep: z.array(sleepSchema).max(10000),
  })
  .strict()
  .superRefine((data, context) => {
    const items = [
      ...data.workouts,
      ...data.recipes,
      ...data.pantry,
      ...data.shopping,
      ...data.meals,
      ...data.habits,
      ...data.habitEntries,
      ...data.sleep,
    ];
    if (new Set(items.map((item) => item.id)).size !== items.length)
      context.addIssue({
        code: "custom",
        message: "Identifiants Vie dupliqués.",
      });
    if (
      new Set(data.pantry.map((item) => foodKey(item.name, item.unit))).size !==
      data.pantry.length
    )
      context.addIssue({
        code: "custom",
        message: "Ingrédient du stock dupliqué : modifiez sa quantité.",
      });
    const habits = new Set(data.habits.map((item) => item.id));
    const pairs = data.habitEntries.map(
      (entry) => `${entry.habitId}/${entry.day}`,
    );
    if (
      new Set(pairs).size !== pairs.length ||
      data.habitEntries.some((entry) => !habits.has(entry.habitId))
    )
      context.addIssue({
        code: "custom",
        message: "Réalisation d’habitude dupliquée ou orpheline.",
      });
    if (
      new Set(data.sleep.map((entry) => entry.wakeDay)).size !==
      data.sleep.length
    )
      context.addIssue({
        code: "custom",
        message: "Une nuit est déjà enregistrée pour ce réveil. Modifiez-la.",
      });
  });
export type PersonalData = z.infer<typeof personalSchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type Ingredient = z.infer<typeof pantrySchema>;
export type ShoppingItem = z.infer<typeof shoppingSchema>;
export type Meal = z.infer<typeof mealSchema>;
export type Habit = z.infer<typeof habitSchema>;
export type Sleep = z.infer<typeof sleepSchema>;
export const emptyPersonal = (): PersonalData => ({
  version: 1,
  workouts: [],
  recipes: [],
  pantry: [],
  shopping: [],
  meals: [],
  habits: [],
  habitEntries: [],
  sleep: [],
});

export const sectionNames = {
  sport: "Sport",
  cuisine: "Cuisine, stock, repas et courses",
  habitudes: "Habitudes et réalisations",
  sommeil: "Sommeil",
};
export type PersonalSection = keyof typeof sectionNames;
const sectionsSchema = z
  .object({
    sport: z
      .object({ workouts: z.array(workoutSchema).max(10000) })
      .strict()
      .optional(),
    cuisine: z
      .object({
        recipes: z.array(recipeSchema).max(2000),
        pantry: z.array(pantrySchema).max(5000),
        shopping: z.array(shoppingSchema).max(5000),
        meals: z.array(mealSchema).max(20000),
      })
      .strict()
      .optional(),
    habitudes: z
      .object({
        habits: z.array(habitSchema).max(2000),
        habitEntries: z.array(habitEntrySchema).max(50000),
      })
      .strict()
      .optional(),
    sommeil: z
      .object({ sleep: z.array(sleepSchema).max(10000) })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (sections) => Object.keys(sections).length > 0,
    "Choisissez au moins une rubrique.",
  );
export const personalBackupSchema = z
  .object({
    application: z.literal("LifeOS-Vie"),
    version: z.literal(1),
    exportedAt: z.string().datetime(),
    sections: sectionsSchema,
  })
  .strict()
  .superRefine((backup, context) => {
    const candidate = {
      ...emptyPersonal(),
      ...Object.assign({}, ...Object.values(backup.sections)),
    };
    if (!personalSchema.safeParse(candidate).success)
      context.addIssue({
        code: "custom",
        message: "Le contenu Vie est incohérent.",
      });
  });
export type PersonalBackup = z.infer<typeof personalBackupSchema>;
export function serializePersonal(
  data: PersonalData,
  included: PersonalSection[],
) {
  const sections: PersonalBackup["sections"] = {};
  if (included.includes("sport")) sections.sport = { workouts: data.workouts };
  if (included.includes("cuisine"))
    sections.cuisine = {
      recipes: data.recipes,
      pantry: data.pantry,
      shopping: data.shopping,
      meals: data.meals,
    };
  if (included.includes("habitudes"))
    sections.habitudes = {
      habits: data.habits,
      habitEntries: data.habitEntries,
    };
  if (included.includes("sommeil")) sections.sommeil = { sleep: data.sleep };
  const raw = JSON.stringify(
    personalBackupSchema.parse({
      application: "LifeOS-Vie",
      version: 1,
      exportedAt: new Date().toISOString(),
      sections,
    }),
    null,
    2,
  );
  if (new TextEncoder().encode(raw).length > 10 * 1024 * 1024)
    throw new Error(
      "Choisissez moins de rubriques : le fichier dépasse 10 Mo.",
    );
  return raw;
}
export function parsePersonal(raw: string) {
  if (new TextEncoder().encode(raw).length > 10 * 1024 * 1024)
    throw new Error("Fichier Vie limité à 10 Mo.");
  return personalBackupSchema.parse(JSON.parse(raw));
}
export function restorePersonal(
  data: PersonalData,
  backup: PersonalBackup,
  selected: PersonalSection[],
): PersonalData {
  const valid = personalBackupSchema.parse(backup);
  if (!selected.length || selected.some((section) => !valid.sections[section]))
    throw new Error("Sélection de rubriques invalide.");
  return personalSchema.parse({
    ...data,
    ...Object.assign({}, ...selected.map((section) => valid.sections[section])),
  });
}
export function habitDue(habit: Habit, day: string) {
  return (
    !habit.paused &&
    day >= habit.startDate &&
    habit.weekdays.includes(
      ((new Date(day + "T12:00:00").getDay() + 6) % 7) + 1,
    )
  );
}
export function toggleHabit(
  data: PersonalData,
  habitId: string,
  day: string,
  today: string,
): PersonalData {
  if (day > today)
    throw new Error("Une réalisation future ne peut pas être enregistrée.");
  const existing = data.habitEntries.find(
    (entry) => entry.habitId === habitId && entry.day === day,
  );
  const habit = data.habits.find((item) => item.id === habitId);
  if (!habit || (!existing && !habitDue(habit, day)))
    throw new Error("Habitude non prévue ce jour.");
  return {
    ...data,
    habitEntries: existing
      ? data.habitEntries.filter((entry) => entry.id !== existing.id)
      : [
          ...data.habitEntries,
          {
            id: crypto.randomUUID(),
            habitId,
            day,
            title: habit.title,
            completedAt: new Date().toISOString(),
          },
        ],
  };
}
export const sleepMinutes = (entry: Sleep) =>
  Math.round((Date.parse(entry.end) - Date.parse(entry.start)) / 60000);
export function personalSummary(data: PersonalData, day: string) {
  const start = addDays(day, -6);
  return {
    workoutMinutes: data.workouts
      .filter((item) => item.day === day)
      .reduce((sum, item) => sum + item.minutes, 0),
    workoutCount: data.workouts.filter(
      (item) => item.day >= start && item.day <= day,
    ).length,
    habitsDone: data.habitEntries.filter((item) => item.day === day).length,
    mealsPlanned: data.meals.filter(
      (item) => item.day === day && item.status === "planned",
    ).length,
    mealsEaten: data.meals.filter(
      (item) => item.day === day && item.status === "eaten",
    ).length,
    sleep: data.sleep.find((item) => item.wakeDay === day),
  };
}
export function makeMeal(
  recipe: Pick<Recipe, "title" | "ingredients" | "portions">,
  day: string,
  slot: Meal["slot"],
  portions: number,
): Meal {
  return mealSchema.parse({
    id: crypto.randomUUID(),
    day,
    slot,
    title: recipe.title,
    portions,
    ingredients: recipe.ingredients.map((item) => ({
      ...item,
      quantity: Number(
        ((item.quantity * portions) / recipe.portions).toFixed(4),
      ),
    })),
    status: "planned",
    createdAt: new Date().toISOString(),
  });
}
export function missingGroceries(data: PersonalData) {
  const needs = new Map<
    string,
    { name: string; quantity: number; unit: Unit }
  >();
  for (const meal of data.meals.filter((item) => item.status === "planned"))
    for (const item of meal.ingredients) {
      const key = foodKey(item.name, item.unit);
      const current = needs.get(key);
      needs.set(key, {
        name: current?.name ?? item.name,
        quantity:
          (current?.quantity ?? 0) + baseQuantity(item.quantity, item.unit),
        unit: baseUnit(item.unit),
      });
    }
  return [...needs.entries()]
    .map(([key, item]) => {
      const stock = data.pantry
        .filter((value) => foodKey(value.name, value.unit) === key)
        .reduce(
          (sum, value) => sum + baseQuantity(value.quantity, value.unit),
          0,
        );
      const listed = data.shopping
        .filter((value) => foodKey(value.name, value.unit) === key)
        .reduce(
          (sum, value) => sum + baseQuantity(value.quantity, value.unit),
          0,
        );
      return {
        ...item,
        quantity: Number(
          Math.max(0, item.quantity - stock - listed).toFixed(4),
        ),
      };
    })
    .filter((item) => item.quantity > 0);
}
export function completeGroceries(data: PersonalData): PersonalData {
  return {
    ...data,
    shopping: [
      ...data.shopping,
      ...missingGroceries(data).map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        checked: false,
      })),
    ],
  };
}
export function storePurchases(data: PersonalData): PersonalData {
  const pantry = data.pantry.map((item) => ({ ...item }));
  for (const item of data.shopping.filter((item) => item.checked)) {
    const existing = pantry.find(
      (value) =>
        foodKey(value.name, value.unit) === foodKey(item.name, item.unit),
    );
    if (existing)
      existing.quantity = Number(
        (
          (baseQuantity(existing.quantity, existing.unit) +
            baseQuantity(item.quantity, item.unit)) /
          (existing.unit === "kg" || existing.unit === "l" ? 1000 : 1)
        ).toFixed(4),
      );
    else
      pantry.push({
        id: crypto.randomUUID(),
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      });
  }
  return {
    ...data,
    pantry,
    shopping: data.shopping.filter((item) => !item.checked),
  };
}
export function recordedDay(day: string, today = localDay()) {
  if (day > today)
    throw new Error("Choisissez une date déjà passée ou aujourd’hui.");
}
export const localInput = (iso: string) => {
  const date = new Date(iso);
  return `${localDay(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
export function inputToISO(value: string) {
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime()) ||
    localInput(parsed.toISOString()) !== value
  )
    throw new Error("Cette heure n’existe pas dans le fuseau local.");
  return parsed.toISOString();
}
