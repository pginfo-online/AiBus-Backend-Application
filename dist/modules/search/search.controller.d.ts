import { Request, Response, NextFunction } from 'express';
export declare class SearchController {
    private searchService;
    constructor();
    searchBuses: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    searchSingleBus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=search.controller.d.ts.map