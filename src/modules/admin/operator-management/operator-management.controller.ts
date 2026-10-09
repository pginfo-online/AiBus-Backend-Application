// ---------------------------------------------------------------------------
// Admin Operator Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { OperatorManagementService } from './operator-management.service';
import { ApiResponse } from '../../../shared/utils';

export class OperatorManagementController {
  private readonly service = OperatorManagementService.getInstance();

  public listOperators = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listOperators(req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Operators retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getOperatorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const operator = await this.service.getOperatorById(id);
      ApiResponse.success(res, operator, 'Operator details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public createOperator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const operator = await this.service.createOperator(req.body, adminId);
      ApiResponse.created(res, operator, 'Operator created successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateOperator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const operator = await this.service.updateOperator(id, req.body, adminId);
      ApiResponse.success(res, operator, 'Operator updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public suspendOperator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const { reason } = req.body;
      const operator = await this.service.suspendOperator(id, reason, adminId);
      ApiResponse.success(res, operator, 'Operator suspended successfully');
    } catch (error) {
      next(error);
    }
  };

  public activateOperator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const operator = await this.service.activateOperator(id, adminId);
      ApiResponse.success(res, operator, 'Operator activated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getOperatorBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.service.getOperatorBookings(id, req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Operator bookings retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
