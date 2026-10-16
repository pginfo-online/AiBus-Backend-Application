"use strict";
// ---------------------------------------------------------------------------
// Admin System Configuration — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFeatureFlagBodySchema = exports.createFeatureFlagBodySchema = exports.updateConfigBodySchema = exports.createConfigBodySchema = exports.configKeyParamsSchema = exports.listConfigQuerySchema = void 0;
const zod_1 = require("zod");
exports.listConfigQuerySchema = zod_1.z.object({
    group: zod_1.z.string().trim().optional(),
}).strict();
exports.configKeyParamsSchema = zod_1.z.object({
    key: zod_1.z.string().min(1).max(100).trim(),
});
exports.createConfigBodySchema = zod_1.z.object({
    key: zod_1.z.string().min(2).max(100).trim().regex(/^[a-zA-Z0-9_.-]+$/, 'Key must be alphanumeric with dots, dashes, or underscores'),
    value: zod_1.z.string(),
    type: zod_1.z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']).optional().default('STRING'),
    description: zod_1.z.string().max(250).optional(),
    group: zod_1.z.string().max(50).optional().default('general'),
    isSecret: zod_1.z.boolean().optional().default(false),
}).strict();
exports.updateConfigBodySchema = zod_1.z.object({
    value: zod_1.z.string(),
    description: zod_1.z.string().max(250).optional(),
    group: zod_1.z.string().max(50).optional(),
    isSecret: zod_1.z.boolean().optional(),
}).strict();
exports.createFeatureFlagBodySchema = zod_1.z.object({
    key: zod_1.z.string().min(2).max(100).trim().regex(/^[a-zA-Z0-9_.-]+$/, 'Key must be alphanumeric'),
    enabled: zod_1.z.boolean().optional().default(false),
    description: zod_1.z.string().max(250).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
}).strict();
exports.toggleFeatureFlagBodySchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
}).strict();
//# sourceMappingURL=system-config.validation.js.map