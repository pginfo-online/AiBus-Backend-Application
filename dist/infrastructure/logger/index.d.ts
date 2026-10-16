import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
/**
 * Create a child logger with contextual bindings.
 * Use for per-request or per-module logging.
 */
export declare function createChildLogger(bindings: Record<string, unknown>): pino.Logger;
export type Logger = pino.Logger;
//# sourceMappingURL=index.d.ts.map