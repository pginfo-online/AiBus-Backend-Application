import { PaginatedResult } from '../admin.utils';
import { ListProviderTransactionsQuery } from './provider-management.validation';
export declare class ProviderManagementService {
    private static instance;
    private readonly logger;
    static getInstance(): ProviderManagementService;
    /**
     * List all integrated providers with status and aggregate transaction stats
     */
    getProviders(): Promise<any[]>;
    /**
     * Health check for a specific provider
     */
    getProviderHealth(name: string): Promise<any>;
    /**
     * List raw GDS / Gateway API transaction logs
     */
    listTransactions(query: ListProviderTransactionsQuery): Promise<PaginatedResult<any>>;
    /**
     * Get single transaction log with complete payloads
     */
    getTransactionById(id: string): Promise<any>;
    /**
     * Check operator balance with inventory provider
     */
    getProviderBalance(name: string): Promise<any>;
}
//# sourceMappingURL=provider-management.service.d.ts.map