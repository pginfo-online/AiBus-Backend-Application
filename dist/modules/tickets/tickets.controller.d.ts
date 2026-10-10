import { Request, Response, NextFunction } from 'express';
export declare class TicketsController {
    private ticketsService;
    constructor();
    getTicketByBookingId: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTicketByTicketNumber: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getGdsBookingDetails: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=tickets.controller.d.ts.map