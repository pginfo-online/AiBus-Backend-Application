"use strict";
// ---------------------------------------------------------------------------
// Admin Booking Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCancelBookingBodySchema = exports.updateBookingStatusBodySchema = exports.bookingIdParamsSchema = exports.listBookingsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listBookingsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    search: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    operatorName: zod_1.z.string().optional(),
    fromCityName: zod_1.z.string().optional(),
    toCityName: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    minAmount: zod_1.z.coerce.number().optional(),
    maxAmount: zod_1.z.coerce.number().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'totalFare', 'journeyDate', 'status']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();
exports.bookingIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid booking ID'),
});
exports.updateBookingStatusBodySchema = zod_1.z.object({
    status: zod_1.z.string().min(1, 'Status is required'),
    reason: zod_1.z.string().min(5, 'Reason must be at least 5 characters').max(500),
}).strict();
exports.adminCancelBookingBodySchema = zod_1.z.object({
    reason: zod_1.z.string().min(5, 'Reason must be at least 5 characters').max(500),
    initiateRefund: zod_1.z.boolean().optional().default(true),
}).strict();
//# sourceMappingURL=booking-management.validation.js.map