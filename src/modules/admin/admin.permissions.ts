// ---------------------------------------------------------------------------
// Admin Module — Permission-Based Access Control
// Granular permissions layered on top of role-based authorization.
// ---------------------------------------------------------------------------

import { UserRoleType, UserRole } from '../../shared/constants';

/**
 * All granular admin permissions — used with `authorizePermission()` middleware.
 */
export const AdminPermission = {
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
} as const;

export type AdminPermissionType = typeof AdminPermission[keyof typeof AdminPermission];

/**
 * Default permission mapping per role.
 * SUPPORT_AGENT gets read-only + support management.
 * ADMIN gets full management except system config.
 * SUPER_ADMIN gets everything.
 */
const ROLE_PERMISSIONS: Record<string, Set<AdminPermissionType>> = {
  [UserRole.SUPPORT]: new Set<AdminPermissionType>([
    AdminPermission.DASHBOARD_VIEW,
    AdminPermission.USERS_LIST,
    AdminPermission.USERS_VIEW,
    AdminPermission.BOOKINGS_LIST,
    AdminPermission.BOOKINGS_VIEW,
    AdminPermission.PAYMENTS_LIST,
    AdminPermission.PAYMENTS_VIEW,
    AdminPermission.REFUNDS_LIST,
    AdminPermission.REFUNDS_VIEW,
    AdminPermission.CITIES_LIST,
    AdminPermission.OPERATORS_LIST,
    AdminPermission.OPERATORS_VIEW,
    AdminPermission.COUPONS_LIST,
    AdminPermission.COUPONS_VIEW,
    AdminPermission.SUPPORT_VIEW,
    AdminPermission.SUPPORT_MANAGE,
    AdminPermission.NOTIFICATIONS_VIEW,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.REPORTS_VIEW,
    AdminPermission.PROVIDERS_VIEW,
    AdminPermission.SYSTEM_HEALTH,
  ]),
  [UserRole.SUPPORT_AGENT]: new Set<AdminPermissionType>([
    AdminPermission.DASHBOARD_VIEW,
    AdminPermission.USERS_LIST,
    AdminPermission.USERS_VIEW,
    AdminPermission.BOOKINGS_LIST,
    AdminPermission.BOOKINGS_VIEW,
    AdminPermission.PAYMENTS_LIST,
    AdminPermission.PAYMENTS_VIEW,
    AdminPermission.REFUNDS_LIST,
    AdminPermission.REFUNDS_VIEW,
    AdminPermission.CITIES_LIST,
    AdminPermission.OPERATORS_LIST,
    AdminPermission.OPERATORS_VIEW,
    AdminPermission.COUPONS_LIST,
    AdminPermission.COUPONS_VIEW,
    AdminPermission.SUPPORT_VIEW,
    AdminPermission.SUPPORT_MANAGE,
    AdminPermission.NOTIFICATIONS_VIEW,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.REPORTS_VIEW,
    AdminPermission.PROVIDERS_VIEW,
    AdminPermission.SYSTEM_HEALTH,
  ]),
  [UserRole.ADMIN]: new Set<AdminPermissionType>([
    // All support permissions
    AdminPermission.DASHBOARD_VIEW,
    AdminPermission.USERS_LIST,
    AdminPermission.USERS_VIEW,
    AdminPermission.USERS_UPDATE,
    AdminPermission.USERS_SUSPEND,
    AdminPermission.BOOKINGS_LIST,
    AdminPermission.BOOKINGS_VIEW,
    AdminPermission.BOOKINGS_UPDATE_STATUS,
    AdminPermission.BOOKINGS_CANCEL,
    AdminPermission.BOOKINGS_RECONCILE,
    AdminPermission.PAYMENTS_LIST,
    AdminPermission.PAYMENTS_VIEW,
    AdminPermission.PAYMENTS_RECONCILE,
    AdminPermission.REFUNDS_LIST,
    AdminPermission.REFUNDS_VIEW,
    AdminPermission.REFUNDS_PROCESS,
    AdminPermission.REFUNDS_RETRY,
    AdminPermission.CITIES_LIST,
    AdminPermission.CITIES_MANAGE,
    AdminPermission.OPERATORS_LIST,
    AdminPermission.OPERATORS_VIEW,
    AdminPermission.OPERATORS_MANAGE,
    AdminPermission.COUPONS_LIST,
    AdminPermission.COUPONS_VIEW,
    AdminPermission.COUPONS_MANAGE,
    AdminPermission.SUPPORT_VIEW,
    AdminPermission.SUPPORT_MANAGE,
    AdminPermission.NOTIFICATIONS_VIEW,
    AdminPermission.NOTIFICATIONS_MANAGE,
    AdminPermission.NOTIFICATIONS_BROADCAST,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.AUDIT_EXPORT,
    AdminPermission.REPORTS_VIEW,
    AdminPermission.REPORTS_EXPORT,
    AdminPermission.PROVIDERS_VIEW,
    AdminPermission.SYSTEM_HEALTH,
  ]),
  [UserRole.SUPER_ADMIN]: new Set<AdminPermissionType>(
    Object.values(AdminPermission)
  ),
};

/**
 * Check if a role has a specific permission.
 */
export function roleHasPermission(
  role: UserRoleType,
  permission: AdminPermissionType
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.has(permission);
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: UserRoleType): AdminPermissionType[] {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return [];
  return Array.from(permissions);
}
