// ---------------------------------------------------------------------------
// Admin Module — Master Router
// Orchestrates all 14 administrative sub-domains under /api/v1/admin
// ---------------------------------------------------------------------------

import { Router } from 'express';
import { authenticate } from '../../app/middleware';
import { requireAdmin, adminAudit, authorizePermission } from './admin.middleware';
import { AdminPermission } from './admin.permissions';
import { validate } from '../../app/middleware/validation';

// Controllers
import { DashboardController } from './dashboard/dashboard.controller';
import { UserManagementController } from './user-management/user-management.controller';
import { BookingManagementController } from './booking-management/booking-management.controller';
import { PaymentManagementController } from './payment-management/payment-management.controller';
import { RefundManagementController } from './refund-management/refund-management.controller';
import { CityManagementController } from './city-management/city-management.controller';
import { OperatorManagementController } from './operator-management/operator-management.controller';
import { CouponManagementController } from './coupon-management/coupon-management.controller';
import { SupportManagementController } from './support-management/support-management.controller';
import { NotificationManagementController } from './notification-management/notification-management.controller';
import { AuditLogController } from './audit-log/audit-log.controller';
import { SystemConfigController } from './system-config/system-config.controller';
import { ReportController } from './report/report.controller';
import { ProviderManagementController } from './provider-management/provider-management.controller';

// Validation Schemas
import {
  dashboardOverviewQuerySchema,
  revenueQuerySchema,
  bookingAnalyticsQuerySchema,
  userAnalyticsQuerySchema,
} from './dashboard/dashboard.validation';
import {
  listUsersQuerySchema,
  userIdParamsSchema,
  updateUserBodySchema,
  suspendUserBodySchema,
} from './user-management/user-management.validation';
import {
  listBookingsQuerySchema,
  bookingIdParamsSchema,
  updateBookingStatusBodySchema,
  adminCancelBookingBodySchema,
} from './booking-management/booking-management.validation';
import {
  listPaymentsQuerySchema,
  paymentIdParamsSchema,
} from './payment-management/payment-management.validation';
import {
  listRefundsQuerySchema,
  refundIdParamsSchema,
  processRefundBodySchema,
} from './refund-management/refund-management.validation';
import {
  listCitiesQuerySchema,
  cityIdParamsSchema,
  createCityBodySchema,
  updateCityBodySchema,
} from './city-management/city-management.validation';
import {
  listOperatorsQuerySchema,
  operatorIdParamsSchema,
  createOperatorBodySchema,
  updateOperatorBodySchema,
  suspendOperatorBodySchema,
} from './operator-management/operator-management.validation';
import {
  listCouponsQuerySchema,
  couponIdParamsSchema,
  createCouponBodySchema,
  updateCouponBodySchema,
} from './coupon-management/coupon-management.validation';
import {
  listTicketsQuerySchema,
  ticketIdParamsSchema,
  createTicketBodySchema,
  updateTicketBodySchema,
  createTicketReplyBodySchema,
} from './support-management/support-management.validation';
import {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
  broadcastNotificationBodySchema,
} from './notification-management/notification-management.validation';
import {
  listAuditLogsQuerySchema,
  auditLogIdParamsSchema,
  exportAuditLogsQuerySchema,
} from './audit-log/audit-log.validation';
import {
  listConfigQuerySchema,
  configKeyParamsSchema,
  createConfigBodySchema,
  updateConfigBodySchema,
  createFeatureFlagBodySchema,
  toggleFeatureFlagBodySchema,
} from './system-config/system-config.validation';
import { reportQuerySchema } from './report/report.validation';
import {
  listProviderTransactionsQuerySchema,
  providerNameParamsSchema,
  transactionIdParamsSchema,
} from './provider-management/provider-management.validation';

const adminRouter = Router();

// Master security gate: All admin sub-routes require valid JWT & elevated role
adminRouter.use(authenticate, requireAdmin);

