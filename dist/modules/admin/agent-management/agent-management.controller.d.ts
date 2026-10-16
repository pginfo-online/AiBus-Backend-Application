import { Request, Response, NextFunction } from 'express';
export declare class AgentManagementController {
    private static instance;
    private agentService;
    private constructor();
    static getInstance(): AgentManagementController;
    listAgents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAgentDetails: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    reviewKyc: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    suspendAgent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    reactivateAgent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateCreditLimit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=agent-management.controller.d.ts.map