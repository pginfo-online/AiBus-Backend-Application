"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpClient = createHttpClient;
exports.isRetryableError = isRetryableError;
exports.isTimeoutError = isTimeoutError;
exports.isRateLimitError = isRateLimitError;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../logger");
// ---------------------------------------------------------------------------
// HTTP client factory — consistent timeout, logging, error classification
// ---------------------------------------------------------------------------
const httpLogger = logger_1.logger.child({ module: 'http-client' });
/**
 * Create a configured Axios instance with:
 * - Timeouts
 * - Request/response logging
 * - Error normalization
 * - Compression support
 */
function createHttpClient(options) {
    const client = axios_1.default.create({
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
    client.interceptors.request.use((config) => {
        const requestId = config.headers?.['x-request-id'] || 'unknown';
        config._startTime = Date.now();
        httpLogger.debug({
            provider: options.name,
            method: config.method?.toUpperCase(),
            url: config.url,
            requestId,
        }, 'Outgoing request');
        return config;
    }, (error) => {
        httpLogger.error({ provider: options.name, err: error }, 'Request interceptor error');
        return Promise.reject(error);
    });
    // Response interceptor — log responses with latency
    client.interceptors.response.use((response) => {
        const durationMs = Date.now() - (response.config._startTime || 0);
        httpLogger.debug({
            provider: options.name,
            method: response.config.method?.toUpperCase(),
            url: response.config.url,
            status: response.status,
            durationMs,
        }, 'Response received');
        return response;
    }, (error) => {
        const durationMs = Date.now() - (error.config?._startTime || 0);
        httpLogger.error({
            provider: options.name,
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url,
            code: error.code,
            durationMs,
        }, 'Request failed');
        return Promise.reject(error);
    });
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
function isRetryableError(error) {
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
function isTimeoutError(error) {
    return (error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('timeout'));
}
/**
 * Classify whether an error is a rate limit.
 */
function isRateLimitError(error) {
    return error.response?.status === 429;
}
//# sourceMappingURL=index.js.map