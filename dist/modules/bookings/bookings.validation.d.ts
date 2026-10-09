import { z } from 'zod';
export declare const createBookingSchema: z.ZodObject<{
    holdId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fromCityId: z.ZodCoercedNumber<unknown>;
    toCityId: z.ZodCoercedNumber<unknown>;
    fromCityName: z.ZodDefault<z.ZodString>;
    toCityName: z.ZodDefault<z.ZodString>;
    journeyDate: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    busId: z.ZodCoercedNumber<unknown>;
    tripId: z.ZodCoercedString<unknown>;
    pickupCode: z.ZodDefault<z.ZodCoercedString<unknown>>;
    pickupLocation: z.ZodDefault<z.ZodString>;
    pickupTime: z.ZodDefault<z.ZodString>;
    dropoffCode: z.ZodDefault<z.ZodCoercedString<unknown>>;
    dropoffLocation: z.ZodDefault<z.ZodString>;
    dropoffTime: z.ZodDefault<z.ZodString>;
    operatorName: z.ZodDefault<z.ZodString>;
    busType: z.ZodDefault<z.ZodString>;
    totalFare: z.ZodCoercedNumber<unknown>;
    baseFare: z.ZodCoercedNumber<unknown>;
    serviceTax: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    contactName: z.ZodDefault<z.ZodString>;
    contactEmail: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    contactPhone: z.ZodDefault<z.ZodString>;
    passengers: z.ZodArray<z.ZodObject<{
        seatNo: z.ZodString;
        seatTypeId: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        fare: z.ZodCoercedNumber<unknown>;
        gender: z.ZodPreprocess<z.ZodEnum<{
            M: "M";
            F: "F";
        }>, unknown>;
        age: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
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