// Instantiate controllers
const dashboard = new DashboardController();
const users = new UserManagementController();
const bookings = new BookingManagementController();
const payments = new PaymentManagementController();
const refunds = new RefundManagementController();
const cities = new CityManagementController();
const operators = new OperatorManagementController();
const coupons = new CouponManagementController();
const support = new SupportManagementController();
const notifications = new NotificationManagementController();
const audit = new AuditLogController();
const system = new SystemConfigController();
const reports = new ReportController();
const providers = new ProviderManagementController();

// ---------------------------------------------------------------------------
// 1. Dashboard & Analytics
// ---------------------------------------------------------------------------
const dashboardRouter = Router();
dashboardRouter.get(
  '/overview',
  authorizePermission(AdminPermission.DASHBOARD_VIEW),
  validate({ query: dashboardOverviewQuerySchema }),
  dashboard.getOverview
);
dashboardRouter.get(
  '/revenue',
  authorizePermission(AdminPermission.DASHBOARD_VIEW),
  validate({ query: revenueQuerySchema }),
  dashboard.getRevenueAnalytics
);
dashboardRouter.get(
  '/bookings',
  authorizePermission(AdminPermission.DASHBOARD_VIEW),
  validate({ query: bookingAnalyticsQuerySchema }),
  dashboard.getBookingAnalytics
);
dashboardRouter.get(
  '/users',
  authorizePermission(AdminPermission.DASHBOARD_VIEW),
  validate({ query: userAnalyticsQuerySchema }),
  dashboard.getUserAnalytics
);
dashboardRouter.get(
  '/system',
  authorizePermission(AdminPermission.SYSTEM_HEALTH),
  dashboard.getSystemHealth
);
adminRouter.use('/dashboard', dashboardRouter);

// ---------------------------------------------------------------------------
// 2. User Management
// ---------------------------------------------------------------------------
const usersRouter = Router();
usersRouter.get(
  '/',
  authorizePermission(AdminPermission.USERS_LIST),
  validate({ query: listUsersQuerySchema }),
  users.listUsers
);
usersRouter.get(
  '/:id',
  authorizePermission(AdminPermission.USERS_VIEW),
  validate({ params: userIdParamsSchema }),
  users.getUserDetails
);
usersRouter.patch(
  '/:id',
  authorizePermission(AdminPermission.USERS_UPDATE),
  adminAudit('user-management'),
  validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
  users.updateUser
);
usersRouter.post(
  '/:id/suspend',
  authorizePermission(AdminPermission.USERS_SUSPEND),
  adminAudit('user-management'),
  validate({ params: userIdParamsSchema, body: suspendUserBodySchema }),
  users.suspendUser
);
usersRouter.post(
  '/:id/activate',
  authorizePermission(AdminPermission.USERS_UPDATE),
  adminAudit('user-management'),
  validate({ params: userIdParamsSchema }),
  users.activateUser
);
usersRouter.get(
  '/:id/bookings',
  authorizePermission(AdminPermission.USERS_VIEW),
  validate({ params: userIdParamsSchema }),
  users.getUserBookings
);
usersRouter.get(
  '/:id/payments',
  authorizePermission(AdminPermission.USERS_VIEW),
  validate({ params: userIdParamsSchema }),
  users.getUserPayments
);
usersRouter.get(
  '/:id/wallet',
  authorizePermission(AdminPermission.USERS_VIEW),
  validate({ params: userIdParamsSchema }),
  users.getUserWalletTransactions
);
adminRouter.use('/users', usersRouter);

