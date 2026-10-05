import { Request, Response, NextFunction } from 'express';
export declare class CitiesController {
    private citiesService;
    constructor();
    getCities: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    syncCities: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=cities.controller.d.ts.map