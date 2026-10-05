"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdSeatsSchema = exports.passengerHoldSchema = void 0;
const zod_1 = require("zod");
exports.passengerHoldSchema = zod_1.z.object({
    seatNo: zod_1.z.string().min(1, 'seatNo is required'),
    seatTypeId: zod_1.z.coerce.number().int().positive(),
    fare: zod_1.z.coerce.number().positive(),
    gender: zod_1.z.enum(['M', 'F']),
    age: zod_1.z.coerce.number().int().min(1).max(120),
    name: zod_1.z.string().min(2, 'Passenger name is required').trim(),
    isAcSeat: zod_1.z.boolean().default(false),
});
exports.holdSeatsSchema = zod_1.z.object({
    fromCityId: zod_1.z.coerce.number().int().positive(),
    toCityId: zod_1.z.coerce.number().int().positive(),
    journeyDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'journeyDate must be YYYY-MM-DD'),
    busId: zod_1.z.coerce.number().int().positive(),
    pickupId: zod_1.z.string().min(1, 'pickupId is required'),
    dropoffId: zod_1.z.string().min(1, 'dropoffId is required'),
    contactInfo: zod_1.z.object({
        customerName: zod_1.z.string().min(2, 'customerName is required').trim(),
        email: zod_1.z.string().email('Invalid email address').trim(),
        phone: zod_1.z.string().min(10, 'Valid phone number is required').trim(),
        mobile: zod_1.z.string().min(10, 'Valid mobile number is required').trim(),
    }),
    gstDetails: zod_1.z
        .object({
        gstin: zod_1.z.string().min(15).max(15),
        gstCompany: zod_1.z.string().min(2),
    })
        .optional(),
    passengers: zod_1.z.array(exports.passengerHoldSchema).min(1, 'At least 1 passenger is required').max(6, 'Maximum 6 seats per booking'),
});
//# sourceMappingURL=holds.validation.js.map