// ---------------------------------------------------------------------------
// 3. Booking Management
// ---------------------------------------------------------------------------
const bookingsRouter = Router();
bookingsRouter.get(
  '/',
  authorizePermission(AdminPermission.BOOKINGS_LIST),
  validate({ query: listBookingsQuerySchema }),
  bookings.listBookings
);
bookingsRouter.get(
  '/stats',
  authorizePermission(AdminPermission.BOOKINGS_VIEW),
  bookings.getBookingStats
);
bookingsRouter.get(
  '/:id',
  authorizePermission(AdminPermission.BOOKINGS_VIEW),
  validate({ params: bookingIdParamsSchema }),
  bookings.getBookingById
);
bookingsRouter.patch(
  '/:id/status',
  authorizePermission(AdminPermission.BOOKINGS_UPDATE_STATUS),
  adminAudit('booking-management'),
  validate({ params: bookingIdParamsSchema, body: updateBookingStatusBodySchema }),
  bookings.overrideStatus
);
bookingsRouter.post(
  '/:id/cancel',
  authorizePermission(AdminPermission.BOOKINGS_CANCEL),
  adminAudit('booking-management'),
  validate({ params: bookingIdParamsSchema, body: adminCancelBookingBodySchema }),
  bookings.cancelBooking
);
bookingsRouter.post(
  '/:id/reconcile',
  authorizePermission(AdminPermission.BOOKINGS_RECONCILE),
  adminAudit('booking-management'),
  validate({ params: bookingIdParamsSchema }),
  bookings.reconcileBooking
);
adminRouter.use('/bookings', bookingsRouter);

// ---------------------------------------------------------------------------
// 4. Payment Management
// ---------------------------------------------------------------------------
const paymentsRouter = Router();
paymentsRouter.get(
  '/',
  authorizePermission(AdminPermission.PAYMENTS_LIST),
  validate({ query: listPaymentsQuerySchema }),
  payments.listPayments
);
paymentsRouter.get(
  '/stats',
  authorizePermission(AdminPermission.PAYMENTS_VIEW),
  payments.getPaymentStats
);
paymentsRouter.get(
  '/:id',
  authorizePermission(AdminPermission.PAYMENTS_VIEW),
  validate({ params: paymentIdParamsSchema }),
  payments.getPaymentById
);
paymentsRouter.post(
  '/:id/reconcile',
  authorizePermission(AdminPermission.PAYMENTS_RECONCILE),
  adminAudit('payment-management'),
  validate({ params: paymentIdParamsSchema }),
  payments.reconcilePayment
);
adminRouter.use('/payments', paymentsRouter);

// ---------------------------------------------------------------------------
// 5. Refund Management
// ---------------------------------------------------------------------------
const refundsRouter = Router();
refundsRouter.get(
  '/',
  authorizePermission(AdminPermission.REFUNDS_LIST),
  validate({ query: listRefundsQuerySchema }),
  refunds.listRefunds
);
refundsRouter.get(
  '/stats',
  authorizePermission(AdminPermission.REFUNDS_VIEW),
  refunds.getRefundStats
);
refundsRouter.get(
  '/:id',
  authorizePermission(AdminPermission.REFUNDS_VIEW),
  validate({ params: refundIdParamsSchema }),
  refunds.getRefundById
);
refundsRouter.post(
  '/:id/process',
  authorizePermission(AdminPermission.REFUNDS_PROCESS),
  adminAudit('refund-management'),
  validate({ params: refundIdParamsSchema, body: processRefundBodySchema }),
  refunds.processRefund
);
refundsRouter.post(
  '/:id/retry',
  authorizePermission(AdminPermission.REFUNDS_RETRY),
  adminAudit('refund-management'),
  validate({ params: refundIdParamsSchema }),
  refunds.retryRefund
);
adminRouter.use('/refunds', refundsRouter);

// ---------------------------------------------------------------------------
// 6. City Management
// ---------------------------------------------------------------------------
const citiesRouter = Router();
citiesRouter.get(
  '/',
  authorizePermission(AdminPermission.CITIES_LIST),
  validate({ query: listCitiesQuerySchema }),
  cities.listCities
);
citiesRouter.post(
  '/',
  authorizePermission(AdminPermission.CITIES_MANAGE),
  adminAudit('city-management'),
  validate({ body: createCityBodySchema }),
  cities.createCity
);
citiesRouter.get(
  '/:id',
  authorizePermission(AdminPermission.CITIES_LIST),
  validate({ params: cityIdParamsSchema }),
  cities.getCityById
);
citiesRouter.patch(
  '/:id',
  authorizePermission(AdminPermission.CITIES_MANAGE),
  adminAudit('city-management'),
  validate({ params: cityIdParamsSchema, body: updateCityBodySchema }),
  cities.updateCity
);
citiesRouter.delete(
  '/:id',
  authorizePermission(AdminPermission.CITIES_MANAGE),
  adminAudit('city-management'),
  validate({ params: cityIdParamsSchema }),
  cities.deactivateCity
);
citiesRouter.post(
  '/sync',
  authorizePermission(AdminPermission.CITIES_MANAGE),
  adminAudit('city-management'),
  cities.syncCities
);
adminRouter.use('/cities', citiesRouter);

