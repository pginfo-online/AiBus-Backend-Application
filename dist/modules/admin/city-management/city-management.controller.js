"use strict";
// ---------------------------------------------------------------------------
// Admin City Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.CityManagementController = void 0;
const city_management_service_1 = require("./city-management.service");
const utils_1 = require("../../../shared/utils");
class CityManagementController {
    service = city_management_service_1.CityManagementService.getInstance();
    listCities = async (req, res, next) => {
        try {
            const result = await this.service.listCities(req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Cities retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getCityById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const city = await this.service.getCityById(id);
            utils_1.ApiResponse.success(res, city, 'City details retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createCity = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const city = await this.service.createCity(req.body, adminId);
            utils_1.ApiResponse.created(res, city, 'City created successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateCity = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const city = await this.service.updateCity(id, req.body, adminId);
            utils_1.ApiResponse.success(res, city, 'City updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    deactivateCity = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const city = await this.service.deactivateCity(id, adminId);
            utils_1.ApiResponse.success(res, city, 'City deactivated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    syncCities = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const result = await this.service.syncCities(adminId);
            utils_1.ApiResponse.success(res, result, 'Cities synced from provider successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CityManagementController = CityManagementController;
//# sourceMappingURL=city-management.controller.js.map