import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate, authRateLimiter } from '../../app/middleware';
import { registerSchema, loginSchema, refreshTokenSchema, sendOtpSchema, verifyOtpSchema } from './auth.validation';

const authRouter = Router();
const controller = new AuthController();

// Stricter rate limits apply to sensitive authentication paths
authRouter.use(authRateLimiter);

// Fast onboarding endpoints (Mobile OTP based)
authRouter.post('/otp/send', validate({ body: sendOtpSchema }), controller.sendOtp);
authRouter.post('/otp/verify', validate({ body: verifyOtpSchema }), controller.verifyOtp);

// Traditional email/password endpoints (preserved for backwards-compatibility)
authRouter.post('/register', validate({ body: registerSchema }), controller.register);
authRouter.post('/login', validate({ body: loginSchema }), controller.login);
authRouter.post('/refresh', controller.refreshToken);
authRouter.post('/logout', controller.logout);

export { authRouter };
export default authRouter;
