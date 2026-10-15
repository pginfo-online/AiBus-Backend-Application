import { z } from 'zod';
export declare const listBookingsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    operatorName: z.ZodOptional<z.ZodString>;
    fromCityName: z.ZodOptional<z.ZodString>;
    toCityName: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    minAmount: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    maxAmount: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        status: "status";
        createdAt: "createdAt";
        journeyDate: "journeyDate";
        totalFare: "totalFare";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>>;
}, z.core.$strict>;
export declare const bookingIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const updateBookingStatusBodySchema: z.ZodObject<{
    status: z.ZodString;
    reason: z.ZodString;
}, z.core.$strict>;
export declare const adminCancelBookingBodySchema: z.ZodObject<{
    reason: z.ZodString;
    initiateRefund: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type UpdateBookingStatusBody = z.infer<typeof updateBookingStatusBodySchema>;
export type AdminCancelBookingBody = z.infer<typeof adminCancelBookingBodySchema>;
//# sourceMappingURL=booking-management.validation.d.ts.map