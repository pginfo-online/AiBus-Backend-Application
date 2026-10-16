import { AxiosInstance, AxiosError } from 'axios';
export interface HttpClientOptions {
    baseURL: string;
    name: string;
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
export declare function createHttpClient(options: HttpClientOptions): AxiosInstance;
/**
 * Classify whether an Axios error is safe to retry.
 *
 * CRITICAL: booking/payment operations have their own retry logic.
 * This is only for read operations and idempotent writes.
 */
export declare function isRetryableError(error: AxiosError): boolean;
/**
 * Classify whether an error is a timeout.
 */
export declare function isTimeoutError(error: AxiosError): boolean;
/**
 * Classify whether an error is a rate limit.
 */
export declare function isRateLimitError(error: AxiosError): boolean;
//# sourceMappingURL=index.d.ts.map