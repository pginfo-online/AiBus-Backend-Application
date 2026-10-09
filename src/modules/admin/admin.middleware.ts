// ---------------------------------------------------------------------------
// Admin Module — Middleware
// Authorization, audit logging, rate limiting for admin endpoints
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { AdminPermissionType, roleHasPermission } from './admin.permissions';
import { AuthorizationError, AuthenticationError } from '../../shared/errors';
import { getPrismaClient } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { UserRole } from '../../shared/constants';

const adminLogger = logger.child({ module: 'admin-middleware' });

// ---------------------------------------------------------------------------
// Permission-based authorization middleware
// ---------------------------------------------------------------------------

/**
 * Middleware that checks if the authenticated user has the required admin permission.
 * Must be used AFTER `authenticate` and `authorize('ADMIN','SUPER_ADMIN')` or `authorize('SUPPORT','ADMIN','SUPER_ADMIN')`.
 *
 * @example
 * router.get('/users', authenticate, authorize('ADMIN','SUPER_ADMIN'), authorizePermission(AdminPermission.USERS_LIST), controller.listUsers);
 */
export function authorizePermission(...requiredPermissions: AdminPermissionType[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('User not authenticated'));
      return;
    }

    const userRole = req.user.role;

    const hasPermission = requiredPermissions.every((perm) =>
      roleHasPermission(userRole, perm)
    );

    if (!hasPermission) {
      adminLogger.warn(
        {
          userId: req.user.sub,
          userRole,
          requiredPermissions,
          path: req.path,
          method: req.method,
        },
        'Admin permission denied'
      );
      next(new AuthorizationError(`Missing required permission: ${requiredPermissions.join(', ')}`));
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Admin audit trail middleware — auto-records every admin mutation
// ---------------------------------------------------------------------------

/** HTTP methods considered mutations (logged automatically) */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Middleware that records admin mutations to the `AdminActivityLog` table.
 * Runs AFTER the response is sent (non-blocking) to avoid adding latency.
 *
 * @param moduleName - The admin sub-module name (e.g., 'user-management', 'booking-management')
 */
export function adminAudit(moduleName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only log mutations
    if (!MUTATION_METHODS.has(req.method)) {
      next();
      return;
    }

    // Record after response is finished
    res.on('finish', () => {
      // Only log successful mutations (2xx status)
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (!req.user) return;

      const prisma = getPrismaClient();

      // Extract resource info from route params
      const resourceId = (req.params as Record<string, string>).id || null;
      const action = `${req.method} ${req.route?.path || req.path}`;

      // Fire-and-forget — don't block the response
      prisma.adminActivityLog
        .create({
          data: {
            adminId: req.user.sub,
            action,
            module: moduleName,
            resourceType: moduleName,
            resourceId,
            details: JSON.parse(
              JSON.stringify({
                body: sanitizeBody(req.body),
                query: req.query,
                statusCode: res.statusCode,
              })
            ),
            ipAddress: getClientIp(req),
            userAgent: req.headers['user-agent'] || null,
            requestId: (req as any).id || req.headers['x-request-id'] as string || null,
          },
        })
        .catch((err) => {
          adminLogger.error(
            { err: err.message, action, module: moduleName },
            'Failed to record admin activity log'
          );
        });
    });

    next();
  };
}

// ---------------------------------------------------------------------------
// Admin-only gate — ensures only ADMIN/SUPER_ADMIN/SUPPORT can access
// Combines authenticate + authorize in a single middleware for admin routes
// ---------------------------------------------------------------------------

const ADMIN_ROLES = [UserRole.SUPPORT, UserRole.SUPPORT_AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;

/**
 * Composite middleware: enforces that the user is authenticated AND has an admin role.
 * Use this at the top-level admin router to DRY up individual route definitions.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AuthenticationError('Admin authentication required'));
    return;
  }

  if (!ADMIN_ROLES.includes(req.user.role as any)) {
    adminLogger.warn(
      { userId: req.user.sub, role: req.user.role, path: req.path },
      'Non-admin user attempted admin access'
    );
    next(new AuthorizationError('Admin access required'));
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip sensitive fields from request body before logging.
 */
function sanitizeBody(body: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;

  const sensitiveKeys = new Set([
    'password', 'passwordHash', 'token', 'refreshToken', 'accessToken',
    'secret', 'clientSecret', 'apiKey', 'cvv', 'cardNumber', 'creditCard',
  ]);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    sanitized[key] = sensitiveKeys.has(key.toLowerCase()) ? '[REDACTED]' : value;
  }
  return sanitized;
}

/**
 * Extract client IP from request, respecting proxy headers.
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0];
  return req.socket?.remoteAddress || 'unknown';
}
