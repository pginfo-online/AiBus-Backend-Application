import { Request, Response, NextFunction } from 'express';
import { AgentsService } from './agents.service';
import {
  registerAgentSchema,
  updateAgentProfileSchema,
  submitKycDocSchema,
  addBankAccountSchema,
  inviteStaffSchema,
  updateStaffRoleSchema,
  initiateTopupSchema,
} from './agents.validation';
import { AgentKycDocType } from '@prisma/client';

export class AgentsController {
  private static instance: AgentsController;
  private agentsService: AgentsService;

  private constructor() {
    this.agentsService = AgentsService.getInstance();
  }

  public static getInstance(): AgentsController {
    if (!AgentsController.instance) {
      AgentsController.instance = new AgentsController();
    }
    return AgentsController.instance;
  }

  // --------------------------------------------------------------------------
  // Registration & Profile
  // --------------------------------------------------------------------------
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = registerAgentSchema.parse(req.body);
      const result = await this.agentsService.registerAgent(input);
      res.status(201).json({
        success: true,
        message: 'Agent registered successfully. Please submit required KYC documents.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const profile = await this.agentsService.getAgentById(agentId);
      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const input = updateAgentProfileSchema.parse(req.body);
      const updated = await this.agentsService.updateProfile(agentId, input);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // KYC Documents
  // --------------------------------------------------------------------------
  public submitKycDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const input = submitKycDocSchema.parse(req.body);
      const doc = await this.agentsService.submitKycDocument(
        agentId,
        input.docType as AgentKycDocType,
        input.fileUrl,
        input.storageKey
      );
      res.status(201).json({
        success: true,
        message: 'KYC document submitted successfully',
        data: doc,
      });
    } catch (error) {
      next(error);
    }
  };

  public getKycStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const status = await this.agentsService.getKycStatus(agentId);
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // Bank Accounts
  // --------------------------------------------------------------------------
  public addBankAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const input = addBankAccountSchema.parse(req.body);
      const bankAccount = await this.agentsService.addBankAccount(agentId, input);
      res.status(201).json({
        success: true,
        message: 'Bank account added successfully',
        data: bankAccount,
      });
    } catch (error) {
      next(error);
    }
  };

  public listBankAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const accounts = await this.agentsService.listBankAccounts(agentId);
      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // Staff Management
  // --------------------------------------------------------------------------
  public inviteStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const input = inviteStaffSchema.parse(req.body);
      const result = await this.agentsService.inviteStaff(agentId, input);
      res.status(201).json({
        success: true,
        message: 'Staff member added successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public listStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const staffList = await this.agentsService.listStaff(agentId);
      res.json({
        success: true,
        data: staffList,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateStaffRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const staffId = req.params.staffId as string;
      const input = updateStaffRoleSchema.parse(req.body);
      const updated = await this.agentsService.updateStaffRole(agentId, staffId, input);
      res.json({
        success: true,
        message: 'Staff role updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  public removeStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const staffId = req.params.staffId as string;
      await this.agentsService.removeStaff(agentId, staffId);
      res.json({
        success: true,
        message: 'Staff member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // Wallet & Top-up
  // --------------------------------------------------------------------------
  public getWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const wallet = await this.agentsService.getWallet(agentId);
      res.json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  };

  public initiateTopup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const input = initiateTopupSchema.parse(req.body);
      const result = await this.agentsService.initiateTopup(agentId, input);
      res.status(201).json({
        success: true,
        message: 'Topup initiated',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public confirmTopup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantTxnId = req.params.merchantTxnId || req.body.merchantTxnId;
      const gatewayPaymentId = req.body.gatewayPaymentId || req.body.transactionId;
      const result = await this.agentsService.confirmTopup(merchantTxnId, gatewayPaymentId);
      res.json({
        success: true,
        message: 'Top-up confirmed and credited to wallet',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getStatement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const statement = await this.agentsService.getWalletStatement(agentId, page, limit);
      res.json({
        success: true,
        data: statement,
      });
    } catch (error) {
      next(error);
    }
  };

  // --------------------------------------------------------------------------
  // Reports
  // --------------------------------------------------------------------------
  public getBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const filters = {
        page,
        limit,
        status: req.query.status as string,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
      };
      const result = await this.agentsService.getBookingHistory(agentId, filters);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getCommissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;
      const summary = await this.agentsService.getCommissionSummary(agentId, fromDate, toDate);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  public exportReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const agentId = req.agentId!;
      const filters = {
        page: 1,
        limit: 1000,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
      };
      const { bookings } = await this.agentsService.getBookingHistory(agentId, filters);

      // Stream CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="aibus-agent-report-${Date.now()}.csv"`
      );

      const header = 'BookingNumber,PNR,Status,GrossFare,CommissionRate,CommissionAmount,NetFare,BookedAt\n';
      res.write(header);

      for (const b of bookings) {
        const rate = b.commissionSnapshot?.commissionRate ? `${b.commissionSnapshot.commissionRate}%` : '0%';
        const commAmt = b.commissionSnapshot?.commissionAmt ?? '0.00';
        const net = b.commissionSnapshot?.netFare ?? b.totalFare;
        const line = `"${b.bookingNumber}","${b.providerPnrNo || 'N/A'}","${b.status}",${b.totalFare},"${rate}",${commAmt},${net},"${b.createdAt.toISOString()}"\n`;
        res.write(line);
      }

      res.end();
    } catch (error) {
      next(error);
    }
  };
}
