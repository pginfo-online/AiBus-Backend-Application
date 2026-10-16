"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManagementController = void 0;
const agent_management_service_1 = require("./agent-management.service");
const response_1 = require("../../../shared/utils/response");
class AgentManagementController {
    static instance;
    agentService;
    constructor() {
        this.agentService = agent_management_service_1.AgentManagementService.getInstance();
    }
    static getInstance() {
        if (!AgentManagementController.instance) {
            AgentManagementController.instance = new AgentManagementController();
        }
        return AgentManagementController.instance;
    }
    listAgents = async (req, res, next) => {
        try {
            const query = req.validatedQuery || req.query;
            const result = await this.agentService.listAgents(query);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    getAgentDetails = async (req, res, next) => {
        try {
            const agentId = String(req.params.agentId);
            const agent = await this.agentService.getAgentDetails(agentId);
            response_1.ApiResponse.success(res, agent);
        }
        catch (error) {
            next(error);
        }
    };
    reviewKyc = async (req, res, next) => {
        try {
            const agentId = String(req.params.agentId);
            const adminId = req.user?.sub || 'SYSTEM';
            const body = req.body;
            const result = await this.agentService.reviewKyc(agentId, adminId, body);
            response_1.ApiResponse.success(res, result, `KYC review updated: ${body.action}`);
        }
        catch (error) {
            next(error);
        }
    };
    suspendAgent = async (req, res, next) => {
        try {
            const agentId = String(req.params.agentId);
            const adminId = req.user?.sub || 'SYSTEM';
            const body = req.body;
            const result = await this.agentService.suspendAgent(agentId, adminId, body);
            response_1.ApiResponse.success(res, result, 'Agent suspended and wallet frozen');
        }
        catch (error) {
            next(error);
        }
    };
    reactivateAgent = async (req, res, next) => {
        try {
            const agentId = String(req.params.agentId);
            const result = await this.agentService.reactivateAgent(agentId);
            response_1.ApiResponse.success(res, result, 'Agent reactivated and wallet unfrozen');
        }
        catch (error) {
            next(error);
        }
    };
    updateCreditLimit = async (req, res, next) => {
        try {
            const agentId = String(req.params.agentId);
            const body = req.body;
            const result = await this.agentService.updateCreditLimit(agentId, body);
            response_1.ApiResponse.success(res, result, 'Agent credit limit updated');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AgentManagementController = AgentManagementController;
//# sourceMappingURL=agent-management.controller.js.map