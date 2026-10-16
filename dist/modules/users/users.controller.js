"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const users_service_1 = require("./users.service");
const response_1 = require("../../shared/utils/response");
class UsersController {
    usersService;
    constructor() {
        this.usersService = users_service_1.UsersService.getInstance();
    }
    getProfile = async (req, res, next) => {
        try {
            const userId = req.user.sub;
            const profile = await this.usersService.getProfile(userId);
            response_1.ApiResponse.success(res, profile, 'Profile retrieved');
        }
        catch (error) {
            next(error);
        }
    };
    updateProfile = async (req, res, next) => {
        try {
            const userId = req.user.sub;
            const updated = await this.usersService.updateProfile(userId, req.body);
            response_1.ApiResponse.success(res, updated, 'Profile updated');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map