import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requireAgentContext,
  requireAgentKycApproved,
  requireAgentRoles,
} from '../../src/modules/agents/agents.middleware';
import { getPrismaClient } from '../../src/infrastructure/database';
import { AgentStaffRole, AgentStatus } from '@prisma/client';
import { AuthenticationError, AuthorizationError, NotFoundError } from '../../src/shared/errors';

// Mock database
vi.mock('../../src/infrastructure/database', () => {
  const mockAgentStaff = {
    findFirst: vi.fn(),
  };
  const mockAgent = {
    findUnique: vi.fn(),
  };

  return {
    getPrismaClient: () => ({
      agentStaff: mockAgentStaff,
      agent: mockAgent,
    }),
  };
});

describe('IDOR & Multi-Tenant Isolation Middleware', () => {
  const prismaMock = getPrismaClient() as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject unauthenticated requests with AuthenticationError', async () => {
    const req: any = {};
    const res: any = {};
    const next = vi.fn();

    await requireAgentContext(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
  });

  it('should derive agentId strictly from user staff membership in DB', async () => {
    const authenticatedUserId = 'user-uuid-101';
    const legitimateAgentId = 'agent-uuid-company-a';
    const spoofedAgentId = 'agent-uuid-victim-b';

    const req: any = {
      user: { sub: authenticatedUserId, role: 'CUSTOMER' },
      query: { agentId: spoofedAgentId }, // Malicious agentId in query
      body: { agentId: spoofedAgentId },  // Malicious agentId in body
    };
    const res: any = {};
    const next = vi.fn();

    prismaMock.agentStaff.findFirst.mockResolvedValueOnce({
      id: 'staff-1',
      userId: authenticatedUserId,
      role: AgentStaffRole.BOOKING_AGENT,
      agent: {
        id: legitimateAgentId,
        businessName: 'Company A Travels',
        status: AgentStatus.APPROVED,
        wallet: { id: 'wallet-a', cashBalance: 5000 },
      },
    });

    await requireAgentContext(req, res, next);

    expect(next).toHaveBeenCalledWith();
    // Invariant: req.agentId MUST be Company A, never the spoofed Company B
    expect(req.agentId).toBe(legitimateAgentId);
    expect(req.agentId).not.toBe(spoofedAgentId);
    expect(req.agent.businessName).toBe('Company A Travels');
  });

  it('should block non-agent users with NotFoundError', async () => {
    const regularUserId = 'user-regular-customer';

    const req: any = {
      user: { sub: regularUserId, role: 'CUSTOMER' },
    };
    const res: any = {};
    const next = vi.fn();

    prismaMock.agentStaff.findFirst.mockResolvedValueOnce(null);

    await requireAgentContext(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
  });

  it('should block suspended agents with AuthorizationError', async () => {
    const staffUserId = 'user-suspended-agent';

    const req: any = {
      user: { sub: staffUserId, role: 'OPERATOR_AGENT' },
    };
    const res: any = {};
    const next = vi.fn();

    prismaMock.agentStaff.findFirst.mockResolvedValueOnce({
      id: 'staff-susp',
      userId: staffUserId,
      role: AgentStaffRole.OWNER,
      agent: {
        id: 'agent-suspended',
        businessName: 'Fraudulent Travels',
        status: AgentStatus.SUSPENDED,
        suspendedReason: 'Regulatory non-compliance',
      },
    });

    await requireAgentContext(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    const error: AuthorizationError = next.mock.calls[0][0];
    expect(error.message).toContain('suspended');
  });

  it('should block unapproved agents at requireAgentKycApproved gate', () => {
    const req: any = {
      agent: {
        id: 'agent-pending',
        status: AgentStatus.PENDING_KYC,
      },
    };
    const res: any = {};
    const next = vi.fn();

    requireAgentKycApproved(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    const error: AuthorizationError = next.mock.calls[0][0];
    expect(error.message).toContain('KYC verification is required');
  });

  it('should allow approved agents through requireAgentKycApproved gate', () => {
    const req: any = {
      agent: {
        id: 'agent-approved',
        status: AgentStatus.APPROVED,
      },
    };
    const res: any = {};
    const next = vi.fn();

    requireAgentKycApproved(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should enforce role-based access for agent staff', () => {
    const req: any = {
      agentStaff: {
        role: AgentStaffRole.VIEWER,
      },
      user: { role: 'CUSTOMER' },
    };
    const res: any = {};
    const next = vi.fn();

    // Only OWNER and MANAGER can perform this action
    const middleware = requireAgentRoles(AgentStaffRole.OWNER, AgentStaffRole.MANAGER);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    const error: AuthorizationError = next.mock.calls[0][0];
    expect(error.message).toContain('Action requires one of the following roles');
  });

  it('should allow authorized staff roles through role-based access check', () => {
    const req: any = {
      agentStaff: {
        role: AgentStaffRole.OWNER,
      },
      user: { role: 'CUSTOMER' },
    };
    const res: any = {};
    const next = vi.fn();

    const middleware = requireAgentRoles(AgentStaffRole.OWNER, AgentStaffRole.MANAGER);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
