"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingStatusSchema = exports.cancelBookingSchema = exports.createCheckoutSessionSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
const holds_validation_1 = require("../holds/holds.validation");
exports.createBookingSchema = zod_1.z.object({
    holdId: zod_1.z.string().optional().nullable(),
    fromCityId: zod_1.z.coerce.number().int().nonnegative(),
    toCityId: zod_1.z.coerce.number().int().nonnegative(),
    fromCityName: zod_1.z.string().min(1),
    toCityName: zod_1.z.string().min(1),
    journeyDate: zod_1.z.string().min(1).transform((val) => (val.includes('T') ? val.split('T')[0] : val)),
    busId: zod_1.z.coerce.number().int().nonnegative(),
    tripId: zod_1.z.coerce.string().min(1),
    pickupCode: zod_1.z.coerce.string().min(1),
    pickupLocation: zod_1.z.string().min(1),
    pickupTime: zod_1.z.string(),
    dropoffCode: zod_1.z.coerce.string().min(1),
    dropoffLocation: zod_1.z.string().min(1),
    dropoffTime: zod_1.z.string(),
    operatorName: zod_1.z.string().min(1),
    busType: zod_1.z.string().min(1),
    totalFare: zod_1.z.coerce.number().nonnegative(),
    baseFare: zod_1.z.coerce.number().nonnegative(),
    serviceTax: zod_1.z.coerce.number().nonnegative().default(0),
    contactName: zod_1.z.string().trim().min(1).max(100),
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().regex(/^\+?[1-9]\d{7,14}$/),
    passengers: zod_1.z.array(holds_validation_1.passengerHoldSchema).min(1).max(6),
    cancellationPolicy: zod_1.z.any().optional(),
    pickupSnapshot: zod_1.z.any().optional(),
    dropoffSnapshot: zod_1.z.any().optional(),
    couponCode: zod_1.z.string().trim().optional().nullable(),
    useWallet: zod_1.z.boolean().optional().default(false),
});
exports.createCheckoutSessionSchema = exports.createBookingSchema.extend({
    gateway: zod_1.z.enum(['RAZORPAY', 'AUTO']).default('RAZORPAY').optional(),
    paymentMode: zod_1.z.string().optional(),
    redirectUrl: zod_1.z.string().optional(),
});
exports.cancelBookingSchema = zod_1.z.object({
    seatNos: zod_1.z.union([
        zod_1.z.array(zod_1.z.string().trim().min(1).max(20)).min(1).max(6),
        zod_1.z.string().min(1).transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),
    ]).optional(),
    reason: zod_1.z.string().trim().max(500).optional(),
    refundToWallet: zod_1.z.boolean().optional(),
});
exports.bookingStatusSchema = zod_1.z.object({
    holdId: zod_1.z.coerce.string().min(1).optional(),
    HoldId: zod_1.z.coerce.string().min(1).optional(),
    bookingId: zod_1.z.coerce.string().min(1).optional(),
    bookingNumber: zod_1.z.coerce.string().min(1).optional(),
});
//# sourceMappingURL=bookings.validation.js.map