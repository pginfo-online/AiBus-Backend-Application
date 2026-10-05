import { z } from 'zod';
export declare const createBookingSchema: z.ZodObject<{
    holdId: z.ZodString;
    fromCityId: z.ZodCoercedNumber<unknown>;
    toCityId: z.ZodCoercedNumber<unknown>;
    fromCityName: z.ZodString;
    toCityName: z.ZodString;
    journeyDate: z.ZodString;
    busId: z.ZodCoercedNumber<unknown>;
    tripId: z.ZodString;
    pickupCode: z.ZodString;
    pickupLocation: z.ZodString;
    pickupTime: z.ZodString;
    dropoffCode: z.ZodString;
    dropoffLocation: z.ZodString;
    dropoffTime: z.ZodString;
    operatorName: z.ZodString;
    busType: z.ZodString;
    totalFare: z.ZodCoercedNumber<unknown>;
    baseFare: z.ZodCoercedNumber<unknown>;
    serviceTax: z.ZodCoercedNumber<unknown>;
    contactName: z.ZodString;
    contactEmail: z.ZodString;
    contactPhone: z.ZodString;
    passengers: z.ZodArray<z.ZodObject<{
        seatNo: z.ZodString;
        seatTypeId: z.ZodCoercedNumber<unknown>;
        fare: z.ZodCoercedNumber<unknown>;
        gender: z.ZodEnum<{
            M: "M";
            F: "F";
        }>;
        age: z.ZodCoercedNumber<unknown>;
        name: z.ZodString;
        isAcSeat: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    cancellationPolicy: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export declare const cancelBookingSchema: z.ZodObject<{
    seatNos: z.ZodArray<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
//# sourceMappingURL=bookings.validation.d.ts.map