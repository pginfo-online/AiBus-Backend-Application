"use strict";
// ---------------------------------------------------------------------------
// Admin Module — Master Router
// Orchestrates all 14 administrative sub-domains under /api/v1/admin
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../../app/middleware");
const admin_middleware_1 = require("./admin.middleware");
const admin_permissions_1 = require("./admin.permissions");
const validation_1 = require("../../app/middleware/validation");
// Controllers
const dashboard_controller_1 = require("./dashboard/dashboard.controller");
const user_management_controller_1 = require("./user-management/user-management.controller");
const booking_management_controller_1 = require("./booking-management/booking-management.controller");
const payment_management_controller_1 = require("./payment-management/payment-management.controller");
const refund_management_controller_1 = require("./refund-management/refund-management.controller");
const city_management_controller_1 = require("./city-management/city-management.controller");
const operator_management_controller_1 = require("./operator-management/operator-management.controller");
const coupon_management_controller_1 = require("./coupon-management/coupon-management.controller");
const support_management_controller_1 = require("./support-management/support-management.controller");
const notification_management_controller_1 = require("./notification-management/notification-management.controller");
const audit_log_controller_1 = require("./audit-log/audit-log.controller");
const system_config_controller_1 = require("./system-config/system-config.controller");
const report_controller_1 = require("./report/report.controller");
const provider_management_controller_1 = require("./provider-management/provider-management.controller");
const agent_management_controller_1 = require("./agent-management/agent-management.controller");
const commission_management_controller_1 = require("./commission-management/commission-management.controller");
const ledger_management_controller_1 = require("./ledger-management/ledger-management.controller");
const payment_gateways_controller_1 = require("./payment-gateways/payment-gateways.controller");
// B2B Validation Schemas
const agent_management_validation_1 = require("./agent-management/agent-management.validation");
const commission_management_validation_1 = require("./commission-management/commission-management.validation");
const ledger_management_validation_1 = require("./ledger-management/ledger-management.validation");
// Validation Schemas
const dashboard_validation_1 = require("./dashboard/dashboard.validation");
const user_management_validation_1 = require("./user-management/user-management.validation");
const booking_management_validation_1 = require("./booking-management/booking-management.validation");
const payment_management_validation_1 = require("./payment-management/payment-management.validation");
const refund_management_validation_1 = require("./refund-management/refund-management.validation");
const city_management_validation_1 = require("./city-management/city-management.validation");
const operator_management_validation_1 = require("./operator-management/operator-management.validation");
const coupon_management_validation_1 = require("./coupon-management/coupon-management.validation");
const support_management_validation_1 = require("./support-management/support-management.validation");
const notification_management_validation_1 = require("./notification-management/notification-management.validation");
const audit_log_validation_1 = require("./audit-log/audit-log.validation");
const system_config_validation_1 = require("./system-config/system-config.validation");
const report_validation_1 = require("./report/report.validation");
const provider_management_validation_1 = require("./provider-management/provider-management.validation");
const adminRouter = (0, express_1.Router)();
// Master security gate: All admin sub-routes require valid JWT & elevated role
adminRouter.use(middleware_1.authenticate, admin_middleware_1.requireAdmin);
// Instantiate controllers
const dashboard = new dashboard_controller_1.DashboardController();
const users = new user_management_controller_1.UserManagementController();
const bookings = new booking_management_controller_1.BookingManagementController();
const payments = new payment_management_controller_1.PaymentManagementController();
const refunds = new refund_management_controller_1.RefundManagementController();
const cities = new city_management_controller_1.CityManagementController();
const operators = new operator_management_controller_1.OperatorManagementController();
const coupons = new coupon_management_controller_1.CouponManagementController();
const support = new support_management_controller_1.SupportManagementController();
const notifications = new notification_management_controller_1.NotificationManagementController();
const audit = new audit_log_controller_1.AuditLogController();
const system = new system_config_controller_1.SystemConfigController();
const reports = new report_controller_1.ReportController();
const providers = new provider_management_controller_1.ProviderManagementController();
// ---------------------------------------------------------------------------
// 1. Dashboard & Analytics
// ---------------------------------------------------------------------------
const dashboardRouter = (0, express_1.Router)();
dashboardRouter.get('/overview', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.DASHBOARD_VIEW), (0, validation_1.validate)({ query: dashboard_validation_1.dashboardOverviewQuerySchema }), dashboard.getOverview);
dashboardRouter.get('/revenue', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.DASHBOARD_VIEW), (0, validation_1.validate)({ query: dashboard_validation_1.revenueQuerySchema }), dashboard.getRevenueAnalytics);
dashboardRouter.get('/bookings', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.DASHBOARD_VIEW), (0, validation_1.validate)({ query: dashboard_validation_1.bookingAnalyticsQuerySchema }), dashboard.getBookingAnalytics);
dashboardRouter.get('/users', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.DASHBOARD_VIEW), (0, validation_1.validate)({ query: dashboard_validation_1.userAnalyticsQuerySchema }), dashboard.getUserAnalytics);
dashboardRouter.get('/system', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_HEALTH), dashboard.getSystemHealth);
adminRouter.use('/dashboard', dashboardRouter);
// ---------------------------------------------------------------------------
// 2. User Management
// ---------------------------------------------------------------------------
const usersRouter = (0, express_1.Router)();
usersRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.USERS_LIST), (0, validation_1.validate)({ query: user_management_validation_1.listUsersQuerySchema }), users.listUsers);
usersRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.USERS_VIEW), (0, validation_1.validate)({ params: user_management_validation_1.userIdParamsSchema }), users.getUserDetails);
usersRouter.patch('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.USERS_UPDATE), (0, admin_middleware_1.adminAudit)('user-management'), (0, validation_1.validate)({ params: user_management_validation_1.userIdParamsSchema, body: user_management_validation_1.updateUserBodySchema }), users.updateUser);
usersRouter.post('/:id/suspend', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.USERS_SUSPEND), (0, admin_middleware_1.adminAudit)('user-management'), (0, validation_1.validate)({ params: user_management_validation_1.userIdParamsSchema, body: user_management_validation_1.suspendUserBodySchema }), users.suspendUser);
usersRouter.post('/:id/activate', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.USERS_UPDATE), (0, admin_middleware_1.adminAudit)('user-management'), (0, validation_1.validate)({ params: user_management_validation_1.userIdParamsSchema }), users.activateUser);
usersRouter.get('/:id/bookings', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.USERS_VIEW), (0, validation_1.validate)({ params: user_management_validation_1.userIdParamsSchema }), users.getUserBookings);
usersRouter.get('/:id/payments', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.USERS_VIEW), (0, validation_1.validate)({ params: user_management_validation_1.userIdParamsSchema }), users.getUserPayments);
usersRouter.get('/:id/wallet', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.USERS_VIEW), (0, validation_1.validate)({ params: user_management_validation_1.userIdParamsSchema }), users.getUserWalletTransactions);
adminRouter.use('/users', usersRouter);
// ---------------------------------------------------------------------------
// 3. Booking Management
// ---------------------------------------------------------------------------
const bookingsRouter = (0, express_1.Router)();
bookingsRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.BOOKINGS_LIST), (0, validation_1.validate)({ query: booking_management_validation_1.listBookingsQuerySchema }), bookings.listBookings);
bookingsRouter.get('/stats', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.BOOKINGS_VIEW), bookings.getBookingStats);
bookingsRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.BOOKINGS_VIEW), (0, validation_1.validate)({ params: booking_management_validation_1.bookingIdParamsSchema }), bookings.getBookingById);
bookingsRouter.patch('/:id/status', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.BOOKINGS_UPDATE_STATUS), (0, admin_middleware_1.adminAudit)('booking-management'), (0, validation_1.validate)({ params: booking_management_validation_1.bookingIdParamsSchema, body: booking_management_validation_1.updateBookingStatusBodySchema }), bookings.overrideStatus);
bookingsRouter.post('/:id/cancel', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.BOOKINGS_CANCEL), (0, admin_middleware_1.adminAudit)('booking-management'), (0, validation_1.validate)({ params: booking_management_validation_1.bookingIdParamsSchema, body: booking_management_validation_1.adminCancelBookingBodySchema }), bookings.cancelBooking);
bookingsRouter.post('/:id/reconcile', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.BOOKINGS_RECONCILE), (0, admin_middleware_1.adminAudit)('booking-management'), (0, validation_1.validate)({ params: booking_management_validation_1.bookingIdParamsSchema }), bookings.reconcileBooking);
adminRouter.use('/bookings', bookingsRouter);
// ---------------------------------------------------------------------------
// 4. Payment Management
// ---------------------------------------------------------------------------
const paymentsRouter = (0, express_1.Router)();
paymentsRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PAYMENTS_LIST), (0, validation_1.validate)({ query: payment_management_validation_1.listPaymentsQuerySchema }), payments.listPayments);
paymentsRouter.get('/stats', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PAYMENTS_VIEW), payments.getPaymentStats);
paymentsRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PAYMENTS_VIEW), (0, validation_1.validate)({ params: payment_management_validation_1.paymentIdParamsSchema }), payments.getPaymentById);
paymentsRouter.post('/:id/reconcile', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PAYMENTS_RECONCILE), (0, admin_middleware_1.adminAudit)('payment-management'), (0, validation_1.validate)({ params: payment_management_validation_1.paymentIdParamsSchema }), payments.reconcilePayment);
adminRouter.use('/payments', paymentsRouter);
// ---------------------------------------------------------------------------
// 4b. Payment Gateway Management & Dynamic Multi-PG Orchestration
// ---------------------------------------------------------------------------
const paymentGateways = new payment_gateways_controller_1.PaymentGatewayAdminController();
const paymentGatewaysRouter = (0, express_1.Router)();
paymentGatewaysRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PAYMENT_GATEWAYS_MANAGE), paymentGateways.listGateways);
paymentGatewaysRouter.get('/metrics', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PAYMENT_GATEWAYS_MANAGE), paymentGateways.getGatewayMetrics);
paymentGatewaysRouter.patch('/:gateway', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PAYMENT_GATEWAYS_MANAGE), (0, admin_middleware_1.adminAudit)('payment-gateways'), paymentGateways.updateGateway);
paymentGatewaysRouter.post('/:gateway/toggle', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PAYMENT_GATEWAYS_MANAGE), (0, admin_middleware_1.adminAudit)('payment-gateways'), paymentGateways.toggleGateway);
adminRouter.use('/payment-gateways', paymentGatewaysRouter);
// ---------------------------------------------------------------------------
// 5. Refund Management
// ---------------------------------------------------------------------------
const refundsRouter = (0, express_1.Router)();
refundsRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REFUNDS_LIST), (0, validation_1.validate)({ query: refund_management_validation_1.listRefundsQuerySchema }), refunds.listRefunds);
refundsRouter.get('/stats', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REFUNDS_VIEW), refunds.getRefundStats);
refundsRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REFUNDS_VIEW), (0, validation_1.validate)({ params: refund_management_validation_1.refundIdParamsSchema }), refunds.getRefundById);
refundsRouter.post('/:id/process', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REFUNDS_PROCESS), (0, admin_middleware_1.adminAudit)('refund-management'), (0, validation_1.validate)({ params: refund_management_validation_1.refundIdParamsSchema, body: refund_management_validation_1.processRefundBodySchema }), refunds.processRefund);
refundsRouter.post('/:id/retry', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REFUNDS_RETRY), (0, admin_middleware_1.adminAudit)('refund-management'), (0, validation_1.validate)({ params: refund_management_validation_1.refundIdParamsSchema }), refunds.retryRefund);
adminRouter.use('/refunds', refundsRouter);
// ---------------------------------------------------------------------------
// 6. City Management
// ---------------------------------------------------------------------------
const citiesRouter = (0, express_1.Router)();
citiesRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.CITIES_LIST), (0, validation_1.validate)({ query: city_management_validation_1.listCitiesQuerySchema }), cities.listCities);
citiesRouter.post('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.CITIES_MANAGE), (0, admin_middleware_1.adminAudit)('city-management'), (0, validation_1.validate)({ body: city_management_validation_1.createCityBodySchema }), cities.createCity);
citiesRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.CITIES_LIST), (0, validation_1.validate)({ params: city_management_validation_1.cityIdParamsSchema }), cities.getCityById);
citiesRouter.patch('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.CITIES_MANAGE), (0, admin_middleware_1.adminAudit)('city-management'), (0, validation_1.validate)({ params: city_management_validation_1.cityIdParamsSchema, body: city_management_validation_1.updateCityBodySchema }), cities.updateCity);
citiesRouter.delete('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.CITIES_MANAGE), (0, admin_middleware_1.adminAudit)('city-management'), (0, validation_1.validate)({ params: city_management_validation_1.cityIdParamsSchema }), cities.deactivateCity);
citiesRouter.post('/sync', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.CITIES_MANAGE), (0, admin_middleware_1.adminAudit)('city-management'), cities.syncCities);
adminRouter.use('/cities', citiesRouter);
// ---------------------------------------------------------------------------
// 7. Operator Management
// ---------------------------------------------------------------------------
const operatorsRouter = (0, express_1.Router)();
operatorsRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.OPERATORS_LIST), (0, validation_1.validate)({ query: operator_management_validation_1.listOperatorsQuerySchema }), operators.listOperators);
operatorsRouter.post('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.OPERATORS_MANAGE), (0, admin_middleware_1.adminAudit)('operator-management'), (0, validation_1.validate)({ body: operator_management_validation_1.createOperatorBodySchema }), operators.createOperator);
operatorsRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.OPERATORS_VIEW), (0, validation_1.validate)({ params: operator_management_validation_1.operatorIdParamsSchema }), operators.getOperatorById);
operatorsRouter.patch('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.OPERATORS_MANAGE), (0, admin_middleware_1.adminAudit)('operator-management'), (0, validation_1.validate)({ params: operator_management_validation_1.operatorIdParamsSchema, body: operator_management_validation_1.updateOperatorBodySchema }), operators.updateOperator);
operatorsRouter.post('/:id/suspend', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.OPERATORS_MANAGE), (0, admin_middleware_1.adminAudit)('operator-management'), (0, validation_1.validate)({ params: operator_management_validation_1.operatorIdParamsSchema, body: operator_management_validation_1.suspendOperatorBodySchema }), operators.suspendOperator);
operatorsRouter.post('/:id/activate', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.OPERATORS_MANAGE), (0, admin_middleware_1.adminAudit)('operator-management'), (0, validation_1.validate)({ params: operator_management_validation_1.operatorIdParamsSchema }), operators.activateOperator);
operatorsRouter.get('/:id/bookings', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.OPERATORS_VIEW), (0, validation_1.validate)({ params: operator_management_validation_1.operatorIdParamsSchema }), operators.getOperatorBookings);
adminRouter.use('/operators', operatorsRouter);
// ---------------------------------------------------------------------------
// 8. Coupon Management
// ---------------------------------------------------------------------------
const couponsRouter = (0, express_1.Router)();
couponsRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COUPONS_LIST), (0, validation_1.validate)({ query: coupon_management_validation_1.listCouponsQuerySchema }), coupons.listCoupons);
couponsRouter.post('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COUPONS_MANAGE), (0, admin_middleware_1.adminAudit)('coupon-management'), (0, validation_1.validate)({ body: coupon_management_validation_1.createCouponBodySchema }), coupons.createCoupon);
couponsRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COUPONS_VIEW), (0, validation_1.validate)({ params: coupon_management_validation_1.couponIdParamsSchema }), coupons.getCouponById);
couponsRouter.patch('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COUPONS_MANAGE), (0, admin_middleware_1.adminAudit)('coupon-management'), (0, validation_1.validate)({ params: coupon_management_validation_1.couponIdParamsSchema, body: coupon_management_validation_1.updateCouponBodySchema }), coupons.updateCoupon);
couponsRouter.delete('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COUPONS_MANAGE), (0, admin_middleware_1.adminAudit)('coupon-management'), (0, validation_1.validate)({ params: coupon_management_validation_1.couponIdParamsSchema }), coupons.deactivateCoupon);
couponsRouter.get('/:id/usage', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COUPONS_VIEW), (0, validation_1.validate)({ params: coupon_management_validation_1.couponIdParamsSchema }), coupons.getCouponUsage);
adminRouter.use('/coupons', couponsRouter);
// ---------------------------------------------------------------------------
// 9. Support Management
// ---------------------------------------------------------------------------
const supportRouter = (0, express_1.Router)();
supportRouter.get('/tickets', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SUPPORT_VIEW), (0, validation_1.validate)({ query: support_management_validation_1.listTicketsQuerySchema }), support.listTickets);
supportRouter.post('/tickets', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SUPPORT_MANAGE), (0, admin_middleware_1.adminAudit)('support-management'), (0, validation_1.validate)({ body: support_management_validation_1.createTicketBodySchema }), support.createTicket);
supportRouter.get('/tickets/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SUPPORT_VIEW), (0, validation_1.validate)({ params: support_management_validation_1.ticketIdParamsSchema }), support.getTicketById);
supportRouter.patch('/tickets/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SUPPORT_MANAGE), (0, admin_middleware_1.adminAudit)('support-management'), (0, validation_1.validate)({ params: support_management_validation_1.ticketIdParamsSchema, body: support_management_validation_1.updateTicketBodySchema }), support.updateTicket);
supportRouter.post('/tickets/:id/reply', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SUPPORT_MANAGE), (0, admin_middleware_1.adminAudit)('support-management'), (0, validation_1.validate)({ params: support_management_validation_1.ticketIdParamsSchema, body: support_management_validation_1.createTicketReplyBodySchema }), support.replyToTicket);
adminRouter.use('/support', supportRouter);
// ---------------------------------------------------------------------------
// 10. Notification Management
// ---------------------------------------------------------------------------
const notificationsRouter = (0, express_1.Router)();
notificationsRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.NOTIFICATIONS_VIEW), (0, validation_1.validate)({ query: notification_management_validation_1.listNotificationsQuerySchema }), notifications.listNotifications);
notificationsRouter.get('/templates', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.NOTIFICATIONS_VIEW), notifications.getTemplates);
notificationsRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.NOTIFICATIONS_VIEW), (0, validation_1.validate)({ params: notification_management_validation_1.notificationIdParamsSchema }), notifications.getNotificationById);
notificationsRouter.post('/broadcast', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.NOTIFICATIONS_BROADCAST), (0, admin_middleware_1.adminAudit)('notification-management'), (0, validation_1.validate)({ body: notification_management_validation_1.broadcastNotificationBodySchema }), notifications.broadcastNotification);
notificationsRouter.post('/:id/retry', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.NOTIFICATIONS_MANAGE), (0, admin_middleware_1.adminAudit)('notification-management'), (0, validation_1.validate)({ params: notification_management_validation_1.notificationIdParamsSchema }), notifications.retryNotification);
adminRouter.use('/notifications', notificationsRouter);
// ---------------------------------------------------------------------------
// 11. Audit Logs
// ---------------------------------------------------------------------------
const auditRouter = (0, express_1.Router)();
auditRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AUDIT_VIEW), (0, validation_1.validate)({ query: audit_log_validation_1.listAuditLogsQuerySchema }), audit.listAuditLogs);
auditRouter.get('/export', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AUDIT_EXPORT), (0, validation_1.validate)({ query: audit_log_validation_1.exportAuditLogsQuerySchema }), audit.exportAuditLogs);
auditRouter.get('/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AUDIT_VIEW), (0, validation_1.validate)({ params: audit_log_validation_1.auditLogIdParamsSchema }), audit.getAuditLogById);
adminRouter.use('/audit-logs', auditRouter);
// ---------------------------------------------------------------------------
// 12. System Configuration & Feature Flags
// ---------------------------------------------------------------------------
const systemRouter = (0, express_1.Router)();
systemRouter.get('/config', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_CONFIG), (0, validation_1.validate)({ query: system_config_validation_1.listConfigQuerySchema }), system.getConfigs);
systemRouter.post('/config', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_CONFIG), (0, admin_middleware_1.adminAudit)('system-config'), (0, validation_1.validate)({ body: system_config_validation_1.createConfigBodySchema }), system.createConfig);
systemRouter.get('/config/:key', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_CONFIG), (0, validation_1.validate)({ params: system_config_validation_1.configKeyParamsSchema }), system.getConfigByKey);
systemRouter.patch('/config/:key', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_CONFIG), (0, admin_middleware_1.adminAudit)('system-config'), (0, validation_1.validate)({ params: system_config_validation_1.configKeyParamsSchema, body: system_config_validation_1.updateConfigBodySchema }), system.updateConfig);
systemRouter.delete('/config/:key', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_CONFIG), (0, admin_middleware_1.adminAudit)('system-config'), (0, validation_1.validate)({ params: system_config_validation_1.configKeyParamsSchema }), system.deleteConfig);
systemRouter.get('/feature-flags', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_FEATURE_FLAGS), system.getFeatureFlags);
systemRouter.post('/feature-flags', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_FEATURE_FLAGS), (0, admin_middleware_1.adminAudit)('system-config'), (0, validation_1.validate)({ body: system_config_validation_1.createFeatureFlagBodySchema }), system.createFeatureFlag);
systemRouter.patch('/feature-flags/:key', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_FEATURE_FLAGS), (0, admin_middleware_1.adminAudit)('system-config'), (0, validation_1.validate)({ params: system_config_validation_1.configKeyParamsSchema, body: system_config_validation_1.toggleFeatureFlagBodySchema }), system.toggleFeatureFlag);
systemRouter.get('/health', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.SYSTEM_HEALTH), system.getDetailedSystemHealth);
adminRouter.use('/system', systemRouter);
// ---------------------------------------------------------------------------
// 13. Analytical Reports & CSV Exports
// ---------------------------------------------------------------------------
const reportsRouter = (0, express_1.Router)();
reportsRouter.get('/revenue', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REPORTS_VIEW), (0, validation_1.validate)({ query: report_validation_1.reportQuerySchema }), reports.getRevenueReport);
reportsRouter.get('/bookings', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REPORTS_VIEW), (0, validation_1.validate)({ query: report_validation_1.reportQuerySchema }), reports.getBookingReport);
reportsRouter.get('/users', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REPORTS_VIEW), (0, validation_1.validate)({ query: report_validation_1.reportQuerySchema }), reports.getUserReport);
reportsRouter.get('/cancellations', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REPORTS_VIEW), (0, validation_1.validate)({ query: report_validation_1.reportQuerySchema }), reports.getCancellationReport);
reportsRouter.get('/payments', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.REPORTS_VIEW), (0, validation_1.validate)({ query: report_validation_1.reportQuerySchema }), reports.getPaymentReport);
adminRouter.use('/reports', reportsRouter);
// ---------------------------------------------------------------------------
// 14. Provider Management
// ---------------------------------------------------------------------------
const providersRouter = (0, express_1.Router)();
providersRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PROVIDERS_VIEW), providers.getProviders);
providersRouter.get('/:name/health', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PROVIDERS_VIEW), (0, validation_1.validate)({ params: provider_management_validation_1.providerNameParamsSchema }), providers.getProviderHealth);
providersRouter.get('/:name/balance', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PROVIDERS_VIEW), (0, validation_1.validate)({ params: provider_management_validation_1.providerNameParamsSchema }), providers.getProviderBalance);
providersRouter.get('/transactions', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PROVIDERS_VIEW), (0, validation_1.validate)({ query: provider_management_validation_1.listProviderTransactionsQuerySchema }), providers.listTransactions);
providersRouter.get('/transactions/:id', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.PROVIDERS_VIEW), (0, validation_1.validate)({ params: provider_management_validation_1.transactionIdParamsSchema }), providers.getTransactionById);
adminRouter.use('/providers', providersRouter);
// ---------------------------------------------------------------------------
// 15. B2B Agent Management Router (/api/v1/admin/agents)
// ---------------------------------------------------------------------------
const agentsAdminRouter = (0, express_1.Router)();
const agentAdmin = agent_management_controller_1.AgentManagementController.getInstance();
agentsAdminRouter.get('/', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AGENTS_LIST), (0, validation_1.validate)({ query: agent_management_validation_1.listAgentsQuerySchema }), agentAdmin.listAgents);
agentsAdminRouter.get('/:agentId', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AGENTS_VIEW), (0, validation_1.validate)({ params: agent_management_validation_1.agentIdParamsSchema }), agentAdmin.getAgentDetails);
agentsAdminRouter.post('/:agentId/kyc-review', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AGENTS_KYC_REVIEW), (0, admin_middleware_1.adminAudit)('agent-management'), (0, validation_1.validate)({ params: agent_management_validation_1.agentIdParamsSchema, body: agent_management_validation_1.kycReviewBodySchema }), agentAdmin.reviewKyc);
agentsAdminRouter.post('/:agentId/suspend', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AGENTS_SUSPEND), (0, admin_middleware_1.adminAudit)('agent-management'), (0, validation_1.validate)({ params: agent_management_validation_1.agentIdParamsSchema, body: agent_management_validation_1.suspendAgentBodySchema }), agentAdmin.suspendAgent);
agentsAdminRouter.post('/:agentId/reactivate', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AGENTS_SUSPEND), (0, admin_middleware_1.adminAudit)('agent-management'), (0, validation_1.validate)({ params: agent_management_validation_1.agentIdParamsSchema }), agentAdmin.reactivateAgent);
agentsAdminRouter.patch('/:agentId/credit-limit', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.AGENTS_CREDIT_MANAGE), (0, admin_middleware_1.adminAudit)('agent-management'), (0, validation_1.validate)({ params: agent_management_validation_1.agentIdParamsSchema, body: agent_management_validation_1.updateCreditLimitBodySchema }), agentAdmin.updateCreditLimit);
adminRouter.use('/agents', agentsAdminRouter);
// ---------------------------------------------------------------------------
// 16. Commission Management Router (/api/v1/admin/commissions)
// ---------------------------------------------------------------------------
const commissionsRouter = (0, express_1.Router)();
const commissions = commission_management_controller_1.CommissionManagementController.getInstance();
commissionsRouter.get('/rules', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COMMISSIONS_LIST), (0, validation_1.validate)({ query: commission_management_validation_1.listCommissionRulesQuerySchema }), commissions.listRules);
commissionsRouter.post('/rules', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COMMISSIONS_MANAGE), (0, admin_middleware_1.adminAudit)('commission-management'), (0, validation_1.validate)({ body: commission_management_validation_1.createCommissionRuleBodySchema }), commissions.createRule);
commissionsRouter.patch('/rules/:ruleId', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COMMISSIONS_MANAGE), (0, admin_middleware_1.adminAudit)('commission-management'), (0, validation_1.validate)({ params: commission_management_validation_1.ruleIdParamsSchema, body: commission_management_validation_1.updateCommissionRuleBodySchema }), commissions.updateRule);
commissionsRouter.post('/rules/:ruleId/toggle', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COMMISSIONS_MANAGE), (0, admin_middleware_1.adminAudit)('commission-management'), (0, validation_1.validate)({ params: commission_management_validation_1.ruleIdParamsSchema }), commissions.toggleRuleStatus);
commissionsRouter.delete('/rules/:ruleId', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.COMMISSIONS_MANAGE), (0, admin_middleware_1.adminAudit)('commission-management'), (0, validation_1.validate)({ params: commission_management_validation_1.ruleIdParamsSchema }), commissions.deleteRule);
adminRouter.use('/commissions', commissionsRouter);
// ---------------------------------------------------------------------------
// 17. Ledger & Platform Reconciliation Router (/api/v1/admin/ledger)
// ---------------------------------------------------------------------------
const ledgerRouter = (0, express_1.Router)();
const ledgerAdmin = ledger_management_controller_1.LedgerManagementController.getInstance();
ledgerRouter.get('/entries', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.LEDGER_VIEW), (0, validation_1.validate)({ query: ledger_management_validation_1.listLedgerQuerySchema }), ledgerAdmin.listLedgerEntries);
ledgerRouter.get('/reconciliation', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.LEDGER_RECONCILE), ledgerAdmin.getReconciliationReport);
ledgerRouter.post('/adjustments', (0, admin_middleware_1.authorizePermission)(admin_permissions_1.AdminPermission.LEDGER_ADJUST), (0, admin_middleware_1.adminAudit)('ledger-management'), (0, validation_1.validate)({ body: ledger_management_validation_1.manualAdjustmentBodySchema }), ledgerAdmin.createManualAdjustment);
adminRouter.use('/ledger', ledgerRouter);
exports.default = adminRouter;
//# sourceMappingURL=admin.routes.js.map