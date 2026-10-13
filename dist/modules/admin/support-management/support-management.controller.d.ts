import { Request, Response, NextFunction } from 'express';
export declare class SupportManagementController {
    private readonly service;
    listTickets: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTicketById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createTicket: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateTicket: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    replyToTicket: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=support-management.controller.d.ts.map