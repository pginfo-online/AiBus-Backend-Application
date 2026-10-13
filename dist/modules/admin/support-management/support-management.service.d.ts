import { PaginatedResult } from '../admin.utils';
import { ListTicketsQuery, CreateTicketInput, UpdateTicketInput, CreateTicketReplyInput } from './support-management.validation';
export declare class SupportManagementService {
    private static instance;
    private readonly logger;
    static getInstance(): SupportManagementService;
    /**
     * List support tickets with filters and pagination
     */
    listTickets(query: ListTicketsQuery): Promise<PaginatedResult<any>>;
    /**
     * Get single ticket by ID with full reply history
     */
    getTicketById(id: string): Promise<any>;
    /**
     * Create a support ticket (admin-initiated)
     */
    createTicket(input: CreateTicketInput, adminId: string): Promise<any>;
    /**
     * Update support ticket status, priority, or assignment
     */
    updateTicket(id: string, input: UpdateTicketInput, adminId: string): Promise<any>;
    /**
     * Add reply or internal note to a support ticket
     */
    replyToTicket(ticketId: string, input: CreateTicketReplyInput, authorId: string, authorType: string): Promise<any>;
}
//# sourceMappingURL=support-management.service.d.ts.map