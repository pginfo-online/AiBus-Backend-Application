"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBookingSchema = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
const holds_validation_1 = require("../holds/holds.validation");
exports.createBookingSchema = zod_1.z.object({
    holdId: zod_1.z.string().optional().nullable(),
    fromCityId: zod_1.z.coerce.number().int().nonnegative(),
    toCityId: zod_1.z.coerce.number().int().nonnegative(),
    fromCityName: zod_1.z.string().min(1).default('Bengaluru'),
    toCityName: zod_1.z.string().min(1).default('Chennai'),
    journeyDate: zod_1.z.string().min(1).transform((val) => (val.includes('T') ? val.split('T')[0] : val)),
    busId: zod_1.z.coerce.number().int().nonnegative(),
    tripId: zod_1.z.coerce.string().min(1),
    pickupCode: zod_1.z.coerce.string().min(1).default('1'),
    pickupLocation: zod_1.z.string().min(1).default('Boarding Point'),
    pickupTime: zod_1.z.string().min(1).default('08:00'),
    dropoffCode: zod_1.z.coerce.string().min(1).default('1'),
    dropoffLocation: zod_1.z.string().min(1).default('Dropping Point'),
    dropoffTime: zod_1.z.string().min(1).default('14:00'),
    operatorName: zod_1.z.string().min(1).default('Bus Operator'),
    busType: zod_1.z.string().min(1).default('AC Seater/Sleeper'),
    totalFare: zod_1.z.coerce.number().nonnegative(),
    baseFare: zod_1.z.coerce.number().nonnegative(),
    serviceTax: zod_1.z.coerce.number().nonnegative().default(0),
    contactName: zod_1.z.string().min(1).default('Passenger'),
    contactEmail: zod_1.z.string().email().or(zod_1.z.string().min(1)).default('booking@aibus.in'),
    contactPhone: zod_1.z.string().min(1).default('9876543210'),
    passengers: zod_1.z.array(holds_validation_1.passengerHoldSchema).min(1).max(6),
    cancellationPolicy: zod_1.z.any().optional(),
});
exports.cancelBookingSchema = zod_1.z.object({
    seatNos: zod_1.z.array(zod_1.z.string().min(1)).min(1, 'At least one seat number is required'),
    reason: zod_1.z.string().optional(),
});
//# sourceMappingURL=bookings.validation.js.map