// ---------------------------------------------------------------------------
// 7. Operator Management
// ---------------------------------------------------------------------------
const operatorsRouter = Router();
operatorsRouter.get(
  '/',
  authorizePermission(AdminPermission.OPERATORS_LIST),
  validate({ query: listOperatorsQuerySchema }),
  operators.listOperators
);
operatorsRouter.post(
  '/',
  authorizePermission(AdminPermission.OPERATORS_MANAGE),
  adminAudit('operator-management'),
  validate({ body: createOperatorBodySchema }),
  operators.createOperator
);
operatorsRouter.get(
  '/:id',
  authorizePermission(AdminPermission.OPERATORS_VIEW),
  validate({ params: operatorIdParamsSchema }),
  operators.getOperatorById
);
operatorsRouter.patch(
  '/:id',
  authorizePermission(AdminPermission.OPERATORS_MANAGE),
  adminAudit('operator-management'),
  validate({ params: operatorIdParamsSchema, body: updateOperatorBodySchema }),
  operators.updateOperator
);
operatorsRouter.post(
  '/:id/suspend',
  authorizePermission(AdminPermission.OPERATORS_MANAGE),
  adminAudit('operator-management'),
  validate({ params: operatorIdParamsSchema, body: suspendOperatorBodySchema }),
  operators.suspendOperator
);
operatorsRouter.post(
  '/:id/activate',
  authorizePermission(AdminPermission.OPERATORS_MANAGE),
  adminAudit('operator-management'),
  validate({ params: operatorIdParamsSchema }),
  operators.activateOperator
);
operatorsRouter.get(
  '/:id/bookings',
  authorizePermission(AdminPermission.OPERATORS_VIEW),
  validate({ params: operatorIdParamsSchema }),
  operators.getOperatorBookings
);
adminRouter.use('/operators', operatorsRouter);

// ---------------------------------------------------------------------------
// 8. Coupon Management
// ---------------------------------------------------------------------------
const couponsRouter = Router();
couponsRouter.get(
  '/',
  authorizePermission(AdminPermission.COUPONS_LIST),
  validate({ query: listCouponsQuerySchema }),
  coupons.listCoupons
);
couponsRouter.post(
  '/',
  authorizePermission(AdminPermission.COUPONS_MANAGE),
  adminAudit('coupon-management'),
  validate({ body: createCouponBodySchema }),
  coupons.createCoupon
);
couponsRouter.get(
  '/:id',
  authorizePermission(AdminPermission.COUPONS_VIEW),
  validate({ params: couponIdParamsSchema }),
  coupons.getCouponById
);
couponsRouter.patch(
  '/:id',
  authorizePermission(AdminPermission.COUPONS_MANAGE),
  adminAudit('coupon-management'),
  validate({ params: couponIdParamsSchema, body: updateCouponBodySchema }),
  coupons.updateCoupon
);
couponsRouter.delete(
  '/:id',
  authorizePermission(AdminPermission.COUPONS_MANAGE),
  adminAudit('coupon-management'),
  validate({ params: couponIdParamsSchema }),
  coupons.deactivateCoupon
);
couponsRouter.get(
  '/:id/usage',
  authorizePermission(AdminPermission.COUPONS_VIEW),
  validate({ params: couponIdParamsSchema }),
  coupons.getCouponUsage
);
adminRouter.use('/coupons', couponsRouter);

