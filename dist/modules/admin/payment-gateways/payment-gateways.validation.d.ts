import { z } from 'zod';
export declare const updateGatewayConfigSchema: z.ZodObject<{
    isEnabled: z.ZodOptional<z.ZodBoolean>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
    mode: z.ZodOptional<z.ZodEnum<{
        LIVE: "LIVE";
        TEST: "TEST";
        MAINTENANCE: "MAINTENANCE";
    }>>;
    trafficWeight: z.ZodOptional<z.ZodNumber>;
    supportedMethods: z.ZodOptional<z.ZodArray<z.ZodString>>;
    priority: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const toggleGatewaySchema: z.ZodObject<{
    isEnabled: z.ZodBoolean;
}, z.core.$strip>;
export type UpdateGatewayConfigInput = z.infer<typeof updateGatewayConfigSchema>;
export type ToggleGatewayInput = z.infer<typeof toggleGatewaySchema>;
//# sourceMappingURL=payment-gateways.validation.d.ts.map