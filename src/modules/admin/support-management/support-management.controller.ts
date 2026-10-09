// ---------------------------------------------------------------------------
// Admin Support Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { SupportManagementService } from './support-management.service';
import { ApiResponse } from '../../../shared/utils';

export class SupportManagementController {
  private readonly service = SupportManagementService.getInstance();

  public listTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listTickets(req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Support tickets retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const ticket = await this.service.getTicketById(id);
      ApiResponse.success(res, ticket, 'Support ticket details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const ticket = await this.service.createTicket(req.body, adminId);
      ApiResponse.created(res, ticket, 'Support ticket created successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const ticket = await this.service.updateTicket(id, req.body, adminId);
      ApiResponse.success(res, ticket, 'Support ticket updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public replyToTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authorId = req.user!.sub;
      const authorType = req.user!.role; // 'ADMIN' or 'SUPPORT_AGENT'
      const id = req.params.id as string;
      const reply = await this.service.replyToTicket(id, req.body, authorId, authorType);
      ApiResponse.created(res, reply, 'Reply added successfully');
    } catch (error) {
      next(error);
    }
  };
}
