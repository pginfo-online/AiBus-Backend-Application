import { z } from 'zod';
export declare const dashboardOverviewQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        "7d": "7d";
        today: "today";
        "30d": "30d";
        "90d": "90d";
        "1y": "1y";
    }>>>;
}, z.core.$strict>;
export declare const revenueQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        daily: "daily";
        weekly: "weekly";
        monthly: "monthly";
    }>>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    operatorName: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const bookingAnalyticsQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        daily: "daily";
        weekly: "weekly";
        monthly: "monthly";
    }>>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const userAnalyticsQuerySchema: z.ZodObject<{
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        daily: "daily";
        weekly: "weekly";
        monthly: "monthly";
    }>>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type DashboardOverviewQuery = z.infer<typeof dashboardOverviewQuerySchema>;
export type RevenueQuery = z.infer<typeof revenueQuerySchema>;
export type BookingAnalyticsQuery = z.infer<typeof bookingAnalyticsQuerySchema>;
export type UserAnalyticsQuery = z.infer<typeof userAnalyticsQuerySchema>;
//# sourceMappingURL=dashboard.validation.d.ts.map