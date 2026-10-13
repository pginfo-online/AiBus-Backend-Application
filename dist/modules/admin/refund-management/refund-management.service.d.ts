import { PaginatedResult } from '../admin.utils';
import { ListRefundsQuery } from './refund-management.validation';
export declare class RefundManagementService {
    private static instance;
    private readonly logger;
    static getInstance(): RefundManagementService;
    /**
     * List refunds with pagination, status filtering, and date range
     */
    listRefunds(query: ListRefundsQuery): Promise<PaginatedResult<any>>;
    /**
     * Get refund details by ID with complete relations
     */
    getRefundById(id: string): Promise<any>;
    /**
     * Manually process a pending/failed refund
     */
    processRefund(id: string, adminId: string, notes?: string): Promise<any>;
    /**
     * Retry a failed refund via the background refund queue
     */
    retryRefund(id: string, adminId: string): Promise<any>;
    /**
     * Aggregate refund statistics
     */
    getRefundStats(): Promise<any>;
}
//# sourceMappingURL=refund-management.service.d.ts.map