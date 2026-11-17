import { z } from 'zod';
export declare const createBookingSchema: z.ZodObject<{
    holdId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fromCityId: z.ZodCoercedNumber<unknown>;
    toCityId: z.ZodCoercedNumber<unknown>;
    fromCityName: z.ZodString;
    toCityName: z.ZodString;
    journeyDate: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    busId: z.ZodCoercedNumber<unknown>;
    tripId: z.ZodCoercedString<unknown>;
    pickupCode: z.ZodCoercedString<unknown>;
    pickupLocation: z.ZodString;
    pickupTime: z.ZodString;
    dropoffCode: z.ZodCoercedString<unknown>;
    dropoffLocation: z.ZodString;
    dropoffTime: z.ZodString;
    operatorName: z.ZodString;
    busType: z.ZodString;
    totalFare: z.ZodCoercedNumber<unknown>;
    baseFare: z.ZodCoercedNumber<unknown>;
    serviceTax: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    contactName: z.ZodString;
    contactEmail: z.ZodString;
    contactPhone: z.ZodString;
    passengers: z.ZodArray<z.ZodObject<{
        seatNo: z.ZodString;
        seatTypeId: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        fare: z.ZodCoercedNumber<unknown>;
        gender: z.ZodPreprocess<z.ZodEnum<{
            O: "O";
            M: "M";
            F: "F";
        }>, unknown>;
        age: z.ZodCoercedNumber<unknown>;
        name: z.ZodString;
        isAcSeat: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    cancellationPolicy: z.ZodOptional<z.ZodAny>;
    pickupSnapshot: z.ZodOptional<z.ZodAny>;
    dropoffSnapshot: z.ZodOptional<z.ZodAny>;
    couponCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    useWallet: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const createCheckoutSessionSchema: z.ZodObject<{
    holdId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    fromCityId: z.ZodCoercedNumber<unknown>;
    toCityId: z.ZodCoercedNumber<unknown>;
    fromCityName: z.ZodString;
    toCityName: z.ZodString;
    journeyDate: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    busId: z.ZodCoercedNumber<unknown>;
    tripId: z.ZodCoercedString<unknown>;
    pickupCode: z.ZodCoercedString<unknown>;
    pickupLocation: z.ZodString;
    pickupTime: z.ZodString;
    dropoffCode: z.ZodCoercedString<unknown>;
    dropoffLocation: z.ZodString;
    dropoffTime: z.ZodString;
    operatorName: z.ZodString;
    busType: z.ZodString;
    totalFare: z.ZodCoercedNumber<unknown>;
    baseFare: z.ZodCoercedNumber<unknown>;
    serviceTax: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    contactName: z.ZodString;
    contactEmail: z.ZodString;
    contactPhone: z.ZodString;
    passengers: z.ZodArray<z.ZodObject<{
        seatNo: z.ZodString;
        seatTypeId: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        fare: z.ZodCoercedNumber<unknown>;
        gender: z.ZodPreprocess<z.ZodEnum<{
            O: "O";
            M: "M";
            F: "F";
        }>, unknown>;
        age: z.ZodCoercedNumber<unknown>;
        name: z.ZodString;
        isAcSeat: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    cancellationPolicy: z.ZodOptional<z.ZodAny>;
    pickupSnapshot: z.ZodOptional<z.ZodAny>;
    dropoffSnapshot: z.ZodOptional<z.ZodAny>;
    couponCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    useWallet: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    gateway: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        RAZORPAY: "RAZORPAY";
        AUTO: "AUTO";
    }>>>;
    paymentMode: z.ZodOptional<z.ZodString>;
    redirectUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const cancelBookingSchema: z.ZodObject<{
    seatNos: z.ZodOptional<z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodPipe<z.ZodString, z.ZodTransform<string[], string>>]>>;
    reason: z.ZodOptional<z.ZodString>;
    refundToWallet: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const bookingStatusSchema: z.ZodObject<{
    holdId: z.ZodOptional<z.ZodCoercedString<unknown>>;
    HoldId: z.ZodOptional<z.ZodCoercedString<unknown>>;
    bookingId: z.ZodOptional<z.ZodCoercedString<unknown>>;
    bookingNumber: z.ZodOptional<z.ZodCoercedString<unknown>>;
}, z.core.$strip>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;
//# sourceMappingURL=bookings.validation.d.ts.map