import { z } from "zod";
import { INDIAN_STATES } from "./indianStates";

export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    const today = new Date();
    const oldest = new Date(today);
    oldest.setUTCFullYear(oldest.getUTCFullYear() - 121);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      date <= today &&
      date > oldest
    );
  }, "Enter a valid date of birth within the last 120 years");
const name = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .refine(
    (v) =>
      /^\p{L}[\p{L}\p{M} .'’\-]*$/u.test(v) &&
      (v.match(/\p{L}/gu)?.length ?? 0) >= 2,
    "Name must contain letters",
  );
export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/);
export const passengerSchema = z
  .object({
    name,
    dateOfBirth: birthDateSchema.nullable().optional(),
    age: z.number().int().min(1).max(120).nullable().optional(),
    gender: z.enum(["M", "F", "O"]),
    mobile: mobileSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (v) => Boolean(v.dateOfBirth) !== Boolean(v.age),
    "Provide either date of birth or age",
  );
export const passengerParamsSchema = z.object({ id: z.string().uuid() });
export const profileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).optional(),
    dateOfBirth: birthDateSchema.nullable().optional(),
    gender: z.enum(["M", "F", "O"]).nullable().optional(),
    state: z.enum(INDIAN_STATES).nullable().optional(),
    personalPhone: mobileSchema.nullable().optional(),
    contactEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(254)
      .nullable()
      .optional(),
  })
  .strict()
  .partial();
export type PassengerInput = z.infer<typeof passengerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
