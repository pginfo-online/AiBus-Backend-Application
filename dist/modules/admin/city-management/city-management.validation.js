"use strict";
// ---------------------------------------------------------------------------
// Admin City Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCityBodySchema = exports.createCityBodySchema = exports.cityIdParamsSchema = exports.listCitiesQuerySchema = void 0;
const zod_1 = require("zod");
exports.listCitiesQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    search: zod_1.z.string().trim().optional(),
    state: zod_1.z.string().trim().optional(),
    active: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => (val === undefined ? undefined : val === 'true')),
    sortBy: zod_1.z.enum(['name', 'state', 'createdAt', 'active']).optional().default('name'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('asc'),
}).strict();
exports.cityIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid city ID'),
});
exports.createCityBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).trim(),
    state: zod_1.z.string().min(2).max(100).trim().optional(),
    providerCityId: zod_1.z.number().int().positive().optional(),
    providerName: zod_1.z.string().max(50).optional().default('GDS'),
    aliases: zod_1.z.array(zod_1.z.string().trim()).optional(),
    active: zod_1.z.boolean().optional().default(true),
}).strict();
exports.updateCityBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).trim().optional(),
    state: zod_1.z.string().min(2).max(100).trim().nullable().optional(),
    providerCityId: zod_1.z.number().int().positive().nullable().optional(),
    providerName: zod_1.z.string().max(50).optional(),
    aliases: zod_1.z.array(zod_1.z.string().trim()).nullable().optional(),
    active: zod_1.z.boolean().optional(),
}).strict();
//# sourceMappingURL=city-management.validation.js.map