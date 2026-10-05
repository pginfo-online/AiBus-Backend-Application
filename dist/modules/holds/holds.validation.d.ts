import { z } from 'zod';
export declare const passengerHoldSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const holdSeatsSchema: z.ZodObject<{
    fromCityId: z.ZodCoercedNumber<unknown>;
    toCityId: z.ZodCoercedNumber<unknown>;
    journeyDate: z.ZodString;
    busId: z.ZodCoercedNumber<unknown>;
    pickupId: z.ZodString;
    dropoffId: z.ZodString;
    contactInfo: z.ZodObject<{
        customerName: z.ZodString;
        email: z.ZodString;
        phone: z.ZodString;
        mobile: z.ZodString;
    }, z.core.$strip>;
    gstDetails: z.ZodOptional<z.ZodObject<{
        gstin: z.ZodString;
        gstCompany: z.ZodString;
    }, z.core.$strip>>;
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
}, z.core.$strip>;
export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;
//# sourceMappingURL=holds.validation.d.ts.map