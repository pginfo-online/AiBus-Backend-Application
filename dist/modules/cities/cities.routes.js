"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citiesRouter = void 0;
const express_1 = require("express");
const cities_controller_1 = require("./cities.controller");
const middleware_1 = require("../../app/middleware");
const client_1 = require("@prisma/client");
const citiesRouter = (0, express_1.Router)();
exports.citiesRouter = citiesRouter;
const controller = new cities_controller_1.CitiesController();
// Public: get cities list
citiesRouter.get('/', controller.getCities);
// Admin only: trigger provider sync
citiesRouter.post('/sync', middleware_1.authenticate, (0, middleware_1.authorize)(client_1.UserRole.ADMIN, client_1.UserRole.SUPER_ADMIN), controller.syncCities);
exports.default = citiesRouter;
//# sourceMappingURL=cities.routes.js.map