import { UserRoleType } from '../../shared/constants';
/**
 * All granular admin permissions — used with `authorizePermission()` middleware.
 */
export declare const AdminPermission: {
    readonly DASHBOARD_VIEW: "dashboard:view";
    readonly USERS_LIST: "users:list";
    readonly USERS_VIEW: "users:view";
    readonly USERS_UPDATE: "users:update";
    readonly USERS_SUSPEND: "users:suspend";
    readonly USERS_DELETE: "users:delete";
    readonly BOOKINGS_LIST: "bookings:list";
    readonly BOOKINGS_VIEW: "bookings:view";
    readonly BOOKINGS_UPDATE_STATUS: "bookings:update_status";
    readonly BOOKINGS_CANCEL: "bookings:cancel";
    readonly BOOKINGS_RECONCILE: "bookings:reconcile";
    readonly PAYMENTS_LIST: "payments:list";
    readonly PAYMENTS_VIEW: "payments:view";
    readonly PAYMENTS_RECONCILE: "payments:reconcile";
    readonly REFUNDS_LIST: "refunds:list";
    readonly REFUNDS_VIEW: "refunds:view";
    readonly REFUNDS_PROCESS: "refunds:process";
    readonly REFUNDS_RETRY: "refunds:retry";
    readonly CITIES_LIST: "cities:list";
    readonly CITIES_MANAGE: "cities:manage";
    readonly OPERATORS_LIST: "operators:list";
    readonly OPERATORS_VIEW: "operators:view";
    readonly OPERATORS_MANAGE: "operators:manage";
    readonly COUPONS_LIST: "coupons:list";
    readonly COUPONS_VIEW: "coupons:view";
    readonly COUPONS_MANAGE: "coupons:manage";
    readonly SUPPORT_VIEW: "support:view";
    readonly SUPPORT_MANAGE: "support:manage";
    readonly NOTIFICATIONS_VIEW: "notifications:view";
    readonly NOTIFICATIONS_MANAGE: "notifications:manage";
    readonly NOTIFICATIONS_BROADCAST: "notifications:broadcast";
    readonly AUDIT_VIEW: "audit:view";
    readonly AUDIT_EXPORT: "audit:export";
    readonly SYSTEM_CONFIG: "system:config";
    readonly SYSTEM_FEATURE_FLAGS: "system:feature_flags";
    readonly SYSTEM_HEALTH: "system:health";
    readonly REPORTS_VIEW: "reports:view";
    readonly REPORTS_EXPORT: "reports:export";
    readonly PROVIDERS_VIEW: "providers:view";
    readonly PROVIDERS_MANAGE: "providers:manage";
};
export type AdminPermissionType = typeof AdminPermission[keyof typeof AdminPermission];
/**
 * Check if a role has a specific permission.
 */
export declare function roleHasPermission(role: UserRoleType, permission: AdminPermissionType): boolean;
/**
 * Get all permissions for a given role.
 */
export declare function getPermissionsForRole(role: UserRoleType): AdminPermissionType[];
//# sourceMappingURL=admin.permissions.d.ts.map