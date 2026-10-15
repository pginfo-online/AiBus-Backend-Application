import { Router } from 'express';
import { AgentsController } from './agents.controller';
import { authenticate } from '../../app/middleware/auth';
import {
  requireAgentContext,
  requireAgentRoles,
} from './agents.middleware';
import { AgentStaffRole } from '@prisma/client';

const router = Router();
const controller = AgentsController.getInstance();

// ---------------------------------------------------------------------------
// Public Endpoints
// ---------------------------------------------------------------------------
router.post('/register', controller.register);
router.post('/wallet/topup/confirm', controller.confirmTopup);
router.post('/wallet/topup/:merchantTxnId/confirm', controller.confirmTopup);

// ---------------------------------------------------------------------------
// Protected Endpoints — Context Resolved via JWT
// ---------------------------------------------------------------------------
router.use(authenticate);
router.use(requireAgentContext);

// Profile
router.get('/profile', controller.getProfile);
router.put(
  '/profile',
  requireAgentRoles(AgentStaffRole.OWNER, AgentStaffRole.MANAGER),
  controller.updateProfile
);

// KYC
router.post(
  '/kyc/documents',
  requireAgentRoles(AgentStaffRole.OWNER, AgentStaffRole.MANAGER),
  controller.submitKycDocument
);
router.get('/kyc/status', controller.getKycStatus);

// Bank Accounts
router.post(
  '/bank-accounts',
  requireAgentRoles(AgentStaffRole.OWNER, AgentStaffRole.MANAGER),
  controller.addBankAccount
);
router.get('/bank-accounts', controller.listBankAccounts);

// Staff Management
router.post(
  '/staff/invite',
  requireAgentRoles(AgentStaffRole.OWNER, AgentStaffRole.MANAGER),
  controller.inviteStaff
);
router.get('/staff', controller.listStaff);
router.patch(
  '/staff/:staffId/role',
  requireAgentRoles(AgentStaffRole.OWNER),
  controller.updateStaffRole
);
router.delete(
  '/staff/:staffId',
  requireAgentRoles(AgentStaffRole.OWNER),
  controller.removeStaff
);

// Wallet & Financials
router.get('/wallet', controller.getWallet);
router.post(
  '/wallet/topup',
  requireAgentRoles(AgentStaffRole.OWNER, AgentStaffRole.MANAGER),
  controller.initiateTopup
);
router.get(
  '/wallet/statement',
  requireAgentRoles(
    AgentStaffRole.OWNER,
    AgentStaffRole.MANAGER,
    AgentStaffRole.ACCOUNTANT
  ),
  controller.getStatement
);

// Reports & Analytics
router.get('/reports/bookings', controller.getBookings);
router.get(
  '/reports/commissions',
  requireAgentRoles(
    AgentStaffRole.OWNER,
    AgentStaffRole.MANAGER,
    AgentStaffRole.ACCOUNTANT
  ),
  controller.getCommissions
);
router.get(
  '/reports/export',
  requireAgentRoles(
    AgentStaffRole.OWNER,
    AgentStaffRole.MANAGER,
    AgentStaffRole.ACCOUNTANT
  ),
  controller.exportReport
);

export default router;
