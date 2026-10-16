import { Request, Response, NextFunction } from 'express';
import { UserRoleType } from '../../shared/constants';
/** Payload embedded in JWT access tokens */
export interface TokenPayload {
    sub: string;
    email: string;
    role: UserRoleType;
    iat: number;
    exp: number;
    iss: string;
    jti: string;
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
export declare function authenticate(req: Request, _res: Response, next: NextFunction): void;
/**
 * Authorization middleware — checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER `authenticate`.
 */
export declare function authorize(...allowedRoles: UserRoleType[]): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Optional authentication — attaches user if token present, but doesn't require it.
 * Useful for endpoints that work for both authenticated and anonymous users.
 */
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): void;
/**
 * Check if a role has at least the minimum required privilege level.
 */
export declare function hasMinimumRole(userRole: UserRoleType, minimumRole: UserRoleType): boolean;
//# sourceMappingURL=auth.d.ts.map