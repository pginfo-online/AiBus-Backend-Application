"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const middleware_1 = require("../../app/middleware");
const usersRouter = (0, express_1.Router)();
exports.usersRouter = usersRouter;
const controller = new users_controller_1.UsersController();
usersRouter.use(middleware_1.authenticate);
usersRouter.get('/profile', controller.getProfile);
usersRouter.patch('/profile', controller.updateProfile);
exports.default = usersRouter;
//# sourceMappingURL=users.routes.js.map