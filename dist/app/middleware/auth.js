"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.optionalAuth = optionalAuth;
exports.hasMinimumRole = hasMinimumRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const errors_1 = require("../../shared/errors");
const constants_1 = require("../../shared/constants");
const logger_1 = require("../../infrastructure/logger");
/**
 * Authentication middleware — verifies JWT access token from Authorization header.
 * Attaches decoded payload to `req.user`.
 */
function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.AuthenticationError('Missing or invalid authorization header');
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET, {
            issuer: env_1.env.JWT_ISSUER,
            algorithms: ['HS256'],
        });
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.TokenExpiredError());
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.AuthenticationError('Invalid token'));
        }
        else if (error instanceof errors_2.AppError) {
            next(error);
        }
        else {
            next(new errors_1.AuthenticationError('Authentication failed'));
        }
    }
}
// Import AppError for instanceof check
const errors_2 = require("../../shared/errors");
/**
 * Authorization middleware — checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER `authenticate`.
 */
function authorize(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new errors_1.AuthenticationError('User not authenticated'));
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            logger_1.logger.warn({
                userId: req.user.sub,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                path: req.path,
                requestId: req.requestId,
            }, 'Authorization denied');
            next(new errors_1.AuthorizationError());
            return;
        }
        next();
    };
}
/**
 * Optional authentication — attaches user if token present, but doesn't require it.
 * Useful for endpoints that work for both authenticated and anonymous users.
 */
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
    }
    try {
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET, {
            issuer: env_1.env.JWT_ISSUER,
            algorithms: ['HS256'],
        });
        req.user = decoded;
    }
    catch {
        // Token invalid/expired — proceed without user context
    }
    next();
}
/** Role hierarchy for comparison */
const ROLE_HIERARCHY = {
    [constants_1.UserRole.CUSTOMER]: 0,
    [constants_1.UserRole.OPERATOR_AGENT]: 1,
    [constants_1.UserRole.SUPPORT]: 2,
    [constants_1.UserRole.SUPPORT_AGENT]: 2,
    [constants_1.UserRole.ADMIN]: 3,
    [constants_1.UserRole.SUPER_ADMIN]: 4,
};
/**
 * Check if a role has at least the minimum required privilege level.
 */
function hasMinimumRole(userRole, minimumRole) {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
//# sourceMappingURL=auth.js.map