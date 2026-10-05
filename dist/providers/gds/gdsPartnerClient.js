"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdsPartnerClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
const logger_1 = require("../../infrastructure/logger");
const gdsAuthClient_1 = require("./gdsAuthClient");
const gdsMockData_1 = require("./gdsMockData");
class GdsPartnerClient {
    client;
    authClient;
    circuitBreaker;
    partnerLogger = logger_1.logger.child({ module: 'gds-partner' });
    constructor(circuitBreaker) {
        this.authClient = gdsAuthClient_1.GdsAuthClient.getInstance();
        this.circuitBreaker = circuitBreaker;
        this.client = axios_1.default.create({
            baseURL: env_1.env.GDS_PARTNER_BASE_URL,
            timeout: env_1.env.GDS_REQUEST_TIMEOUT_MS,
            headers: {
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });
        // Request interceptor to attach access-token
        this.client.interceptors.request.use(async (config) => {
            const token = await this.authClient.getAccessToken();
            config.headers['access-token'] = token;
            return config;
        });
    }
    async getCityList() {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return gdsMockData_1.MOCK_CITIES;
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/CityList');
                return response.data;
            }
            catch (err) {
                this.partnerLogger.error({ err: err.message }, 'GDS CityList call failed');
                if (env_1.isDevelopment) {
                    this.partnerLogger.warn('Falling back to mock cities data in development');
                    return gdsMockData_1.MOCK_CITIES;
                }
                throw err;
            }
        });
    }
    async searchBuses(params) {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockBuses)(params.fromCityId, params.toCityId, params.journeyDate);
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/Search', {
                    params: {
                        fromCityId: params.fromCityId,
                        toCityId: params.toCityId,
                        journeyDate: params.journeyDate,
                    },
                });
                return response.data;
            }
            catch (err) {
                this.partnerLogger.error({ err: err.message, params }, 'GDS Search call failed');
                if (env_1.isDevelopment) {
                    this.partnerLogger.warn('Falling back to mock bus search results in development');
                    return (0, gdsMockData_1.getMockBuses)(params.fromCityId, params.toCityId, params.journeyDate);
                }
                throw err;
            }
        });
    }
    async getSeatChart(busId) {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockChart)(busId);
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/Chart', {
                    params: { busId },
                });
                return response.data;
            }
            catch (err) {
                this.partnerLogger.error({ err: err.message, busId }, 'GDS Chart call failed');
                if (env_1.isDevelopment) {
                    this.partnerLogger.warn('Falling back to mock seat chart in development');
                    return (0, gdsMockData_1.getMockChart)(busId);
                }
                throw err;
            }
        });
    }
}
exports.GdsPartnerClient = GdsPartnerClient;
//# sourceMappingURL=gdsPartnerClient.js.map