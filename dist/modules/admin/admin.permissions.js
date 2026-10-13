"use strict";
// ---------------------------------------------------------------------------
// Admin Module — Permission-Based Access Control
// Granular permissions layered on top of role-based authorization.
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPermission = void 0;
exports.roleHasPermission = roleHasPermission;
exports.getPermissionsForRole = getPermissionsForRole;
const constants_1 = require("../../shared/constants");
/**
 * All granular admin permissions — used with `authorizePermission()` middleware.
 */
exports.AdminPermission = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard:view',
    // Users
    USERS_LIST: 'users:list',
    USERS_VIEW: 'users:view',
    USERS_UPDATE: 'users:update',
    USERS_SUSPEND: 'users:suspend',
    USERS_DELETE: 'users:delete',
    // Bookings
    BOOKINGS_LIST: 'bookings:list',
    BOOKINGS_VIEW: 'bookings:view',
    BOOKINGS_UPDATE_STATUS: 'bookings:update_status',
    BOOKINGS_CANCEL: 'bookings:cancel',
    BOOKINGS_RECONCILE: 'bookings:reconcile',
    // Payments
    PAYMENTS_LIST: 'payments:list',
    PAYMENTS_VIEW: 'payments:view',
    PAYMENTS_RECONCILE: 'payments:reconcile',
    // Refunds
    REFUNDS_LIST: 'refunds:list',
    REFUNDS_VIEW: 'refunds:view',
    REFUNDS_PROCESS: 'refunds:process',
    REFUNDS_RETRY: 'refunds:retry',
    // Cities
    CITIES_LIST: 'cities:list',
    CITIES_MANAGE: 'cities:manage',
    // Operators
    OPERATORS_LIST: 'operators:list',
    OPERATORS_VIEW: 'operators:view',
    OPERATORS_MANAGE: 'operators:manage',
    // Coupons
    COUPONS_LIST: 'coupons:list',
    COUPONS_VIEW: 'coupons:view',
    COUPONS_MANAGE: 'coupons:manage',
    // Support
    SUPPORT_VIEW: 'support:view',
    SUPPORT_MANAGE: 'support:manage',
    // Notifications
    NOTIFICATIONS_VIEW: 'notifications:view',
    NOTIFICATIONS_MANAGE: 'notifications:manage',
    NOTIFICATIONS_BROADCAST: 'notifications:broadcast',
    // Audit
    AUDIT_VIEW: 'audit:view',
    AUDIT_EXPORT: 'audit:export',
    // System
    SYSTEM_CONFIG: 'system:config',
    SYSTEM_FEATURE_FLAGS: 'system:feature_flags',
    SYSTEM_HEALTH: 'system:health',
    // Reports
    REPORTS_VIEW: 'reports:view',
    REPORTS_EXPORT: 'reports:export',
    // Providers
    PROVIDERS_VIEW: 'providers:view',
    PROVIDERS_MANAGE: 'providers:manage',
};
/**
 * Default permission mapping per role.
 * SUPPORT_AGENT gets read-only + support management.
 * ADMIN gets full management except system config.
 * SUPER_ADMIN gets everything.
 */
