"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const response_1 = require("../../shared/utils/response");
class AuthController {
    authService;
    constructor() {
        this.authService = auth_service_1.AuthService.getInstance();
    }
    register = async (req, res, next) => {
        try {
            const result = await this.authService.register(req.body);
            response_1.ApiResponse.created(res, result, 'User registered successfully');
        }
        catch (error) {
            next(error);
        }
    };
    login = async (req, res, next) => {
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
            response_1.ApiResponse.success(res, result, 'Logged in successfully');
        }
        catch (error) {
            next(error);
        }
    };
    refreshToken = async (req, res, next) => {
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
            response_1.ApiResponse.success(res, tokens, 'Tokens refreshed successfully');
        }
        catch (error) {
            next(error);
        }
    };
    logout = async (req, res, next) => {
        try {
            const rawToken = req.body?.refreshToken || req.cookies?.refreshToken;
            if (rawToken) {
                await this.authService.logout(rawToken);
            }
            res.clearCookie('refreshToken');
            response_1.ApiResponse.success(res, null, 'Logged out successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map