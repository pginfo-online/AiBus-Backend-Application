import { z } from "zod";
export declare const passengerHoldSchema: z.ZodObject<{
    seatNo: z.ZodString;
    seatTypeId: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    fare: z.ZodCoercedNumber<unknown>;
    gender: z.ZodPreprocess<z.ZodEnum<{
        M: "M";
        F: "F";
    }>, unknown>;
    age: z.ZodCoercedNumber<unknown>;
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
        email: z.ZodString;
        phone: z.ZodDefault<z.ZodString>;
        mobile: z.ZodDefault<z.ZodString>;
        state: z.ZodOptional<z.ZodEnum<{
            "Andaman and Nicobar Islands": "Andaman and Nicobar Islands";
            "Andhra Pradesh": "Andhra Pradesh";
            "Arunachal Pradesh": "Arunachal Pradesh";
            Assam: "Assam";
            Bihar: "Bihar";
            Chandigarh: "Chandigarh";
            Chhattisgarh: "Chhattisgarh";
            "Dadra and Nagar Haveli and Daman and Diu": "Dadra and Nagar Haveli and Daman and Diu";
            Delhi: "Delhi";
            Goa: "Goa";
            Gujarat: "Gujarat";
            Haryana: "Haryana";
            "Himachal Pradesh": "Himachal Pradesh";
            "Jammu and Kashmir": "Jammu and Kashmir";
            Jharkhand: "Jharkhand";
            Karnataka: "Karnataka";
            Kerala: "Kerala";
            Ladakh: "Ladakh";
            Lakshadweep: "Lakshadweep";
            "Madhya Pradesh": "Madhya Pradesh";
            Maharashtra: "Maharashtra";
            Manipur: "Manipur";
            Meghalaya: "Meghalaya";
            Mizoram: "Mizoram";
            Nagaland: "Nagaland";
            Odisha: "Odisha";
            Puducherry: "Puducherry";
            Punjab: "Punjab";
            Rajasthan: "Rajasthan";
            Sikkim: "Sikkim";
            "Tamil Nadu": "Tamil Nadu";
            Telangana: "Telangana";
            Tripura: "Tripura";
            "Uttar Pradesh": "Uttar Pradesh";
            Uttarakhand: "Uttarakhand";
            "West Bengal": "West Bengal";
        }>>;
    }, z.core.$strip>;
    gstDetails: z.ZodOptional<z.ZodObject<{
        gstin: z.ZodString;
        gstCompany: z.ZodString;
        businessAddress: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    passengers: z.ZodArray<z.ZodObject<{
        seatNo: z.ZodString;
        seatTypeId: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
        fare: z.ZodCoercedNumber<unknown>;
        gender: z.ZodPreprocess<z.ZodEnum<{
            M: "M";
            F: "F";
        }>, unknown>;
        age: z.ZodCoercedNumber<unknown>;
        name: z.ZodString;
        isAcSeat: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;
//# sourceMappingURL=holds.validation.d.ts.map