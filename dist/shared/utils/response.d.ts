import { Response } from 'express';
interface SuccessResponseOptions<T> {
    data: T;
    meta?: Record<string, unknown>;
    statusCode?: number;
}
interface PaginatedMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
/**
 * Send a standardized success response.
 */
export declare function sendSuccess<T>(res: Response, options: SuccessResponseOptions<T>): void;
/**
 * Send a paginated success response.
 */
export declare function sendPaginated<T>(res: Response, data: T[], pagination: PaginatedMeta): void;
/**
 * Send a 201 Created response.
 */
export declare function sendCreated<T>(res: Response, data: T): void;
/**
 * Send a 204 No Content response.
 */
export declare function sendNoContent(res: Response): void;
export declare const ApiResponse: {
    success<T>(res: Response, data: T, message?: string, meta?: Record<string, unknown>): void;
    created<T>(res: Response, data: T, message?: string): void;
    noContent(res: Response): void;
    paginated<T>(res: Response, data: T[], pagination: PaginatedMeta): void;
    error(res: Response, message: string, code?: string, statusCode?: number): void;
};
export {};
//# sourceMappingURL=response.d.ts.map