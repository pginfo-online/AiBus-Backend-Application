"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seatsRouter = void 0;
const express_1 = require("express");
const seats_controller_1 = require("./seats.controller");
const seatsRouter = (0, express_1.Router)();
exports.seatsRouter = seatsRouter;
const controller = new seats_controller_1.SeatsController();
seatsRouter.get('/:busId/chart', controller.getSeatChart);
exports.default = seatsRouter;
//# sourceMappingURL=seats.routes.js.map