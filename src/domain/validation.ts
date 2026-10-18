import { z } from "zod";
export const text = z.string().trim().max(10000);
export const id = z.string().min(1).max(100);
export const title = z
  .string()
  .trim()
  .min(1, "Un titre est nécessaire.")
  .max(180);
export const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T12:00:00Z");
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date invalide");
