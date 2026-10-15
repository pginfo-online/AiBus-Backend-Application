import { z } from 'zod';

// ---------------------------------------------------------------------------
// Agent Registration
// ---------------------------------------------------------------------------
export const registerAgentSchema = z.object({
  businessName: z.string().min(2).max(200),
  contactPersonName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  password: z.string().min(8).max(64),
  businessAddress: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number')
    .optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number')
    .optional(),
});

export type RegisterAgentInput = z.infer<typeof registerAgentSchema>;

// ---------------------------------------------------------------------------
// KYC Document Upload
// ---------------------------------------------------------------------------
export const uploadKycDocSchema = z.object({
  docType: z.enum([
    'PAN_CARD',
    'GST_CERTIFICATE',
    'BUSINESS_REGISTRATION',
    'BANK_STATEMENT',
    'OWNER_IDENTITY',
    'CANCELLED_CHEQUE',
  ]),
});

export type UploadKycDocInput = z.infer<typeof uploadKycDocSchema>;

export const submitKycDocSchema = z.object({
  docType: z.enum([
    'PAN_CARD',
    'GST_CERTIFICATE',
    'BUSINESS_REGISTRATION',
    'BANK_STATEMENT',
    'OWNER_IDENTITY',
    'CANCELLED_CHEQUE',
  ]),
  fileUrl: z.string().url(),
  storageKey: z.string().min(1),
});

export type SubmitKycDocInput = z.infer<typeof submitKycDocSchema>;

// ---------------------------------------------------------------------------
// Bank Account
// ---------------------------------------------------------------------------
export const addBankAccountSchema = z.object({
  accountHolderName: z.string().min(2).max(200),
  accountNumber: z.string().min(8).max(20),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
  bankName: z.string().min(2).max(100),
  isPrimary: z.boolean().optional().default(false),
});

export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;

// ---------------------------------------------------------------------------
// Staff Invite
// ---------------------------------------------------------------------------
export const inviteStaffSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MANAGER', 'BOOKING_AGENT', 'ACCOUNTANT', 'VIEWER']).default('BOOKING_AGENT'),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updateStaffRoleSchema = z.object({
  role: z.enum(['MANAGER', 'BOOKING_AGENT', 'ACCOUNTANT', 'VIEWER']),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

export type UpdateStaffRoleInput = z.infer<typeof updateStaffRoleSchema>;

// ---------------------------------------------------------------------------
// Wallet Top-up
// ---------------------------------------------------------------------------
export const initiateTopupSchema = z.object({
  amount: z.number().min(100).max(500000), // INR: min 100, max 5 lakh
  gateway: z.enum(['RAZORPAY', 'PHONEPE', 'AUTO']).default('AUTO').optional(),
  redirectUrl: z.string().url().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type InitiateTopupInput = z.infer<typeof initiateTopupSchema>;

// ---------------------------------------------------------------------------
// Agent Profile Update
// ---------------------------------------------------------------------------
export const updateAgentProfileSchema = z.object({
  businessName: z.string().min(2).max(200).optional(),
  contactPersonName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  businessAddress: z.string().min(5).max(500).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional(),
});

export type UpdateAgentProfileInput = z.infer<typeof updateAgentProfileSchema>;

// ---------------------------------------------------------------------------
// Common params schemas
// ---------------------------------------------------------------------------
export const agentIdParamSchema = z.object({ agentId: z.string().uuid() });
export const docIdParamSchema = z.object({ agentId: z.string().uuid(), docId: z.string().uuid() });
export const bankIdParamSchema = z.object({ agentId: z.string().uuid(), bankId: z.string().uuid() });
export const staffIdParamSchema = z.object({ agentId: z.string().uuid(), staffId: z.string().uuid() });
