"use strict";
// ---------------------------------------------------------------------------
// Admin Report Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportQuerySchema = void 0;
const zod_1 = require("zod");
exports.reportQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    operatorName: zod_1.z.string().trim().optional(),
    status: zod_1.z.string().trim().optional(),
    format: zod_1.z.enum(['json', 'csv']).optional().default('json'),
}).strict();
//# sourceMappingURL=report.validation.js.map