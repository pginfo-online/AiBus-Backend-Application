import { Response } from 'express';

// ---------------------------------------------------------------------------
// Standard API response envelope — consistent across all endpoints
// ---------------------------------------------------------------------------

interface SuccessResponseOptions<T> {
  data: T;
  meta?: Record<string, unknown>;
  statusCode?: number;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * Send a standardized success response.
 */
export function sendSuccess<T>(
  res: Response,
  options: SuccessResponseOptions<T>
): void {
  res.status(options.statusCode || 200).json({
    success: true,
    data: options.data,
    ...(options.meta ? { meta: options.meta } : {}),
  });
}

/**
 * Send a paginated success response.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginatedMeta
): void {
  res.status(200).json({
    success: true,
    data,
    meta: {
      pagination,
    },
  });
}

/**
 * Send a 201 Created response.
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, { data, statusCode: 201 });
}

/**
 * Send a 204 No Content response.
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export const ApiResponse = {
  success<T>(res: Response, data: T, message?: string, meta?: Record<string, unknown>): void {
    res.status(200).json({
      success: true,
      data,
      ...(message ? { message } : {}),
      ...(meta ? { meta } : {}),
    });
  },

  created<T>(res: Response, data: T, message?: string): void {
    res.status(201).json({
      success: true,
      data,
      ...(message ? { message } : {}),
    });
  },

  noContent(res: Response): void {
    res.status(204).send();
  },

  paginated<T>(res: Response, data: T[], pagination: PaginatedMeta, message?: string): void {
    res.status(200).json({
      success: true,
      data,
      meta: {
        pagination,
      },
      ...(message ? { message } : {}),
    });
  },

  error(res: Response, message: string, code = 'ERROR', statusCode = 400): void {
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  },
};

