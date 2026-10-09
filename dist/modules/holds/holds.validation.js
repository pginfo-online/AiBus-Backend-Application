"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdSeatsSchema = exports.passengerHoldSchema = void 0;
const zod_1 = require("zod");
exports.passengerHoldSchema = zod_1.z.object({
    seatNo: zod_1.z.string().min(1, 'seatNo is required'),
    seatTypeId: zod_1.z.coerce.number().int().nonnegative().default(1),
    fare: zod_1.z.coerce.number().nonnegative(),
    gender: zod_1.z.preprocess((val) => {
        if (typeof val === 'string') {
            const upper = val.trim().toUpperCase();
            if (upper.startsWith('F'))
                return 'F';
            return 'M';
        }
        return 'M';
    }, zod_1.z.enum(['M', 'F'])),
    age: zod_1.z.coerce.number().int().min(1).max(120).default(25),
    name: zod_1.z.string().min(1, 'Passenger name is required').trim(),
    isAcSeat: zod_1.z.boolean().default(false),
});
exports.holdSeatsSchema = zod_1.z.object({
    fromCityId: zod_1.z.coerce.number().int().nonnegative(),
    toCityId: zod_1.z.coerce.number().int().nonnegative(),
    journeyDate: zod_1.z.string().min(1).transform((val) => (val.includes('T') ? val.split('T')[0] : (val.includes(' ') ? val.split(' ')[0] : val))),
    busId: zod_1.z.coerce.number().int().nonnegative(),
    pickupId: zod_1.z.coerce.string().min(1).default('1'),
    dropoffId: zod_1.z.coerce.string().min(1).default('1'),
    contactInfo: zod_1.z.object({
        customerName: zod_1.z.string().trim().min(1).default('Traveller'),
        email: zod_1.z.string().trim().email().or(zod_1.z.string().trim().min(1)).default('booking@aibus.in'),
        phone: zod_1.z.string().trim().min(1).default('9876543210'),
        mobile: zod_1.z.string().trim().min(1).default('9876543210'),
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