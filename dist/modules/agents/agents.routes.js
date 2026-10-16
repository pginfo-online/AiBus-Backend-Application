"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agents_controller_1 = require("./agents.controller");
const auth_1 = require("../../app/middleware/auth");
const agents_middleware_1 = require("./agents.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const controller = agents_controller_1.AgentsController.getInstance();
// ---------------------------------------------------------------------------
// Public Endpoints
// ---------------------------------------------------------------------------
router.post('/register', controller.register);
router.post('/wallet/topup/confirm', controller.confirmTopup);
router.post('/wallet/topup/:merchantTxnId/confirm', controller.confirmTopup);
// ---------------------------------------------------------------------------
// Protected Endpoints — Context Resolved via JWT
// ---------------------------------------------------------------------------
router.use(auth_1.authenticate);
router.use(agents_middleware_1.requireAgentContext);
// Profile
router.get('/profile', controller.getProfile);
router.put('/profile', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER, client_1.AgentStaffRole.MANAGER), controller.updateProfile);
// KYC
router.post('/kyc/documents', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER, client_1.AgentStaffRole.MANAGER), controller.submitKycDocument);
router.get('/kyc/status', controller.getKycStatus);
// Bank Accounts
router.post('/bank-accounts', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER, client_1.AgentStaffRole.MANAGER), controller.addBankAccount);
router.get('/bank-accounts', controller.listBankAccounts);
// Staff Management
router.post('/staff/invite', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER, client_1.AgentStaffRole.MANAGER), controller.inviteStaff);
router.get('/staff', controller.listStaff);
router.patch('/staff/:staffId/role', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER), controller.updateStaffRole);
router.delete('/staff/:staffId', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER), controller.removeStaff);
// Wallet & Financials
router.get('/wallet', controller.getWallet);
router.post('/wallet/topup', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER, client_1.AgentStaffRole.MANAGER), controller.initiateTopup);
router.get('/wallet/statement', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER, client_1.AgentStaffRole.MANAGER, client_1.AgentStaffRole.ACCOUNTANT), controller.getStatement);
// Reports & Analytics
router.get('/reports/bookings', controller.getBookings);
router.get('/reports/commissions', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER, client_1.AgentStaffRole.MANAGER, client_1.AgentStaffRole.ACCOUNTANT), controller.getCommissions);
router.get('/reports/export', (0, agents_middleware_1.requireAgentRoles)(client_1.AgentStaffRole.OWNER, client_1.AgentStaffRole.MANAGER, client_1.AgentStaffRole.ACCOUNTANT), controller.exportReport);
exports.default = router;
//# sourceMappingURL=agents.routes.js.map