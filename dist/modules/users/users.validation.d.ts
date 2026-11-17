import { z } from "zod";
export declare const birthDateSchema: z.ZodString;
export declare const mobileSchema: z.ZodString;
export declare const passengerSchema: z.ZodObject<{
    name: z.ZodString;
    dateOfBirth: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    age: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    gender: z.ZodEnum<{
        O: "O";
        M: "M";
        F: "F";
    }>;
    mobile: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
export declare const passengerParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const profileSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dateOfBirth: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    gender: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEnum<{
        O: "O";
        M: "M";
        F: "F";
    }>>>>;
    state: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodEnum<{
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
    }>>>>;
    personalPhone: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    contactEmail: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strict>;
export type PassengerInput = z.infer<typeof passengerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
//# sourceMappingURL=users.validation.d.ts.map