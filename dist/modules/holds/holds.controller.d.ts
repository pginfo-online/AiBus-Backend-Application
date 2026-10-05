import { Request, Response, NextFunction } from 'express';
export declare class HoldsController {
    private holdsService;
    constructor();
    holdSeats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getHold: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=holds.controller.d.ts.map