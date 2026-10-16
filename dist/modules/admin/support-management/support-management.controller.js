"use strict";
// ---------------------------------------------------------------------------
// Admin Support Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportManagementController = void 0;
const support_management_service_1 = require("./support-management.service");
const utils_1 = require("../../../shared/utils");
class SupportManagementController {
    service = support_management_service_1.SupportManagementService.getInstance();
    listTickets = async (req, res, next) => {
        try {
            const result = await this.service.listTickets(req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Support tickets retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getTicketById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const ticket = await this.service.getTicketById(id);
            utils_1.ApiResponse.success(res, ticket, 'Support ticket details retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createTicket = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const ticket = await this.service.createTicket(req.body, adminId);
            utils_1.ApiResponse.created(res, ticket, 'Support ticket created successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateTicket = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const ticket = await this.service.updateTicket(id, req.body, adminId);
            utils_1.ApiResponse.success(res, ticket, 'Support ticket updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    replyToTicket = async (req, res, next) => {
        try {
            const authorId = req.user.sub;
            const authorType = req.user.role; // 'ADMIN' or 'SUPPORT_AGENT'
            const id = req.params.id;
            const reply = await this.service.replyToTicket(id, req.body, authorId, authorType);
            utils_1.ApiResponse.created(res, reply, 'Reply added successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.SupportManagementController = SupportManagementController;
//# sourceMappingURL=support-management.controller.js.map