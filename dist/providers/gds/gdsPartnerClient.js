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
const gdsSearchResponse_1 = require("./gdsSearchResponse");
const gdsChartResponse_1 = require("./gdsChartResponse");
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
    /**
     * Mantis GET /ota/CityList
     */
    async getCityList() {
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/CityList');
                const raw = response.data;
                let list = [];
                if (Array.isArray(raw)) {
                    list = raw;
                }
                else if (raw && Array.isArray(raw.data)) {
                    list = raw.data;
                }
                else if (raw && Array.isArray(raw.CityList)) {
                    list = raw.CityList;
                }
                else if (raw && Array.isArray(raw.cities)) {
                    list = raw.cities;
                }
                else if (raw && typeof raw === 'object') {
                    const found = Object.values(raw).find((v) => Array.isArray(v));
                    if (Array.isArray(found)) {
                        list = found;
                    }
                }
                const parsedCities = list
                    .map((item) => ({
                    CityId: Number(item.CityId || item.id || item.cityId || 0),
                    CityName: String(item.City || item.CityName || item.name || '').trim(),
                    State: String(item.State || item.state || '').trim(),
                }))
                    .filter((c) => c.CityId > 0 && c.CityName.length > 0);
                if (parsedCities.length > 0) {
                    return parsedCities;
                }
                throw new Error('CityList returned 0 cities from GDS');
            }
            catch (err) {
                this.partnerLogger.error({ err: err.message }, 'GDS CityList call failed');
                throw err;
            }
        });
    }
    /**
     * Mantis GET /ota/Search
     */
    async searchBuses(params) {
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/Search', {
                    params: {
                        fromCityId: Number(params.fromCityId),
                        toCityId: Number(params.toCityId),
                        journeyDate: params.journeyDate,
                    },
                });
                return (0, gdsSearchResponse_1.parseGdsSearchResponse)(response.data);
            }
            catch (err) {
                this.partnerLogger.error({ err: err.message, params }, 'GDS Search call failed');
                throw err;
            }
        });
    }
    /**
     * Mantis GET /ota/Chart
     */
    async getSeatChart(busId, extraParams) {
        const params = {
            busId: Number(busId),
            ...(extraParams?.fromCityId ? { fromCityId: Number(extraParams.fromCityId) } : {}),
            ...(extraParams?.toCityId ? { toCityId: Number(extraParams.toCityId) } : {}),
            ...(extraParams?.journeyDate ? { journeyDate: extraParams.journeyDate } : {}),
        };
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/Chart', {
                    params,
                });
                return (0, gdsChartResponse_1.parseGdsChartResponse)(response.data, busId);
            }
            catch (err) {
                const providerResponse = err.response?.data;
                const providerError = providerResponse && typeof providerResponse === 'object' && 'Error' in providerResponse
                    ? providerResponse.Error
                    : undefined;
                const errorDetails = providerError && typeof providerError === 'object'
                    ? {
                        code: 'Code' in providerError ? providerError.Code : undefined,
                        message: 'Msg' in providerError ? providerError.Msg : undefined,
                        traceId: 'TraceId' in providerError ? providerError.TraceId : undefined,
                    }
                    : undefined;
                this.partnerLogger.error({
                    err: err.message,
                    status: err.response?.status,
                    params,
                    ...(errorDetails ? { providerError: errorDetails } : {}),
                }, 'GDS Chart call failed');
                throw err;
            }
        });
    }
    /**
     * Mantis GET /ota/SearchBus
     */
    async searchBus(params) {
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/SearchBus', {
                    params: {
                        busId: Number(params.busId),
                        fromCityId: Number(params.fromCityId),
                        toCityId: Number(params.toCityId),
                        journeyDate: params.journeyDate,
                    },
                });
                return (0, gdsSearchResponse_1.parseGdsSearchResponse)(response.data);
            }
            catch (err) {
                this.partnerLogger.error({ err: err.message, params }, 'GDS SearchBus call failed');
                throw err;
            }
        });
    }
}
exports.GdsPartnerClient = GdsPartnerClient;
//# sourceMappingURL=gdsPartnerClient.js.map