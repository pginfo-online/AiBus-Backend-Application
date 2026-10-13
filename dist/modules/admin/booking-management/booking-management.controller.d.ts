import { Request, Response, NextFunction } from 'express';
export declare class BookingManagementController {
    private service;
    constructor();
    listBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getBookingDetails: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateBookingStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cancelBooking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    reconcileBooking: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getBookingStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getBookingById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    overrideStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=booking-management.controller.d.ts.map