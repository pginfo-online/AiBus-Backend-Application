import { z } from 'zod';
export declare const registerAgentSchema: z.ZodObject<{
    businessName: z.ZodString;
    contactPersonName: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    businessAddress: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    pincode: z.ZodOptional<z.ZodString>;
    gstNumber: z.ZodOptional<z.ZodString>;
    panNumber: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;
export declare const uploadKycDocSchema: z.ZodObject<{
    docType: z.ZodEnum<{
        PAN_CARD: "PAN_CARD";
        GST_CERTIFICATE: "GST_CERTIFICATE";
        BUSINESS_REGISTRATION: "BUSINESS_REGISTRATION";
        BANK_STATEMENT: "BANK_STATEMENT";
        OWNER_IDENTITY: "OWNER_IDENTITY";
        CANCELLED_CHEQUE: "CANCELLED_CHEQUE";
    }>;
}, z.core.$strip>;
export type UploadKycDocInput = z.infer<typeof uploadKycDocSchema>;
export declare const submitKycDocSchema: z.ZodObject<{
    docType: z.ZodEnum<{
        PAN_CARD: "PAN_CARD";
        GST_CERTIFICATE: "GST_CERTIFICATE";
        BUSINESS_REGISTRATION: "BUSINESS_REGISTRATION";
        BANK_STATEMENT: "BANK_STATEMENT";
        OWNER_IDENTITY: "OWNER_IDENTITY";
        CANCELLED_CHEQUE: "CANCELLED_CHEQUE";
    }>;
    fileUrl: z.ZodString;
    storageKey: z.ZodString;
}, z.core.$strip>;
export type SubmitKycDocInput = z.infer<typeof submitKycDocSchema>;
export declare const addBankAccountSchema: z.ZodObject<{
    accountHolderName: z.ZodString;
    accountNumber: z.ZodString;
    ifscCode: z.ZodString;
    bankName: z.ZodString;
    isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
export declare const inviteStaffSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<{
        MANAGER: "MANAGER";
        BOOKING_AGENT: "BOOKING_AGENT";
        ACCOUNTANT: "ACCOUNTANT";
        VIEWER: "VIEWER";
    }>>;
    permissions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
}, z.core.$strip>;
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
export declare const updateStaffRoleSchema: z.ZodObject<{
    role: z.ZodEnum<{
        MANAGER: "MANAGER";
        BOOKING_AGENT: "BOOKING_AGENT";
        ACCOUNTANT: "ACCOUNTANT";
        VIEWER: "VIEWER";
    }>;
    permissions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
}, z.core.$strip>;
export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;
export declare const initiateTopupSchema: z.ZodObject<{
    amount: z.ZodNumber;
    gateway: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        RAZORPAY: "RAZORPAY";
        PHONEPE: "PHONEPE";
        AUTO: "AUTO";
    }>>>;
    redirectUrl: z.ZodOptional<z.ZodString>;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type InitiateTopupInput = z.infer<typeof initiateTopupSchema>;
export declare const updateAgentProfileSchema: z.ZodObject<{
    businessName: z.ZodOptional<z.ZodString>;
    contactPersonName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    businessAddress: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    pincode: z.ZodOptional<z.ZodString>;
    gstNumber: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateAgentProfileInput = z.infer<typeof updateAgentProfileSchema>;
export declare const agentIdParamSchema: z.ZodObject<{
    agentId: z.ZodString;
}, z.core.$strip>;
export declare const docIdParamSchema: z.ZodObject<{
    agentId: z.ZodString;
    docId: z.ZodString;
}, z.core.$strip>;
export declare const bankIdParamSchema: z.ZodObject<{
    agentId: z.ZodString;
    bankId: z.ZodString;
}, z.core.$strip>;
export declare const staffIdParamSchema: z.ZodObject<{
    agentId: z.ZodString;
    staffId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=agents.validation.d.ts.map