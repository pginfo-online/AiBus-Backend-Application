"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileSchema = exports.passengerParamsSchema = exports.passengerSchema = exports.mobileSchema = exports.birthDateSchema = void 0;
const zod_1 = require("zod");
const indianStates_1 = require("./indianStates");
exports.birthDateSchema = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    const today = new Date();
    const oldest = new Date(today);
    oldest.setUTCFullYear(oldest.getUTCFullYear() - 121);
    return (Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        date <= today &&
        date > oldest);
}, "Enter a valid date of birth within the last 120 years");
const name = zod_1.z
    .string()
    .trim()
    .min(2)
    .max(100)
    .refine((v) => /^\p{L}[\p{L}\p{M} .'’\-]*$/u.test(v) &&
    (v.match(/\p{L}/gu)?.length ?? 0) >= 2, "Name must contain letters");
exports.mobileSchema = zod_1.z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/);
exports.passengerSchema = zod_1.z
    .object({
    name,
    dateOfBirth: exports.birthDateSchema.nullable().optional(),
    age: zod_1.z.number().int().min(1).max(120).nullable().optional(),
    gender: zod_1.z.enum(["M", "F", "O"]),
    mobile: exports.mobileSchema.nullable().optional(),
})
    .strict()
    .refine((v) => Boolean(v.dateOfBirth) !== Boolean(v.age), "Provide either date of birth or age");
exports.passengerParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.profileSchema = zod_1.z
    .object({
    firstName: zod_1.z.string().trim().min(1).max(100),
    lastName: zod_1.z.string().trim().max(100).optional(),
    dateOfBirth: exports.birthDateSchema.nullable().optional(),
    gender: zod_1.z.enum(["M", "F", "O"]).nullable().optional(),
    state: zod_1.z.enum(indianStates_1.INDIAN_STATES).nullable().optional(),
    personalPhone: exports.mobileSchema.nullable().optional(),
    contactEmail: zod_1.z
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
//# sourceMappingURL=users.validation.js.map