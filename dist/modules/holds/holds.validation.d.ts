import { z } from 'zod';
export declare const passengerHoldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const holdSeatsSchema: z.ZodObject<{
    fromCityId: z.ZodCoercedNumber<unknown>;
    toCityId: z.ZodCoercedNumber<unknown>;
    journeyDate: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    busId: z.ZodCoercedNumber<unknown>;
    pickupId: z.ZodDefault<z.ZodCoercedString<unknown>>;
    dropoffId: z.ZodDefault<z.ZodCoercedString<unknown>>;
    contactInfo: z.ZodObject<{
        customerName: z.ZodDefault<z.ZodString>;
        email: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodString]>>;
        phone: z.ZodDefault<z.ZodString>;
        mobile: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>;
    gstDetails: z.ZodOptional<z.ZodObject<{
        gstin: z.ZodString;
        gstCompany: z.ZodString;
    }, z.core.$strip>>;
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
}, z.core.$strip>;
export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;
//# sourceMappingURL=holds.validation.d.ts.map