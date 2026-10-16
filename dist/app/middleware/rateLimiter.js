"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.apiRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../../config/env");
const errors_1 = require("../../shared/errors");
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
    max: env_1.env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
        next(new errors_1.RateLimitError('Too many requests, please try again later.'));
    },
});
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: env_1.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
        next(new errors_1.RateLimitError('Too many authentication attempts, please try again later.'));
    },
});
//# sourceMappingURL=rateLimiter.js.map