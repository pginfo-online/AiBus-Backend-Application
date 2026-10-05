import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate, authRateLimiter } from '../../app/middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.validation';

const authRouter = Router();
const controller = new AuthController();

// Stricter rate limits apply to sensitive authentication paths
authRouter.use(authRateLimiter);

authRouter.post('/register', validate({ body: registerSchema }), controller.register);
authRouter.post('/login', validate({ body: loginSchema }), controller.login);
authRouter.post('/refresh', controller.refreshToken);
authRouter.post('/logout', controller.logout);

export { authRouter };
export default authRouter;
