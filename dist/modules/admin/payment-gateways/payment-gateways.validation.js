"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleGatewaySchema = exports.updateGatewayConfigSchema = void 0;
const zod_1 = require("zod");
exports.updateGatewayConfigSchema = zod_1.z.object({
    isEnabled: zod_1.z.boolean().optional(),
    isPrimary: zod_1.z.boolean().optional(),
    mode: zod_1.z.enum(['LIVE', 'TEST', 'MAINTENANCE']).optional(),
    trafficWeight: zod_1.z.number().int().min(0).max(100).optional(),
    supportedMethods: zod_1.z.array(zod_1.z.string()).optional(),
    priority: zod_1.z.number().int().positive().optional(),
});
exports.toggleGatewaySchema = zod_1.z.object({
    isEnabled: zod_1.z.boolean(),
});
//# sourceMappingURL=payment-gateways.validation.js.map