"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBookingSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
const holds_validation_1 = require("../holds/holds.validation");
exports.createBookingSchema = zod_1.z.object({
    holdId: zod_1.z.string().uuid('Valid holdId is required'),
    fromCityId: zod_1.z.coerce.number().int().positive(),
    toCityId: zod_1.z.coerce.number().int().positive(),
    fromCityName: zod_1.z.string().min(1),
    toCityName: zod_1.z.string().min(1),
    journeyDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    busId: zod_1.z.coerce.number().int().positive(),
    tripId: zod_1.z.string().min(1),
    pickupCode: zod_1.z.string().min(1),
    pickupLocation: zod_1.z.string().min(1),
    pickupTime: zod_1.z.string().min(1),
    dropoffCode: zod_1.z.string().min(1),
    dropoffLocation: zod_1.z.string().min(1),
    dropoffTime: zod_1.z.string().min(1),
    operatorName: zod_1.z.string().min(1),
    busType: zod_1.z.string().min(1),
    totalFare: zod_1.z.coerce.number().positive(),
    baseFare: zod_1.z.coerce.number().positive(),
    serviceTax: zod_1.z.coerce.number().nonnegative(),
    contactName: zod_1.z.string().min(2),
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(10),
    passengers: zod_1.z.array(holds_validation_1.passengerHoldSchema).min(1).max(6),
    cancellationPolicy: zod_1.z.any().optional(),
});
exports.cancelBookingSchema = zod_1.z.object({
    seatNos: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'At least one seat number is required'),
    reason: zod_1.z.string().optional(),
});
//# sourceMappingURL=bookings.validation.js.map