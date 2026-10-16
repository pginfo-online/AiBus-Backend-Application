"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffIdParamSchema = exports.bankIdParamSchema = exports.docIdParamSchema = exports.agentIdParamSchema = exports.updateAgentProfileSchema = exports.initiateTopupSchema = exports.updateStaffRoleSchema = exports.inviteStaffSchema = exports.addBankAccountSchema = exports.submitKycDocSchema = exports.uploadKycDocSchema = exports.registerAgentSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Agent Registration
// ---------------------------------------------------------------------------
exports.registerAgentSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(2).max(200),
    contactPersonName: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
    password: zod_1.z.string().min(8).max(64),
    businessAddress: zod_1.z.string().min(5).max(500),
    city: zod_1.z.string().min(2).max(100),
    state: zod_1.z.string().min(2).max(100),
    pincode: zod_1.z.string().regex(/^\d{6}$/).optional(),
    gstNumber: zod_1.z
        .string()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number')
        .optional(),
    panNumber: zod_1.z
        .string()
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number')
        .optional(),
});
// ---------------------------------------------------------------------------
// KYC Document Upload
// ---------------------------------------------------------------------------
exports.uploadKycDocSchema = zod_1.z.object({
    docType: zod_1.z.enum([
        'PAN_CARD',
        'GST_CERTIFICATE',
        'BUSINESS_REGISTRATION',
        'BANK_STATEMENT',
        'OWNER_IDENTITY',
        'CANCELLED_CHEQUE',
    ]),
});
exports.submitKycDocSchema = zod_1.z.object({
    docType: zod_1.z.enum([
        'PAN_CARD',
        'GST_CERTIFICATE',
        'BUSINESS_REGISTRATION',
        'BANK_STATEMENT',
        'OWNER_IDENTITY',
        'CANCELLED_CHEQUE',
    ]),
    fileUrl: zod_1.z.string().url(),
    storageKey: zod_1.z.string().min(1),
});
// ---------------------------------------------------------------------------
// Bank Account
// ---------------------------------------------------------------------------
exports.addBankAccountSchema = zod_1.z.object({
    accountHolderName: zod_1.z.string().min(2).max(200),
    accountNumber: zod_1.z.string().min(8).max(20),
    ifscCode: zod_1.z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
    bankName: zod_1.z.string().min(2).max(100),
    isPrimary: zod_1.z.boolean().optional().default(false),
});
// ---------------------------------------------------------------------------
// Staff Invite
// ---------------------------------------------------------------------------
exports.inviteStaffSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['MANAGER', 'BOOKING_AGENT', 'ACCOUNTANT', 'VIEWER']).default('BOOKING_AGENT'),
    permissions: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()).optional(),
});
exports.updateStaffRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['MANAGER', 'BOOKING_AGENT', 'ACCOUNTANT', 'VIEWER']),
    permissions: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()).optional(),
});
// ---------------------------------------------------------------------------
// Wallet Top-up
// ---------------------------------------------------------------------------
exports.initiateTopupSchema = zod_1.z.object({
    amount: zod_1.z.number().min(100).max(500000), // INR: min 100, max 5 lakh
    gateway: zod_1.z.enum(['RAZORPAY', 'PHONEPE', 'AUTO']).default('AUTO').optional(),
    redirectUrl: zod_1.z.string().url().optional(),
    idempotencyKey: zod_1.z.string().uuid().optional(),
});
// ---------------------------------------------------------------------------
// Agent Profile Update
// ---------------------------------------------------------------------------
exports.updateAgentProfileSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(2).max(200).optional(),
    contactPersonName: zod_1.z.string().min(2).max(100).optional(),
    phone: zod_1.z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
    businessAddress: zod_1.z.string().min(5).max(500).optional(),
    city: zod_1.z.string().min(2).max(100).optional(),
    state: zod_1.z.string().min(2).max(100).optional(),
    pincode: zod_1.z.string().regex(/^\d{6}$/).optional(),
    gstNumber: zod_1.z
        .string()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .optional(),
});
// ---------------------------------------------------------------------------
// Common params schemas
// ---------------------------------------------------------------------------
exports.agentIdParamSchema = zod_1.z.object({ agentId: zod_1.z.string().uuid() });
exports.docIdParamSchema = zod_1.z.object({ agentId: zod_1.z.string().uuid(), docId: zod_1.z.string().uuid() });
exports.bankIdParamSchema = zod_1.z.object({ agentId: zod_1.z.string().uuid(), bankId: zod_1.z.string().uuid() });
exports.staffIdParamSchema = zod_1.z.object({ agentId: zod_1.z.string().uuid(), staffId: zod_1.z.string().uuid() });
//# sourceMappingURL=agents.validation.js.map