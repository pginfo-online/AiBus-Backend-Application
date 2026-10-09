// ---------------------------------------------------------------------------
// Admin Module — Shared Utilities
// Pagination builder, filter parser, CSV export, ticket number generator
// ---------------------------------------------------------------------------

import { Response } from 'express';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

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
export function buildPagination(input: PaginationInput): PaginationResult {
  const page = Math.max(1, input.page || 1);
  const limit = Math.min(Math.max(1, input.limit || 20), 100); // Max 100 per page
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
}

/**
 * Build pagination meta from total count and pagination result.
 */
export function buildPaginationMeta(
  total: number,
  pagination: PaginationResult
): PaginationMeta {
  const totalPages = Math.ceil(total / pagination.limit);
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages,
    hasNext: pagination.page < totalPages,
    hasPrev: pagination.page > 1,
  };
}

// ---------------------------------------------------------------------------
// Date range filter
// ---------------------------------------------------------------------------

export interface DateRangeInput {
  startDate?: string;
  endDate?: string;
}

/**
 * Build a Prisma date range filter.
 * Returns undefined if neither date is provided.
 */
export function buildDateRangeFilter(
  input: DateRangeInput
): { gte?: Date; lte?: Date } | undefined {
  if (!input.startDate && !input.endDate) return undefined;

  const filter: { gte?: Date; lte?: Date } = {};
  if (input.startDate) {
    filter.gte = new Date(input.startDate);
  }
  if (input.endDate) {
    // Set to end of day
    const end = new Date(input.endDate);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return filter;
}

/**
 * Build a field-targeted Prisma date filter object.
 */
export function buildDateFilter(
  startDate?: string,
  endDate?: string,
  field = 'createdAt'
): Record<string, { gte?: Date; lte?: Date }> | undefined {
  if (!startDate && !endDate) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    filter.gte = new Date(startDate);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return { [field]: filter };
}

// ---------------------------------------------------------------------------
// Search filter
// ---------------------------------------------------------------------------

/**
 * Build a Prisma case-insensitive search filter for a given field.
 */
export function buildSearchFilter(
  search: string | undefined,
  fields: string[]
): Prisma.JsonObject[] | undefined {
  if (!search || !search.trim()) return undefined;

  const term = search.trim();
  return fields.map((field) => ({
    [field]: { contains: term, mode: 'insensitive' },
  }));
}

// ---------------------------------------------------------------------------
// Sort order builder
// ---------------------------------------------------------------------------

export interface SortInput {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Build a Prisma orderBy clause.
 * Only allows sorting on fields explicitly in allowedFields for security.
 */
export function buildSortOrder(
  input: SortInput,
  allowedFields: string[],
  defaultField = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
  const sortBy = input.sortBy && allowedFields.includes(input.sortBy)
    ? input.sortBy
    : defaultField;
  const sortOrder = input.sortOrder === 'asc' ? 'asc' : defaultOrder;
  return { [sortBy]: sortOrder };
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

/**
 * Stream CSV data directly to the response.
 * Efficient for large datasets — doesn't buffer entire content in memory.
 */
export function sendCsvResponse(
  res: Response,
  filename: string,
  headers: string[],
  rows: Record<string, unknown>[]
): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');

  // BOM for Excel UTF-8 compatibility
  res.write('\uFEFF');

  // Header row
  res.write(headers.map(escapeCsvValue).join(',') + '\n');

  // Data rows
  for (const row of rows) {
    const values = headers.map((header) => {
      const value = row[header];
      return escapeCsvValue(formatCsvValue(value));
    });
    res.write(values.join(',') + '\n');
  }

  res.end();
}

/**
 * Escape a CSV value (double-quote wrapping and escaping).
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a value for CSV output.
 */
function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ---------------------------------------------------------------------------
// Ticket / Reference number generators
// ---------------------------------------------------------------------------

/**
 * Generate a unique support ticket number.
 * Format: TKT-YYYYMMDD-XXXXX (where XXXXX is random alphanumeric)
 */
export function generateTicketNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TKT-${datePart}-${randomPart}`;
}

/**
 * Generate a unique coupon code.
 * Format: AIB-XXXXXXXXX (9 char random alphanumeric, uppercase)
 */
export function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AIB-${code}`;
}

// ---------------------------------------------------------------------------
// Enum helpers
// ---------------------------------------------------------------------------

/**
 * Safe enum value check — validates that a string is a valid member of an enum-like object.
 */
export function isValidEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: string
): value is T[keyof T] {
  return Object.values(enumObj).includes(value);
}

// ---------------------------------------------------------------------------
// Admin response wrapper
// ---------------------------------------------------------------------------

/**
 * Standard admin paginated response helper.
 */
export function sendAdminPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message?: string
): void {
  res.status(200).json({
    success: true,
    data,
    meta: { pagination },
    ...(message ? { message } : {}),
  });
}
