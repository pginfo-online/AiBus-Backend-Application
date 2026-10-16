"use strict";
// ---------------------------------------------------------------------------
// Admin Support Management — Service
// Support ticket lifecycle, status management, agent assignments, ticket replies
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportManagementService = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const admin_utils_1 = require("../admin.utils");
class SupportManagementService {
    static instance;
    logger = logger_1.logger.child({ module: 'admin-support-management' });
    static getInstance() {
        if (!SupportManagementService.instance) {
            SupportManagementService.instance = new SupportManagementService();
        }
        return SupportManagementService.instance;
    }
    /**
     * List support tickets with filters and pagination
     */
    async listTickets(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const { skip, take, page, limit } = (0, admin_utils_1.buildPagination)(query);
        const where = {};
        if (query.search) {
            where.OR = [
                { ticketNumber: { contains: query.search, mode: 'insensitive' } },
                { subject: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.priority) {
            where.priority = query.priority;
        }
        if (query.category) {
            where.category = query.category;
        }
        if (query.assignedTo) {
            where.assignedTo = query.assignedTo;
        }
        if (query.userId) {
            where.userId = query.userId;
        }
        const orderBy = {};
        if (query.sortBy) {
            orderBy[query.sortBy] = query.sortOrder || 'desc';
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const [total, tickets] = await Promise.all([
            prisma.supportTicket.count({ where }),
            prisma.supportTicket.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    _count: {
                        select: { replies: true },
                    },
                },
            }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            items: tickets,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    /**
     * Get single ticket by ID with full reply history
     */
    async getTicketById(id) {
        const prisma = (0, database_1.getPrismaClient)();
        const ticket = await prisma.supportTicket.findUnique({
            where: { id },
            include: {
                replies: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!ticket) {
            throw new errors_1.NotFoundError(`Support ticket with ID '${id}' not found`);
        }
        return ticket;
    }
    /**
     * Create a support ticket (admin-initiated)
     */
    async createTicket(input, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const ticketNumber = (0, admin_utils_1.generateTicketNumber)();
        const ticket = await prisma.supportTicket.create({
            data: {
                ticketNumber,
                userId: input.userId,
                bookingId: input.bookingId,
                subject: input.subject,
                description: input.description,
                category: input.category,
                priority: input.priority || client_1.SupportTicketPriority.MEDIUM,
                assignedTo: input.assignedTo,
                status: client_1.SupportTicketStatus.OPEN,
            },
        });
        await prisma.adminActivityLog.create({
            data: {
                adminId,
                action: 'CREATE_SUPPORT_TICKET',
                module: 'support-management',
                resourceType: 'support_ticket',
                resourceId: ticket.id,
                details: { ticketNumber, category: input.category },
            },
        });
        this.logger.info({ ticketId: ticket.id, ticketNumber, adminId }, 'Support ticket created');
        return ticket;
    }
    /**
     * Update support ticket status, priority, or assignment
     */
    async updateTicket(id, input, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.supportTicket.findUnique({ where: { id } });
        if (!existing) {
            throw new errors_1.NotFoundError(`Support ticket with ID '${id}' not found`);
        }
        const data = {
            ...(input.status !== undefined && { status: input.status }),
            ...(input.priority !== undefined && { priority: input.priority }),
            ...(input.category !== undefined && { category: input.category }),
            ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
        };
        if (input.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
            data.resolvedAt = new Date();
        }
        if (input.status === 'CLOSED' && existing.status !== 'CLOSED') {
            data.closedAt = new Date();
        }
        const updated = await prisma.supportTicket.update({
            where: { id },
            data,
        });
        await prisma.adminActivityLog.create({
            data: {
                adminId,
                action: 'UPDATE_SUPPORT_TICKET',
                module: 'support-management',
                resourceType: 'support_ticket',
                resourceId: id,
                details: { changes: input },
            },
        });
        this.logger.info({ ticketId: id, adminId }, 'Support ticket updated');
        return updated;
    }
    /**
     * Add reply or internal note to a support ticket
     */
    async replyToTicket(ticketId, input, authorId, authorType) {
        const prisma = (0, database_1.getPrismaClient)();
        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
            throw new errors_1.NotFoundError(`Support ticket with ID '${ticketId}' not found`);
        }
        const reply = await prisma.$transaction(async (tx) => {
            const createdReply = await tx.supportTicketReply.create({
                data: {
                    ticketId,
                    authorId,
                    authorType,
                    message: input.message,
                    isInternal: input.isInternal ?? false,
                },
            });
            // If customer was waiting, switch status to AWAITING_CUSTOMER or IN_PROGRESS
            if (!input.isInternal && ticket.status === client_1.SupportTicketStatus.OPEN) {
                await tx.supportTicket.update({
                    where: { id: ticketId },
                    data: { status: client_1.SupportTicketStatus.IN_PROGRESS },
                });
            }
            await tx.adminActivityLog.create({
                data: {
                    adminId: authorId,
                    action: input.isInternal ? 'ADD_TICKET_INTERNAL_NOTE' : 'REPLY_SUPPORT_TICKET',
                    module: 'support-management',
                    resourceType: 'support_ticket',
                    resourceId: ticketId,
                    details: { replyId: createdReply.id, isInternal: input.isInternal },
                },
            });
            return createdReply;
        });
        this.logger.info({ ticketId, replyId: reply.id, authorId }, 'Support ticket reply added');
        return reply;
    }
}
exports.SupportManagementService = SupportManagementService;
//# sourceMappingURL=support-management.service.js.map