import { Request, Response, NextFunction } from "express";
export declare class CancellationsController {
    private cancellationsService;
    private gdsAdapter;
    constructor();
    checkCancellability: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cancelSeats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    checkDirectCancellability: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cancelDirectSeats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAgentBalance: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=cancellations.controller.d.ts.map