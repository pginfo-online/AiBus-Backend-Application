"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holdsRouter = void 0;
const express_1 = require("express");
const holds_controller_1 = require("./holds.controller");
const middleware_1 = require("../../app/middleware");
const holds_validation_1 = require("./holds.validation");
const holdsRouter = (0, express_1.Router)();
exports.holdsRouter = holdsRouter;
const controller = new holds_controller_1.HoldsController();
// Optional auth allows both guests and authenticated users to hold seats
holdsRouter.post('/', middleware_1.optionalAuth, (0, middleware_1.validate)({ body: holds_validation_1.holdSeatsSchema }), controller.holdSeats);
holdsRouter.get('/:id', controller.getHold);
exports.default = holdsRouter;
//# sourceMappingURL=holds.routes.js.map