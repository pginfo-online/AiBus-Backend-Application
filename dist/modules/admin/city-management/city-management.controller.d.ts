import { Request, Response, NextFunction } from 'express';
export declare class CityManagementController {
    private readonly service;
    listCities: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCityById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createCity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateCity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deactivateCity: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    syncCities: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=city-management.controller.d.ts.map