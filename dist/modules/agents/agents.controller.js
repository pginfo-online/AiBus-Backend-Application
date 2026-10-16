"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsController = void 0;
const agents_service_1 = require("./agents.service");
const agents_validation_1 = require("./agents.validation");
class AgentsController {
    static instance;
    agentsService;
    constructor() {
        this.agentsService = agents_service_1.AgentsService.getInstance();
    }
    static getInstance() {
        if (!AgentsController.instance) {
            AgentsController.instance = new AgentsController();
        }
        return AgentsController.instance;
    }
    // --------------------------------------------------------------------------
    // Registration & Profile
    // --------------------------------------------------------------------------
    register = async (req, res, next) => {
        try {
            const input = agents_validation_1.registerAgentSchema.parse(req.body);
            const result = await this.agentsService.registerAgent(input);
            res.status(201).json({
                success: true,
                message: 'Agent registered successfully. Please submit required KYC documents.',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getProfile = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const profile = await this.agentsService.getAgentById(agentId);
            res.json({
                success: true,
                data: profile,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateProfile = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const input = agents_validation_1.updateAgentProfileSchema.parse(req.body);
            const updated = await this.agentsService.updateProfile(agentId, input);
            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    };
    // --------------------------------------------------------------------------
    // KYC Documents
    // --------------------------------------------------------------------------
    submitKycDocument = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const input = agents_validation_1.submitKycDocSchema.parse(req.body);
            const doc = await this.agentsService.submitKycDocument(agentId, input.docType, input.fileUrl, input.storageKey);
            res.status(201).json({
                success: true,
                message: 'KYC document submitted successfully',
                data: doc,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getKycStatus = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const status = await this.agentsService.getKycStatus(agentId);
            res.json({
                success: true,
                data: status,
            });
        }
        catch (error) {
            next(error);
        }
    };
    // --------------------------------------------------------------------------
    // Bank Accounts
    // --------------------------------------------------------------------------
    addBankAccount = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const input = agents_validation_1.addBankAccountSchema.parse(req.body);
            const bankAccount = await this.agentsService.addBankAccount(agentId, input);
            res.status(201).json({
                success: true,
                message: 'Bank account added successfully',
                data: bankAccount,
            });
        }
        catch (error) {
            next(error);
        }
    };
    listBankAccounts = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const accounts = await this.agentsService.listBankAccounts(agentId);
            res.json({
                success: true,
                data: accounts,
            });
        }
        catch (error) {
            next(error);
        }
    };
    // --------------------------------------------------------------------------
    // Staff Management
    // --------------------------------------------------------------------------
    inviteStaff = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const input = agents_validation_1.inviteStaffSchema.parse(req.body);
            const result = await this.agentsService.inviteStaff(agentId, input);
            res.status(201).json({
                success: true,
                message: 'Staff member added successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    listStaff = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const staffList = await this.agentsService.listStaff(agentId);
            res.json({
                success: true,
                data: staffList,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateStaffRole = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const staffId = req.params.staffId;
            const input = agents_validation_1.updateStaffRoleSchema.parse(req.body);
            const updated = await this.agentsService.updateStaffRole(agentId, staffId, input);
            res.json({
                success: true,
                message: 'Staff role updated successfully',
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    };
    removeStaff = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const staffId = req.params.staffId;
            await this.agentsService.removeStaff(agentId, staffId);
            res.json({
                success: true,
                message: 'Staff member removed successfully',
            });
        }
        catch (error) {
            next(error);
        }
    };
    // --------------------------------------------------------------------------
    // Wallet & Top-up
    // --------------------------------------------------------------------------
    getWallet = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const wallet = await this.agentsService.getWallet(agentId);
            res.json({
                success: true,
                data: wallet,
            });
        }
        catch (error) {
            next(error);
        }
    };
    initiateTopup = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const input = agents_validation_1.initiateTopupSchema.parse(req.body);
            const result = await this.agentsService.initiateTopup(agentId, input);
            res.status(201).json({
                success: true,
                message: 'Topup initiated',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    confirmTopup = async (req, res, next) => {
        try {
            const merchantTxnId = req.params.merchantTxnId || req.body.merchantTxnId;
            const gatewayPaymentId = req.body.gatewayPaymentId || req.body.transactionId;
            const result = await this.agentsService.confirmTopup(merchantTxnId, gatewayPaymentId);
            res.json({
                success: true,
                message: 'Top-up confirmed and credited to wallet',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getStatement = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
            const statement = await this.agentsService.getWalletStatement(agentId, page, limit);
            res.json({
                success: true,
                data: statement,
            });
        }
        catch (error) {
            next(error);
        }
    };
    // --------------------------------------------------------------------------
    // Reports
    // --------------------------------------------------------------------------
    getBookings = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
            const filters = {
                page,
                limit,
                status: req.query.status,
                fromDate: req.query.fromDate,
                toDate: req.query.toDate,
            };
            const result = await this.agentsService.getBookingHistory(agentId, filters);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getCommissions = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const fromDate = req.query.fromDate;
            const toDate = req.query.toDate;
            const summary = await this.agentsService.getCommissionSummary(agentId, fromDate, toDate);
            res.json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            next(error);
        }
    };
    exportReport = async (req, res, next) => {
        try {
            const agentId = req.agentId;
            const filters = {
                page: 1,
                limit: 1000,
                fromDate: req.query.fromDate,
                toDate: req.query.toDate,
            };
            const { bookings } = await this.agentsService.getBookingHistory(agentId, filters);
            // Stream CSV
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="aibus-agent-report-${Date.now()}.csv"`);
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
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AgentsController = AgentsController;
//# sourceMappingURL=agents.controller.js.map