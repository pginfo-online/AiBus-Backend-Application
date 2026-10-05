"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const uuid_1 = require("uuid");
/**
 * Assigns a unique request ID (from header or generated).
 * This ID is carried through logs, error responses, and downstream calls.
 */
function requestIdMiddleware(req, res, next) {
    const requestId = req.headers['x-request-id'] || (0, uuid_1.v4)();
    req.requestId = requestId;
    req.startTime = Date.now();
    // Echo back for client correlation
    res.setHeader('X-Request-Id', requestId);
    next();
}
//# sourceMappingURL=requestId.js.map