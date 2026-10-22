"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const middleware_1 = require("../../app/middleware");
const auth_validation_1 = require("./auth.validation");
const authRouter = (0, express_1.Router)();
exports.authRouter = authRouter;
const controller = new auth_controller_1.AuthController();
// Stricter rate limits apply to sensitive authentication paths
authRouter.use(middleware_1.authRateLimiter);
// Fast onboarding endpoints (Mobile OTP based)
authRouter.post('/otp/send', (0, middleware_1.validate)({ body: auth_validation_1.sendOtpSchema }), controller.sendOtp);
authRouter.post('/otp/verify', (0, middleware_1.validate)({ body: auth_validation_1.verifyOtpSchema }), controller.verifyOtp);
// Traditional email/password endpoints (preserved for backwards-compatibility)
authRouter.post('/register', (0, middleware_1.validate)({ body: auth_validation_1.registerSchema }), controller.register);
authRouter.post('/login', (0, middleware_1.validate)({ body: auth_validation_1.loginSchema }), controller.login);
authRouter.post('/refresh', controller.refreshToken);
authRouter.post('/logout', controller.logout);
exports.default = authRouter;
//# sourceMappingURL=auth.routes.js.map