import { z } from "zod";
import { INDIAN_STATES } from "../users/indianStates";

export const passengerHoldSchema = z.object({
  seatNo: z.string().min(1, "seatNo is required"),
  seatTypeId: z.coerce.number().int().nonnegative().default(1),
  fare: z.coerce.number().nonnegative(),
  gender: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const upper = value.trim().toUpperCase();
      if (upper === "MALE" || upper === "M") return "M";
      if (upper === "FEMALE" || upper === "F") return "F";
      return upper;
    },
    z.enum(["M", "F"]),
  ),
  age: z.coerce.number().int().min(1).max(120),
  name: z.string().trim().min(2, "Passenger name is required").max(100),
  isAcSeat: z.boolean().default(false),
});

export const holdSeatsSchema = z.object({
  fromCityId: z.coerce.number().int().nonnegative(),
  toCityId: z.coerce.number().int().nonnegative(),
  journeyDate: z
    .string()
    .min(1)
    .transform((val) =>
      val.includes("T")
        ? val.split("T")[0]
        : val.includes(" ")
          ? val.split(" ")[0]
          : val,
    ),
  busId: z.coerce.number().int().nonnegative(),
  pickupId: z.coerce.string().min(1).default("1"),
  dropoffId: z.coerce.string().min(1).default("1"),
  contactInfo: z.object({
    customerName: z.string().trim().min(1).default("Traveller"),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(1).default("9876543210"),
    mobile: z.string().trim().min(1).default("9876543210"),
    state: z.enum(INDIAN_STATES).optional(),
  }),
  gstDetails: z
    .object({
      gstin: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/),
      gstCompany: z.string().trim().min(2).max(100),
      businessAddress: z.string().trim().min(5).max(500).optional(),
      email: z.string().trim().email().max(254).optional(),
    })
    .optional(),
  passengers: z
    .array(passengerHoldSchema)
    .min(1, "At least 1 passenger is required")
    .max(6, "Maximum 6 seats per booking"),
});

export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;
