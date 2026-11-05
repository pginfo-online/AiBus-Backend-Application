import { Request, Response, NextFunction } from 'express';
export declare class CancellationsController {
    private cancellationsService;
    constructor();
    checkCancellability: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cancelSeats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=cancellations.controller.d.ts.map