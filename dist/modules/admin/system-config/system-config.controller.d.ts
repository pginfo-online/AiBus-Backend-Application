import { Request, Response, NextFunction } from 'express';
export declare class SystemConfigController {
    private readonly service;
    getConfigs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getConfigByKey: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFeatureFlags: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    createFeatureFlag: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    toggleFeatureFlag: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getDetailedSystemHealth: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=system-config.controller.d.ts.map