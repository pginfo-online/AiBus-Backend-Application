"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesController = void 0;
const cities_service_1 = require("./cities.service");
const response_1 = require("../../shared/utils/response");
class CitiesController {
    citiesService;
    constructor() {
        this.citiesService = cities_service_1.CitiesService.getInstance();
    }
    getCities = async (req, res, next) => {
        try {
            const query = typeof req.query.q === 'string' ? req.query.q : undefined;
            const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100) : undefined;
            const popular = req.query.popular === 'true' || req.query.popular === '1';
            const cities = await this.citiesService.getCities(query, limit, popular);
            response_1.ApiResponse.success(res, cities);
        }
        catch (error) {
            next(error);
        }
    };
    syncCities = async (_req, res, next) => {
        try {
            const count = await this.citiesService.syncCities();
            response_1.ApiResponse.success(res, { count }, 'Cities synced successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CitiesController = CitiesController;
//# sourceMappingURL=cities.controller.js.map