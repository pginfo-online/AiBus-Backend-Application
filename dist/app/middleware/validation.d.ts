import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
interface ValidationSchemas {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}
/**
 * Express middleware that validates request parts against Zod schemas.
 * Returns 400 with structured error details on validation failure.
 */
export declare function validate(schemas: ValidationSchemas): (req: Request, _res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validation.d.ts.map