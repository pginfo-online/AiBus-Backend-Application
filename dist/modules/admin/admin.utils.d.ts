import { Response } from 'express';
import { Prisma } from '@prisma/client';
export interface PaginationInput {
    page?: number;
    limit?: number;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface PaginationResult {
    skip: number;
    take: number;
    page: number;
    limit: number;
}
export interface PaginatedResult<T> {
    items: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
/**
 * Build Prisma-compatible pagination parameters from query input.
 * Enforces sane defaults and max limits for security.
 */
export declare function buildPagination(input: PaginationInput): PaginationResult;
/**
 * Build pagination meta from total count and pagination result.
 */
export declare function buildPaginationMeta(total: number, pagination: PaginationResult): PaginationMeta;
export interface DateRangeInput {
    startDate?: string;
    endDate?: string;
}
/**
 * Build a Prisma date range filter.
 * Returns undefined if neither date is provided.
 */
export declare function buildDateRangeFilter(input: DateRangeInput): {
    gte?: Date;
    lte?: Date;
} | undefined;
/**
 * Build a field-targeted Prisma date filter object.
 */
export declare function buildDateFilter(startDate?: string, endDate?: string, field?: string): Record<string, {
    gte?: Date;
    lte?: Date;
}> | undefined;
/**
 * Build a Prisma case-insensitive search filter for a given field.
 */
export declare function buildSearchFilter(search: string | undefined, fields: string[]): Prisma.JsonObject[] | undefined;
export interface SortInput {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
/**
 * Build a Prisma orderBy clause.
 * Only allows sorting on fields explicitly in allowedFields for security.
 */
export declare function buildSortOrder(input: SortInput, allowedFields: string[], defaultField?: string, defaultOrder?: 'asc' | 'desc'): Record<string, 'asc' | 'desc'>;
/**
 * Stream CSV data directly to the response.
 * Efficient for large datasets — doesn't buffer entire content in memory.
 */
export declare function sendCsvResponse(res: Response, filename: string, headers: string[], rows: Record<string, unknown>[]): void;
/**
 * Generate a unique support ticket number.
 * Format: TKT-YYYYMMDD-XXXXX (where XXXXX is random alphanumeric)
 */
export declare function generateTicketNumber(): string;
/**
 * Generate a unique coupon code.
 * Format: AIB-XXXXXXXXX (9 char random alphanumeric, uppercase)
 */
export declare function generateCouponCode(): string;
/**
 * Safe enum value check — validates that a string is a valid member of an enum-like object.
 */
export declare function isValidEnumValue<T extends Record<string, string>>(enumObj: T, value: string): value is T[keyof T];
/**
 * Standard admin paginated response helper.
 */
export declare function sendAdminPaginated<T>(res: Response, data: T[], pagination: PaginationMeta, message?: string): void;
//# sourceMappingURL=admin.utils.d.ts.map