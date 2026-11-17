"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const zod_1 = require("zod");
const validation_1 = require("../../app/middleware/validation");
const users_validation_1 = require("./users.validation");
const passengers_service_1 = require("./passengers.service");
const response_1 = require("../../shared/utils/response");
const middleware_1 = require("../../app/middleware");
const usersRouter = (0, express_1.Router)();
exports.usersRouter = usersRouter;
const controller = new users_controller_1.UsersController();
usersRouter.use(middleware_1.authenticate);
usersRouter.get("/profile", controller.getProfile);
usersRouter.patch("/profile", (0, validation_1.validate)({ body: users_validation_1.profileSchema }), controller.updateProfile);
usersRouter.get("/wallet", controller.getWallet);
const passengers = new passengers_service_1.PassengersService();
usersRouter.get("/passengers", (0, validation_1.validate)({ query: zod_1.z.object({}).strict() }), async (req, res, next) => {
    try {
        response_1.ApiResponse.success(res, await passengers.list(req.user.sub), "Passengers retrieved");
    }
    catch (error) {
        next(error);
    }
});
usersRouter.post("/passengers", (0, validation_1.validate)({ body: users_validation_1.passengerSchema }), async (req, res, next) => {
    try {
        const key = req.get("Idempotency-Key");
        if (key && !zod_1.z.string().uuid().safeParse(key).success) {
            res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid Idempotency-Key",
                },
            });
            return;
        }
        response_1.ApiResponse.success(res, await passengers.save(req.user.sub, req.body, undefined, key), "Passenger added");
    }
    catch (error) {
        next(error);
    }
});
usersRouter.patch("/passengers/:id", (0, validation_1.validate)({ params: users_validation_1.passengerParamsSchema, body: users_validation_1.passengerSchema }), async (req, res, next) => {
    try {
        response_1.ApiResponse.success(res, await passengers.save(req.user.sub, req.body, String(req.params.id)), "Passenger updated");
    }
    catch (error) {
        next(error);
    }
});
exports.default = usersRouter;
//# sourceMappingURL=users.routes.js.map