import { Request, Response, NextFunction } from 'express';
import { Agent, AgentStaff, AgentStaffRole, AgentWallet } from '@prisma/client';
export type AgentWithWallet = Agent & {
    wallet?: AgentWallet | null;
};
declare global {
    namespace Express {
        interface Request {
            agentStaff?: AgentStaff;
            agent?: AgentWithWallet;
            agentId?: string;
        }
    }
}
/**
 * Middleware: Resolves agent organization from the authenticated user's JWT.
 * Prevents cross-tenant IDOR by deriving agentId strictly from database membership.
 */
export declare function requireAgentContext(req: Request, _res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware: Enforces that the agent organization has an APPROVED KYC status.
 * Required for booking seats, debiting wallet, and ticketing operations.
 */
export declare function requireAgentKycApproved(req: Request, _res: Response, next: NextFunction): void;
/**
 * Middleware: Checks if the agent staff member has one of the allowed roles.
 */
export declare function requireAgentRoles(...allowedRoles: AgentStaffRole[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=agents.middleware.d.ts.map