"use strict";
// ---------------------------------------------------------------------------
// Admin System Configuration — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemConfigController = void 0;
const system_config_service_1 = require("./system-config.service");
const utils_1 = require("../../../shared/utils");
class SystemConfigController {
    service = system_config_service_1.SystemConfigService.getInstance();
    getConfigs = async (req, res, next) => {
        try {
            const group = req.query.group;
            const configs = await this.service.getConfigs(group);
            utils_1.ApiResponse.success(res, configs, 'System configurations retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getConfigByKey = async (req, res, next) => {
        try {
            const key = req.params.key;
            const config = await this.service.getConfigByKey(key);
            utils_1.ApiResponse.success(res, config, 'System configuration retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createConfig = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const config = await this.service.createConfig(req.body, adminId);
            utils_1.ApiResponse.created(res, config, 'System configuration created successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateConfig = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const key = req.params.key;
            const config = await this.service.updateConfig(key, req.body, adminId);
            utils_1.ApiResponse.success(res, config, 'System configuration updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    deleteConfig = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const key = req.params.key;
            const result = await this.service.deleteConfig(key, adminId);
            utils_1.ApiResponse.success(res, result, 'System configuration deleted successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getFeatureFlags = async (_req, res, next) => {
        try {
            const flags = await this.service.getFeatureFlags();
            utils_1.ApiResponse.success(res, flags, 'Feature flags retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createFeatureFlag = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const flag = await this.service.createFeatureFlag(req.body, adminId);
            utils_1.ApiResponse.created(res, flag, 'Feature flag created successfully');
        }
        catch (error) {
            next(error);
        }
    };
    toggleFeatureFlag = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const key = req.params.key;
            const flag = await this.service.toggleFeatureFlag(key, req.body, adminId);
            utils_1.ApiResponse.success(res, flag, 'Feature flag updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getDetailedSystemHealth = async (_req, res, next) => {
        try {
            const health = await this.service.getDetailedSystemHealth();
            utils_1.ApiResponse.success(res, health, 'System diagnostics retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.SystemConfigController = SystemConfigController;
//# sourceMappingURL=system-config.controller.js.map