import { PaginatedResult } from '../admin.utils';
import { ListOperatorsQuery, CreateOperatorInput, UpdateOperatorInput } from './operator-management.validation';
export declare class OperatorManagementService {
    private static instance;
    private readonly logger;
    static getInstance(): OperatorManagementService;
    /**
     * List operators with filtering and pagination
     */
    listOperators(query: ListOperatorsQuery): Promise<PaginatedResult<any>>;
    /**
     * Get single operator with full metadata
     */
    getOperatorById(id: string): Promise<any>;
    /**
     * Create a new operator
     */
    createOperator(input: CreateOperatorInput, adminId: string): Promise<any>;
    /**
     * Update operator details
     */
    updateOperator(id: string, input: UpdateOperatorInput, adminId: string): Promise<any>;
    /**
     * Suspend an operator
     */
    suspendOperator(id: string, reason: string, adminId: string): Promise<any>;
    /**
     * Activate an operator
     */
    activateOperator(id: string, adminId: string): Promise<any>;
    /**
     * Get bookings associated with an operator
     */
    getOperatorBookings(operatorId: string, query: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResult<any>>;
}
//# sourceMappingURL=operator-management.service.d.ts.map