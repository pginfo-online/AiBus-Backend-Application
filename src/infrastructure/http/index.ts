import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { logger } from '../logger';

// ---------------------------------------------------------------------------
// HTTP client factory — consistent timeout, logging, error classification
// ---------------------------------------------------------------------------

const httpLogger = logger.child({ module: 'http-client' });

export interface HttpClientOptions {
  baseURL: string;
  name: string; // For logging identification
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
  headers?: Record<string, string>;
  enableCompression?: boolean;
}

/**
 * Create a configured Axios instance with:
 * - Timeouts
 * - Request/response logging
 * - Error normalization
 * - Compression support
 */
export function createHttpClient(options: HttpClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.requestTimeoutMs ?? 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      ...options.headers,
    },
    // Axios doesn't support separate connect timeout natively;
    // the `timeout` covers the whole request lifecycle.
    validateStatus: () => true, // Don't throw on non-2xx — let callers decide
  });

  // Request interceptor — log outgoing requests
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const requestId = config.headers?.['x-request-id'] || 'unknown';
      (config as any)._startTime = Date.now();
      httpLogger.debug(
        {
          provider: options.name,
          method: config.method?.toUpperCase(),
          url: config.url,
          requestId,
        },
        'Outgoing request'
      );
      return config;
    },
    (error: AxiosError) => {
      httpLogger.error(
        { provider: options.name, err: error },
        'Request interceptor error'
      );
      return Promise.reject(error);
    }
  );

  // Response interceptor — log responses with latency
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      const durationMs = Date.now() - ((response.config as any)._startTime || 0);
      httpLogger.debug(
        {
          provider: options.name,
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          durationMs,
        },
        'Response received'
      );
      return response;
    },
    (error: AxiosError) => {
      const durationMs = Date.now() - ((error.config as any)?._startTime || 0);
      httpLogger.error(
        {
          provider: options.name,
          method: error.config?.method?.toUpperCase(),
          url: error.config?.url,
          code: error.code,
          durationMs,
        },
        'Request failed'
      );
      return Promise.reject(error);
    }
  );

  return client;
}

// ---------------------------------------------------------------------------
// Error classification — determines if an error is retryable
// ---------------------------------------------------------------------------

/**
 * Classify whether an Axios error is safe to retry.
 * 
 * CRITICAL: booking/payment operations have their own retry logic.
 * This is only for read operations and idempotent writes.
 */
export function isRetryableError(error: AxiosError): boolean {
  // Network errors (connection reset, DNS failure, etc.)
  if (!error.response) {
    const retryableCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
      'EPIPE',
      'EHOSTUNREACH',
    ];
    return retryableCodes.includes(error.code || '');
  }

  // Server errors
  const status = error.response.status;
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Classify whether an error is a timeout.
 */
export function isTimeoutError(error: AxiosError): boolean {
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.message?.includes('timeout')
  );
}

/**
 * Classify whether an error is a rate limit.
 */
export function isRateLimitError(error: AxiosError): boolean {
  return error.response?.status === 429;
}
