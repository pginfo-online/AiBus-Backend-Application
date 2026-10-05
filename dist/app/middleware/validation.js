"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const errors_1 = require("../../shared/errors");
/**
 * Express middleware that validates request parts against Zod schemas.
 * Returns 400 with structured error details on validation failure.
 */
function validate(schemas) {
    return (req, _res, next) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                const parsed = schemas.query.parse(req.query);
                Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
            }
            if (schemas.params) {
                const parsed = schemas.params.parse(req.params);
                Object.defineProperty(req, 'params', { value: parsed, writable: true, configurable: true });
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                next(new errors_1.ValidationError('Validation failed', { details }));
            }
            else {
                next(error);
            }
        }
    };
}
//# sourceMappingURL=validation.js.map