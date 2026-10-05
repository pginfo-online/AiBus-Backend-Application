import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../shared/utils/response';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
  }

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      ApiResponse.created(res, result, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deviceInfo = req.headers['user-agent'];
      const ipAddress = req.ip;
      const result = await this.authService.login(req.body, deviceInfo, ipAddress);

      // Set refresh token in HTTP-only cookie as well for web clients
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      ApiResponse.success(res, result, 'Logged in successfully');
    } catch (error) {
      next(error);
    }
  };

  public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken = req.body.refreshToken || req.cookies?.refreshToken;
      const deviceInfo = req.headers['user-agent'];
      const ipAddress = req.ip;

      const tokens = await this.authService.refreshTokens(rawToken, deviceInfo, ipAddress);

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      ApiResponse.success(res, tokens, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawToken = req.body?.refreshToken || req.cookies?.refreshToken;
      if (rawToken) {
        await this.authService.logout(rawToken);
      }

      res.clearCookie('refreshToken');
      ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  };
}
