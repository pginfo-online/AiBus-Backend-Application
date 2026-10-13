import type { DashboardOverviewQuery, RevenueQuery, BookingAnalyticsQuery, UserAnalyticsQuery } from './dashboard.validation';
export declare class DashboardService {
    private static instance;
    private constructor();
    static getInstance(): DashboardService;
    /**
     * Platform overview — key metrics at a glance.
     */
    getOverview(query: DashboardOverviewQuery): Promise<any>;
    /**
     * Revenue analytics — daily/weekly/monthly revenue breakdown.
     */
    getRevenueAnalytics(query: RevenueQuery): Promise<{
        period: "daily" | "weekly" | "monthly";
        startDate: string;
        endDate: string;
        timeline: {
            period: string;
            revenue: number;
            transactions: number;
            avgTransaction: number;
        }[];
        byOperator: {
            operatorName: string;
            revenue: number;
            bookings: number;
        }[];
        summary: {
            totalRevenue: number;
            totalTransactions: number;
        };
    }>;
    /**
     * Booking analytics — status distribution, trends, conversion funnel.
     */
    getBookingAnalytics(query: BookingAnalyticsQuery): Promise<{
        period: "daily" | "weekly" | "monthly";
        startDate: string;
        endDate: string;
        statusDistribution: {
            status: import(".prisma/client").$Enums.BookingStatus;
            count: number;
        }[];
        trends: {
            period: string;
            total: number;
            confirmed: number;
            cancelled: number;
            failed: number;
        }[];
        topRoutes: {
            fromCity: string;
            toCity: string;
            bookings: number;
            revenue: number;
        }[];
    }>;
    /**
     * User analytics — registration trends, user segmentation.
     */
    getUserAnalytics(query: UserAnalyticsQuery): Promise<{
        period: "daily" | "weekly" | "monthly";
        startDate: string;
        endDate: string;
        roleDistribution: {
            role: import(".prisma/client").$Enums.UserRole;
            count: number;
        }[];
        statusDistribution: {
            status: import(".prisma/client").$Enums.UserStatus;
            count: number;
        }[];
        registrationTrends: {
            period: string;
            newUsers: number;
        }[];
        topUsers: {
            userId: string;
            name: string;
            email: string;
            bookings: number;
            totalSpent: number;
        }[];
    }>;
    /**
     * System health — DB, Redis, queue stats.
     */
    getSystemHealth(): Promise<{
        status: string;
        services: {
            database: {
                status: string;
            };
            redis: {
                status: string;
                memoryUsed: string;
                connectedClients: string;
            };
        };
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
        nodeVersion: string;
        timestamp: string;
    }>;
    private getDateFrom;
}
//# sourceMappingURL=dashboard.service.d.ts.map