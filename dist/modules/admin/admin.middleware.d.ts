import { Request, Response, NextFunction } from 'express';
import { AdminPermissionType } from './admin.permissions';
/**
 * Middleware that checks if the authenticated user has the required admin permission.
 * Must be used AFTER `authenticate` and `authorize('ADMIN','SUPER_ADMIN')` or `authorize('SUPPORT','ADMIN','SUPER_ADMIN')`.
 *
 * @example
 * router.get('/users', authenticate, authorize('ADMIN','SUPER_ADMIN'), authorizePermission(AdminPermission.USERS_LIST), controller.listUsers);
 */
export declare function authorizePermission(...requiredPermissions: AdminPermissionType[]): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Middleware that records admin mutations to the `AdminActivityLog` table.
 * Runs AFTER the response is sent (non-blocking) to avoid adding latency.
 *
 * @param moduleName - The admin sub-module name (e.g., 'user-management', 'booking-management')
 */
export declare function adminAudit(moduleName: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Composite middleware: enforces that the user is authenticated AND has an admin role.
 * Use this at the top-level admin router to DRY up individual route definitions.
 */
export declare function requireAdmin(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=admin.middleware.d.ts.map