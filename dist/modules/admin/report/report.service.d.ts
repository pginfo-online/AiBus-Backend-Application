import { ReportQuery } from './report.validation';
export declare class ReportService {
    private static instance;
    private readonly logger;
    static getInstance(): ReportService;
    /**
     * Revenue analytics report
     */
    getRevenueReport(query: ReportQuery): Promise<any[]>;
    /**
     * Bookings operational report
     */
    getBookingReport(query: ReportQuery): Promise<any[]>;
    /**
     * User growth & status report
     */
    getUserReport(query: ReportQuery): Promise<any[]>;
    /**
     * Cancellations & deductions report
     */
    getCancellationReport(query: ReportQuery): Promise<any[]>;
    /**
     * Payment transactions & reconciliation report
     */
    getPaymentReport(query: ReportQuery): Promise<any[]>;
}
//# sourceMappingURL=report.service.d.ts.map