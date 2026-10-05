"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const express_1 = require("express");
const search_controller_1 = require("./search.controller");
const middleware_1 = require("../../app/middleware");
const search_validation_1 = require("./search.validation");
const searchRouter = (0, express_1.Router)();
exports.searchRouter = searchRouter;
const controller = new search_controller_1.SearchController();
searchRouter.get('/', (0, middleware_1.validate)({ query: search_validation_1.searchBusesSchema }), controller.searchBuses);
exports.default = searchRouter;
//# sourceMappingURL=search.routes.js.map