// ---------------------------------------------------------------------------
// 9. Support Management
// ---------------------------------------------------------------------------
const supportRouter = Router();
supportRouter.get(
  '/tickets',
  authorizePermission(AdminPermission.SUPPORT_VIEW),
  validate({ query: listTicketsQuerySchema }),
  support.listTickets
);
supportRouter.post(
  '/tickets',
  authorizePermission(AdminPermission.SUPPORT_MANAGE),
  adminAudit('support-management'),
  validate({ body: createTicketBodySchema }),
  support.createTicket
);
supportRouter.get(
  '/tickets/:id',
  authorizePermission(AdminPermission.SUPPORT_VIEW),
  validate({ params: ticketIdParamsSchema }),
  support.getTicketById
);
supportRouter.patch(
  '/tickets/:id',
  authorizePermission(AdminPermission.SUPPORT_MANAGE),
  adminAudit('support-management'),
  validate({ params: ticketIdParamsSchema, body: updateTicketBodySchema }),
  support.updateTicket
);
supportRouter.post(
  '/tickets/:id/reply',
  authorizePermission(AdminPermission.SUPPORT_MANAGE),
  adminAudit('support-management'),
  validate({ params: ticketIdParamsSchema, body: createTicketReplyBodySchema }),
  support.replyToTicket
);
adminRouter.use('/support', supportRouter);

// ---------------------------------------------------------------------------
// 10. Notification Management
// ---------------------------------------------------------------------------
const notificationsRouter = Router();
notificationsRouter.get(
  '/',
  authorizePermission(AdminPermission.NOTIFICATIONS_VIEW),
  validate({ query: listNotificationsQuerySchema }),
  notifications.listNotifications
);
notificationsRouter.get(
  '/templates',
  authorizePermission(AdminPermission.NOTIFICATIONS_VIEW),
  notifications.getTemplates
);
notificationsRouter.get(
  '/:id',
  authorizePermission(AdminPermission.NOTIFICATIONS_VIEW),
  validate({ params: notificationIdParamsSchema }),
  notifications.getNotificationById
);
notificationsRouter.post(
  '/broadcast',
  authorizePermission(AdminPermission.NOTIFICATIONS_BROADCAST),
  adminAudit('notification-management'),
  validate({ body: broadcastNotificationBodySchema }),
  notifications.broadcastNotification
);
notificationsRouter.post(
  '/:id/retry',
  authorizePermission(AdminPermission.NOTIFICATIONS_MANAGE),
  adminAudit('notification-management'),
  validate({ params: notificationIdParamsSchema }),
  notifications.retryNotification
);
adminRouter.use('/notifications', notificationsRouter);

// ---------------------------------------------------------------------------
// 11. Audit Logs
// ---------------------------------------------------------------------------
const auditRouter = Router();
auditRouter.get(
  '/',
  authorizePermission(AdminPermission.AUDIT_VIEW),
  validate({ query: listAuditLogsQuerySchema }),
  audit.listAuditLogs
);
auditRouter.get(
  '/export',
  authorizePermission(AdminPermission.AUDIT_EXPORT),
  validate({ query: exportAuditLogsQuerySchema }),
  audit.exportAuditLogs
);
auditRouter.get(
  '/:id',
  authorizePermission(AdminPermission.AUDIT_VIEW),
  validate({ params: auditLogIdParamsSchema }),
  audit.getAuditLogById
);
adminRouter.use('/audit-logs', auditRouter);

