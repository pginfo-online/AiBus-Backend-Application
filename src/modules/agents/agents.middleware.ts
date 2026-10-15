import { Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '../../infrastructure/database';
import { AuthenticationError, AuthorizationError, NotFoundError } from '../../shared/errors';
import { Agent, AgentStaff, AgentStaffRole, AgentStatus, AgentWallet } from '@prisma/client';

export type AgentWithWallet = Agent & { wallet?: AgentWallet | null };

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
export async function requireAgentContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const prisma = getPrismaClient();

    // Check staff membership for user
    const staff = await prisma.agentStaff.findFirst({
      where: { userId: req.user.sub, isActive: true },
      include: {
        agent: {
          include: { wallet: true },
        },
      },
    });

    // If user is ADMIN or SUPER_ADMIN, allow optional delegation if specified
    if (!staff && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
      const explicitAgentId = (req.headers['x-agent-id'] as string) || (req.query.agentId as string);
      if (explicitAgentId) {
        const agent = await prisma.agent.findUnique({
          where: { id: explicitAgentId },
          include: { wallet: true },
        });
        if (agent) {
          req.agent = agent;
          req.agentId = agent.id;
          return next();
        }
      }
    }

    if (!staff || !staff.agent) {
      throw new NotFoundError('No active agent organization found for this user account');
    }

    if (staff.agent.status === AgentStatus.SUSPENDED) {
      throw new AuthorizationError(
        `Agent account is suspended: ${staff.agent.suspendedReason || 'Contact platform administration'}`
      );
    }

    req.agentStaff = staff;
    req.agent = staff.agent;
    req.agentId = staff.agent.id;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Enforces that the agent organization has an APPROVED KYC status.
 * Required for booking seats, debiting wallet, and ticketing operations.
 */
export function requireAgentKycApproved(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.agent) {
    return next(new AuthenticationError('Agent context not resolved'));
  }

  if (req.agent.status !== AgentStatus.APPROVED) {
    return next(
      new AuthorizationError(
        `Agent KYC verification is required. Current status: ${req.agent.status}`
      )
    );
  }

  next();
}

/**
 * Middleware: Checks if the agent staff member has one of the allowed roles.
 */
export function requireAgentRoles(...allowedRoles: AgentStaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // If request has admin bypass, allow
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
      return next();
    }

    if (!req.agentStaff) {
      return next(new AuthorizationError('Agent staff authorization required'));
    }

    if (!allowedRoles.includes(req.agentStaff.role)) {
      return next(
        new AuthorizationError(
          `Action requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
