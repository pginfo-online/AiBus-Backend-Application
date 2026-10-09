// ---------------------------------------------------------------------------
// Admin User Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { UserManagementService } from './user-management.service';
import { ApiResponse } from '../../../shared/utils/response';
import { sendAdminPaginated } from '../admin.utils';

export class UserManagementController {
  private service: UserManagementService;

  constructor() {
    this.service = UserManagementService.getInstance();
  }

  public listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { users, pagination } = await this.service.listUsers(req.query as any);
      sendAdminPaginated(res, users, pagination);
    } catch (error) {
      next(error);
    }
  };

  public getUserDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.service.getUserDetails(id as string);
      ApiResponse.success(res, user);
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const adminRole = req.user!.role;
      const user = await this.service.updateUser(id as string, req.body, adminRole);
      ApiResponse.success(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public suspendUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = req.user!.sub;
      const user = await this.service.suspendUser(id as string, req.body, adminId);
      ApiResponse.success(res, user, 'User suspended successfully');
    } catch (error) {
      next(error);
    }
  };

  public activateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const adminId = req.user!.sub;
      const user = await this.service.activateUser(id as string, adminId);
      ApiResponse.success(res, user, 'User activated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getUserBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { bookings, pagination } = await this.service.getUserBookings(id as string, page, limit);
      sendAdminPaginated(res, bookings, pagination);
    } catch (error) {
      next(error);
    }
  };

  public getUserPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { payments, pagination } = await this.service.getUserPayments(id as string, page, limit);
      sendAdminPaginated(res, payments, pagination);
    } catch (error) {
      next(error);
    }
  };

  public getUserWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { transactions, pagination } = await this.service.getUserWallet(id as string, page, limit);
      sendAdminPaginated(res, transactions, pagination);
    } catch (error) {
      next(error);
    }
  };

  public getUserWalletTransactions = this.getUserWallet;
}