const ROLE_PERMISSIONS = {
    [constants_1.UserRole.SUPPORT]: new Set([
        exports.AdminPermission.DASHBOARD_VIEW,
        exports.AdminPermission.USERS_LIST,
        exports.AdminPermission.USERS_VIEW,
        exports.AdminPermission.BOOKINGS_LIST,
        exports.AdminPermission.BOOKINGS_VIEW,
        exports.AdminPermission.PAYMENTS_LIST,
        exports.AdminPermission.PAYMENTS_VIEW,
        exports.AdminPermission.REFUNDS_LIST,
        exports.AdminPermission.REFUNDS_VIEW,
        exports.AdminPermission.CITIES_LIST,
        exports.AdminPermission.OPERATORS_LIST,
        exports.AdminPermission.OPERATORS_VIEW,
        exports.AdminPermission.COUPONS_LIST,
        exports.AdminPermission.COUPONS_VIEW,
        exports.AdminPermission.SUPPORT_VIEW,
        exports.AdminPermission.SUPPORT_MANAGE,
        exports.AdminPermission.NOTIFICATIONS_VIEW,
        exports.AdminPermission.AUDIT_VIEW,
        exports.AdminPermission.REPORTS_VIEW,
        exports.AdminPermission.PROVIDERS_VIEW,
        exports.AdminPermission.SYSTEM_HEALTH,
    ]),
    [constants_1.UserRole.SUPPORT_AGENT]: new Set([
        exports.AdminPermission.DASHBOARD_VIEW,
        exports.AdminPermission.USERS_LIST,
        exports.AdminPermission.USERS_VIEW,
        exports.AdminPermission.BOOKINGS_LIST,
        exports.AdminPermission.BOOKINGS_VIEW,
        exports.AdminPermission.PAYMENTS_LIST,
        exports.AdminPermission.PAYMENTS_VIEW,
        exports.AdminPermission.REFUNDS_LIST,
        exports.AdminPermission.REFUNDS_VIEW,
        exports.AdminPermission.CITIES_LIST,
        exports.AdminPermission.OPERATORS_LIST,
        exports.AdminPermission.OPERATORS_VIEW,
        exports.AdminPermission.COUPONS_LIST,
        exports.AdminPermission.COUPONS_VIEW,
        exports.AdminPermission.SUPPORT_VIEW,
        exports.AdminPermission.SUPPORT_MANAGE,
        exports.AdminPermission.NOTIFICATIONS_VIEW,
        exports.AdminPermission.AUDIT_VIEW,
        exports.AdminPermission.REPORTS_VIEW,
        exports.AdminPermission.PROVIDERS_VIEW,
        exports.AdminPermission.SYSTEM_HEALTH,
    ]),
    [constants_1.UserRole.ADMIN]: new Set([
        // All support permissions
        exports.AdminPermission.DASHBOARD_VIEW,
        exports.AdminPermission.USERS_LIST,
        exports.AdminPermission.USERS_VIEW,
        exports.AdminPermission.USERS_UPDATE,
        exports.AdminPermission.USERS_SUSPEND,
        exports.AdminPermission.BOOKINGS_LIST,
        exports.AdminPermission.BOOKINGS_VIEW,
        exports.AdminPermission.BOOKINGS_UPDATE_STATUS,
        exports.AdminPermission.BOOKINGS_CANCEL,
        exports.AdminPermission.BOOKINGS_RECONCILE,
        exports.AdminPermission.PAYMENTS_LIST,
        exports.AdminPermission.PAYMENTS_VIEW,
        exports.AdminPermission.PAYMENTS_RECONCILE,
        exports.AdminPermission.REFUNDS_LIST,
        exports.AdminPermission.REFUNDS_VIEW,
        exports.AdminPermission.REFUNDS_PROCESS,
        exports.AdminPermission.REFUNDS_RETRY,
        exports.AdminPermission.CITIES_LIST,
        exports.AdminPermission.CITIES_MANAGE,
        exports.AdminPermission.OPERATORS_LIST,
        exports.AdminPermission.OPERATORS_VIEW,
        exports.AdminPermission.OPERATORS_MANAGE,
        exports.AdminPermission.COUPONS_LIST,
        exports.AdminPermission.COUPONS_VIEW,
        exports.AdminPermission.COUPONS_MANAGE,
        exports.AdminPermission.SUPPORT_VIEW,
        exports.AdminPermission.SUPPORT_MANAGE,
        exports.AdminPermission.NOTIFICATIONS_VIEW,
        exports.AdminPermission.NOTIFICATIONS_MANAGE,
        exports.AdminPermission.NOTIFICATIONS_BROADCAST,
        exports.AdminPermission.AUDIT_VIEW,
        exports.AdminPermission.AUDIT_EXPORT,
        exports.AdminPermission.REPORTS_VIEW,
        exports.AdminPermission.REPORTS_EXPORT,
        exports.AdminPermission.PROVIDERS_VIEW,
        exports.AdminPermission.SYSTEM_HEALTH,
    ]),
    [constants_1.UserRole.SUPER_ADMIN]: new Set(Object.values(exports.AdminPermission)),
};
/**
 * Check if a role has a specific permission.
 */
function roleHasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions)
        return false;
    return permissions.has(permission);
}
/**
 * Get all permissions for a given role.
 */
function getPermissionsForRole(role) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions)
        return [];
    return Array.from(permissions);
}
//# sourceMappingURL=admin.permissions.js.map