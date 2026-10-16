"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const search_service_1 = require("./search.service");
const response_1 = require("../../shared/utils/response");
class SearchController {
    searchService;
    constructor() {
        this.searchService = search_service_1.SearchService.getInstance();
    }
    searchBuses = async (req, res, next) => {
        try {
            const result = await this.searchService.searchBuses(req.query);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    searchSingleBus = async (req, res, next) => {
        try {
            const result = await this.searchService.searchSingleBus(req.query);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.SearchController = SearchController;
//# sourceMappingURL=search.controller.js.map