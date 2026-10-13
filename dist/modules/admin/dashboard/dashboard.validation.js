"use strict";
// ---------------------------------------------------------------------------
// Admin Dashboard — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAnalyticsQuerySchema = exports.bookingAnalyticsQuerySchema = exports.revenueQuerySchema = exports.dashboardOverviewQuerySchema = void 0;
const zod_1 = require("zod");
exports.dashboardOverviewQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['today', '7d', '30d', '90d', '1y']).optional().default('30d'),
}).strict();
exports.revenueQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    operatorName: zod_1.z.string().optional(),
}).strict();
exports.bookingAnalyticsQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
}).strict();
exports.userAnalyticsQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
}).strict();
//# sourceMappingURL=dashboard.validation.js.map