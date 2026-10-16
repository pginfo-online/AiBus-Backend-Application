"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAgentContext = requireAgentContext;
exports.requireAgentKycApproved = requireAgentKycApproved;
exports.requireAgentRoles = requireAgentRoles;
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
const client_1 = require("@prisma/client");
/**
 * Middleware: Resolves agent organization from the authenticated user's JWT.
 * Prevents cross-tenant IDOR by deriving agentId strictly from database membership.
 */
async function requireAgentContext(req, _res, next) {
    try {
        if (!req.user) {
            throw new errors_1.AuthenticationError('Authentication required');
        }
        const prisma = (0, database_1.getPrismaClient)();
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
            const explicitAgentId = req.headers['x-agent-id'] || req.query.agentId;
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
            throw new errors_1.NotFoundError('No active agent organization found for this user account');
        }
        if (staff.agent.status === client_1.AgentStatus.SUSPENDED) {
            throw new errors_1.AuthorizationError(`Agent account is suspended: ${staff.agent.suspendedReason || 'Contact platform administration'}`);
        }
        req.agentStaff = staff;
        req.agent = staff.agent;
        req.agentId = staff.agent.id;
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Middleware: Enforces that the agent organization has an APPROVED KYC status.
 * Required for booking seats, debiting wallet, and ticketing operations.
 */
function requireAgentKycApproved(req, _res, next) {
    if (!req.agent) {
        return next(new errors_1.AuthenticationError('Agent context not resolved'));
    }
    if (req.agent.status !== client_1.AgentStatus.APPROVED) {
        return next(new errors_1.AuthorizationError(`Agent KYC verification is required. Current status: ${req.agent.status}`));
    }
    next();
}
/**
 * Middleware: Checks if the agent staff member has one of the allowed roles.
 */
function requireAgentRoles(...allowedRoles) {
    return (req, _res, next) => {
        // If request has admin bypass, allow
        if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
            return next();
        }
        if (!req.agentStaff) {
            return next(new errors_1.AuthorizationError('Agent staff authorization required'));
        }
        if (!allowedRoles.includes(req.agentStaff.role)) {
            return next(new errors_1.AuthorizationError(`Action requires one of the following roles: ${allowedRoles.join(', ')}`));
        }
        next();
    };
}
//# sourceMappingURL=agents.middleware.js.map