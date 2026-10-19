import { z } from "zod";
import { day, id, text, title } from "./validation";

export const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const scheduleSchema = z
  .object({
    day,
    start: clock,
    duration: z.number().int().min(5).max(720),
  })
  .strict()
  .refine(
    (value) => minutes(value.start) + value.duration <= 1440,
    "Le créneau doit se terminer avant minuit.",
  );
export const routineSchema = z
  .object({
    id,
    title,
    description: text,
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1)
      .max(7)
      .refine((values) => new Set(values).size === values.length),
    startDate: day,
    endDate: day.or(z.literal("")),
    time: clock.or(z.literal("")),
    duration: z.number().int().min(5).max(720),
    paused: z.boolean(),
    createdAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (value) => !value.endDate || value.endDate >= value.startDate,
    "La fin doit suivre le début.",
  )
  .refine(
    (value) => !value.time || minutes(value.time) + value.duration <= 1440,
    "Le créneau doit se terminer avant minuit.",
  );
export const routineEntrySchema = z
  .object({
    id,
    routineId: id,
    day,
    completedAt: z.string().datetime(),
    title,
    time: clock.or(z.literal("")),
    duration: z.number().int().min(5).max(720),
  })
  .strict()
  .refine(
    (value) => !value.time || minutes(value.time) + value.duration <= 1440,
    "Le créneau réalisé doit se terminer avant minuit.",
  );
export const goalSchema = z
  .object({
    id,
    title,
    description: text,
    deadline: day.or(z.literal("")),
    taskIds: z
      .array(id)
      .max(20000)
      .refine((values) => new Set(values).size === values.length),
    paused: z.boolean(),
    createdAt: z.string().datetime(),
  })
  .strict();
export type Routine = z.infer<typeof routineSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
