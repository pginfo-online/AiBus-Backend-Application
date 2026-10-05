"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
exports.sendSuccess = sendSuccess;
exports.sendPaginated = sendPaginated;
exports.sendCreated = sendCreated;
exports.sendNoContent = sendNoContent;
/**
 * Send a standardized success response.
 */
function sendSuccess(res, options) {
    res.status(options.statusCode || 200).json({
        success: true,
        data: options.data,
        ...(options.meta ? { meta: options.meta } : {}),
    });
}
/**
 * Send a paginated success response.
 */
function sendPaginated(res, data, pagination) {
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
function sendCreated(res, data) {
    sendSuccess(res, { data, statusCode: 201 });
}
/**
 * Send a 204 No Content response.
 */
function sendNoContent(res) {
    res.status(204).send();
}
exports.ApiResponse = {
    success(res, data, message, meta) {
        res.status(200).json({
            success: true,
            data,
            ...(message ? { message } : {}),
            ...(meta ? { meta } : {}),
        });
    },
    created(res, data, message) {
        res.status(201).json({
            success: true,
            data,
            ...(message ? { message } : {}),
        });
    },
    noContent(res) {
        res.status(204).send();
    },
    paginated(res, data, pagination) {
        sendPaginated(res, data, pagination);
    },
    error(res, message, code = 'ERROR', statusCode = 400) {
        res.status(statusCode).json({
            success: false,
            error: {
                code,
                message,
            },
        });
    },
};
//# sourceMappingURL=response.js.map