// ---------------------------------------------------------------------------
// 12. System Configuration & Feature Flags
// ---------------------------------------------------------------------------
const systemRouter = Router();
systemRouter.get(
  '/config',
  authorizePermission(AdminPermission.SYSTEM_CONFIG),
  validate({ query: listConfigQuerySchema }),
  system.getConfigs
);
systemRouter.post(
  '/config',
  authorizePermission(AdminPermission.SYSTEM_CONFIG),
  adminAudit('system-config'),
  validate({ body: createConfigBodySchema }),
  system.createConfig
);
systemRouter.get(
  '/config/:key',
  authorizePermission(AdminPermission.SYSTEM_CONFIG),
  validate({ params: configKeyParamsSchema }),
  system.getConfigByKey
);
systemRouter.patch(
  '/config/:key',
  authorizePermission(AdminPermission.SYSTEM_CONFIG),
  adminAudit('system-config'),
  validate({ params: configKeyParamsSchema, body: updateConfigBodySchema }),
  system.updateConfig
);
systemRouter.delete(
  '/config/:key',
  authorizePermission(AdminPermission.SYSTEM_CONFIG),
  adminAudit('system-config'),
  validate({ params: configKeyParamsSchema }),
  system.deleteConfig
);
systemRouter.get(
  '/feature-flags',
  authorizePermission(AdminPermission.SYSTEM_FEATURE_FLAGS),
  system.getFeatureFlags
);
systemRouter.post(
  '/feature-flags',
  authorizePermission(AdminPermission.SYSTEM_FEATURE_FLAGS),
  adminAudit('system-config'),
  validate({ body: createFeatureFlagBodySchema }),
  system.createFeatureFlag
);
systemRouter.patch(
  '/feature-flags/:key',
  authorizePermission(AdminPermission.SYSTEM_FEATURE_FLAGS),
  adminAudit('system-config'),
  validate({ params: configKeyParamsSchema, body: toggleFeatureFlagBodySchema }),
  system.toggleFeatureFlag
);
systemRouter.get(
  '/health',
  authorizePermission(AdminPermission.SYSTEM_HEALTH),
  system.getDetailedSystemHealth
);
adminRouter.use('/system', systemRouter);

// ---------------------------------------------------------------------------
// 13. Analytical Reports & CSV Exports
// ---------------------------------------------------------------------------
const reportsRouter = Router();
reportsRouter.get(
  '/revenue',
  authorizePermission(AdminPermission.REPORTS_VIEW),
  validate({ query: reportQuerySchema }),
  reports.getRevenueReport
);
reportsRouter.get(
  '/bookings',
  authorizePermission(AdminPermission.REPORTS_VIEW),
  validate({ query: reportQuerySchema }),
  reports.getBookingReport
);
reportsRouter.get(
  '/users',
  authorizePermission(AdminPermission.REPORTS_VIEW),
  validate({ query: reportQuerySchema }),
  reports.getUserReport
);
reportsRouter.get(
  '/cancellations',
  authorizePermission(AdminPermission.REPORTS_VIEW),
  validate({ query: reportQuerySchema }),
  reports.getCancellationReport
);
reportsRouter.get(
  '/payments',
  authorizePermission(AdminPermission.REPORTS_VIEW),
  validate({ query: reportQuerySchema }),
  reports.getPaymentReport
);
adminRouter.use('/reports', reportsRouter);

// ---------------------------------------------------------------------------
// 14. Provider Management
// ---------------------------------------------------------------------------
const providersRouter = Router();
providersRouter.get(
  '/',
  authorizePermission(AdminPermission.PROVIDERS_VIEW),
  providers.getProviders
);
providersRouter.get(
  '/:name/health',
  authorizePermission(AdminPermission.PROVIDERS_VIEW),
  validate({ params: providerNameParamsSchema }),
  providers.getProviderHealth
);
providersRouter.get(
  '/:name/balance',
  authorizePermission(AdminPermission.PROVIDERS_VIEW),
  validate({ params: providerNameParamsSchema }),
  providers.getProviderBalance
);
providersRouter.get(
  '/transactions',
  authorizePermission(AdminPermission.PROVIDERS_VIEW),
  validate({ query: listProviderTransactionsQuerySchema }),
  providers.listTransactions
);
providersRouter.get(
  '/transactions/:id',
  authorizePermission(AdminPermission.PROVIDERS_VIEW),
  validate({ params: transactionIdParamsSchema }),
  providers.getTransactionById
);
adminRouter.use('/providers', providersRouter);

export default adminRouter;
