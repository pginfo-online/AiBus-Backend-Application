import { Request, Response, NextFunction } from 'express';
export declare class BookingsController {
    private bookingsService;
    constructor();
    createBooking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getBooking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    checkBookingStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=bookings.controller.d.ts.map