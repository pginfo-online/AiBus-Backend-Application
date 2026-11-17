"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdSeatsSchema = exports.passengerHoldSchema = void 0;
const zod_1 = require("zod");
const indianStates_1 = require("../users/indianStates");
exports.passengerHoldSchema = zod_1.z.object({
    seatNo: zod_1.z.string().min(1, "seatNo is required"),
    seatTypeId: zod_1.z.coerce.number().int().nonnegative().default(1),
    fare: zod_1.z.coerce.number().nonnegative(),
    gender: zod_1.z.preprocess((value) => {
        if (typeof value !== "string")
            return value;
        return ({ MALE: "M", FEMALE: "F", OTHER: "O" }[value.trim().toUpperCase()] ?? value.trim().toUpperCase());
    }, zod_1.z.enum(["M", "F", "O"])),
    age: zod_1.z.coerce.number().int().min(1).max(120),
    name: zod_1.z.string().trim().min(2, "Passenger name is required").max(100),
    isAcSeat: zod_1.z.boolean().default(false),
});
exports.holdSeatsSchema = zod_1.z.object({
    fromCityId: zod_1.z.coerce.number().int().nonnegative(),
    toCityId: zod_1.z.coerce.number().int().nonnegative(),
    journeyDate: zod_1.z
        .string()
        .min(1)
        .transform((val) => val.includes("T")
        ? val.split("T")[0]
        : val.includes(" ")
            ? val.split(" ")[0]
            : val),
    busId: zod_1.z.coerce.number().int().nonnegative(),
    pickupId: zod_1.z.coerce.string().min(1).default("1"),
    dropoffId: zod_1.z.coerce.string().min(1).default("1"),
    contactInfo: zod_1.z.object({
        customerName: zod_1.z.string().trim().min(1).default("Traveller"),
        email: zod_1.z.string().trim().email().max(254),
        phone: zod_1.z.string().trim().min(1).default("9876543210"),
        mobile: zod_1.z.string().trim().min(1).default("9876543210"),
        state: zod_1.z.enum(indianStates_1.INDIAN_STATES).optional(),
    }),
    gstDetails: zod_1.z
        .object({
        gstin: zod_1.z
            .string()
            .trim()
            .toUpperCase()
            .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/),
        gstCompany: zod_1.z.string().trim().min(2).max(100),
        businessAddress: zod_1.z.string().trim().min(5).max(500).optional(),
        email: zod_1.z.string().trim().email().max(254).optional(),
    })
        .optional(),
    passengers: zod_1.z
        .array(exports.passengerHoldSchema)
        .min(1, "At least 1 passenger is required")
        .max(6, "Maximum 6 seats per booking"),
});
//# sourceMappingURL=holds.validation.js.map