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
            const cities = await this.citiesService.getCities(query);
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