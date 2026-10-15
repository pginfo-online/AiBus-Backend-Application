import { Request, Response, NextFunction } from 'express';
import { AgentManagementService } from './agent-management.service';
import {
  ListAgentsQuery,
  KycReviewBody,
  SuspendAgentBody,
  UpdateCreditLimitBody,
} from './agent-management.validation';
import { ApiResponse } from '../../../shared/utils/response';

export class AgentManagementController {
  private static instance: AgentManagementController;
  private agentService: AgentManagementService;

  private constructor() {
    this.agentService = AgentManagementService.getInstance();
  }

  public static getInstance(): AgentManagementController {
    if (!AgentManagementController.instance) {
      AgentManagementController.instance = new AgentManagementController();
    }
    return AgentManagementController.instance;
  }

  public listAgents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req as any).validatedQuery as ListAgentsQuery || req.query;
      const result = await this.agentService.listAgents(query);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public getAgentDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = String(req.params.agentId);
      const agent = await this.agentService.getAgentDetails(agentId);
      ApiResponse.success(res, agent);
    } catch (error) {
      next(error);
    }
  };

  public reviewKyc = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = String(req.params.agentId);
      const adminId = (req as any).user?.sub || 'SYSTEM';
      const body = req.body as KycReviewBody;
      const result = await this.agentService.reviewKyc(agentId, adminId, body);
      ApiResponse.success(res, result, `KYC review updated: ${body.action}`);
    } catch (error) {
      next(error);
    }
  };

  public suspendAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = String(req.params.agentId);
      const adminId = (req as any).user?.sub || 'SYSTEM';
      const body = req.body as SuspendAgentBody;
      const result = await this.agentService.suspendAgent(agentId, adminId, body);
      ApiResponse.success(res, result, 'Agent suspended and wallet frozen');
    } catch (error) {
      next(error);
    }
  };

  public reactivateAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = String(req.params.agentId);
      const result = await this.agentService.reactivateAgent(agentId);
      ApiResponse.success(res, result, 'Agent reactivated and wallet unfrozen');
    } catch (error) {
      next(error);
    }
  };

  public updateCreditLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = String(req.params.agentId);
      const body = req.body as UpdateCreditLimitBody;
      const result = await this.agentService.updateCreditLimit(agentId, body);
      ApiResponse.success(res, result, 'Agent credit limit updated');
    } catch (error) {
      next(error);
    }
  };
}
