import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthenticationError, TokenExpiredError, AuthorizationError } from '../../shared/errors';
import { UserRoleType, UserRole } from '../../shared/constants';
import { logger } from '../../infrastructure/logger';

// ---------------------------------------------------------------------------
// JWT authentication and role-based authorization middleware
// ---------------------------------------------------------------------------

/** Payload embedded in JWT access tokens */
export interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: UserRoleType;
  iat: number;
  exp: number;
  iss: string;
  jti: string; // Token ID
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authentication middleware — verifies JWT access token from Authorization header.
 * Attaches decoded payload to `req.user`.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      algorithms: ['HS256'],
    }) as TokenPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new TokenExpiredError());
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      next(new AuthenticationError('Authentication failed'));
    }
  }
}

// Import AppError for instanceof check
import { AppError } from '../../shared/errors';

/**
 * Authorization middleware — checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER `authenticate`.
 */
export function authorize(...allowedRoles: UserRoleType[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('User not authenticated'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        {
          userId: req.user.sub,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path,
          requestId: req.requestId,
        },
        'Authorization denied'
      );
      next(new AuthorizationError());
      return;
    }

    next();
  };
}

/**
 * Optional authentication — attaches user if token present, but doesn't require it.
 * Useful for endpoints that work for both authenticated and anonymous users.
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      algorithms: ['HS256'],
    }) as TokenPayload;
    req.user = decoded;
  } catch {
    // Token invalid/expired — proceed without user context
  }

  next();
}

/** Role hierarchy for comparison */
const ROLE_HIERARCHY: Record<UserRoleType, number> = {
  [UserRole.CUSTOMER]: 0,
  [UserRole.OPERATOR_AGENT]: 1,
  [UserRole.SUPPORT]: 2,
  [UserRole.SUPPORT_AGENT]: 2,
  [UserRole.ADMIN]: 3,
  [UserRole.SUPER_ADMIN]: 4,
};

/**
 * Check if a role has at least the minimum required privilege level.
 */
export function hasMinimumRole(
  userRole: UserRoleType,
  minimumRole: UserRoleType
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
