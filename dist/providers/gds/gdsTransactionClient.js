"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdsTransactionClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
const logger_1 = require("../../infrastructure/logger");
const gdsAuthClient_1 = require("./gdsAuthClient");
const gdsMockData_1 = require("./gdsMockData");
class GdsTransactionClient {
    client;
    authClient;
    circuitBreaker;
    txLogger = logger_1.logger.child({ module: 'gds-transaction' });
    constructor(circuitBreaker) {
        this.authClient = gdsAuthClient_1.GdsAuthClient.getInstance();
        this.circuitBreaker = circuitBreaker;
        this.client = axios_1.default.create({
            baseURL: env_1.env.GDS_TRANSACTION_BASE_URL,
            timeout: env_1.env.GDS_REQUEST_TIMEOUT_MS,
            headers: {
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });
        this.client.interceptors.request.use(async (config) => {
            const token = await this.authClient.getAccessToken();
            config.headers['access-token'] = token;
            return config;
        });
    }
    async holdSeats(request) {
        const totalFare = request.Passenger.reduce((sum, p) => sum + p.Fare, 0);
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockHoldResponse)(totalFare);
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.post('/ota/HoldSeats', request);
                return response.data;
            }
            catch (err) {
                this.txLogger.error({ err: err.message, request }, 'GDS HoldSeats failed');
                if (env_1.isDevelopment) {
                    this.txLogger.warn('Falling back to mock hold in development');
                    return (0, gdsMockData_1.getMockHoldResponse)(totalFare);
                }
                throw err;
            }
        });
    }
    async bookSeats(holdId, totalFare = 1050) {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockBookResponse)(holdId, totalFare);
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.post('/ota/BookSeats', {
                    HoldId: holdId,
                });
                return response.data;
            }
            catch (err) {
                this.txLogger.error({ err: err.message, holdId }, 'GDS BookSeats failed');
                if (env_1.isDevelopment) {
                    this.txLogger.warn('Falling back to mock book in development');
                    return (0, gdsMockData_1.getMockBookResponse)(holdId, totalFare);
                }
                throw err;
            }
        });
    }
    async checkBookingStatus(holdId) {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockBookingStatus)(holdId);
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.post('/ota/bookingstatusv2', {
                    HoldId: holdId,
                });
                return response.data;
            }
            catch (err) {
                this.txLogger.error({ err: err.message, holdId }, 'GDS bookingstatusv2 failed');
                if (env_1.isDevelopment) {
                    return (0, gdsMockData_1.getMockBookingStatus)(holdId);
                }
                throw err;
            }
        });
    }
    async isCancellable(ticketNo, seatNos) {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockIsCancellable)(ticketNo);
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/IsCancellable', {
                    params: { ticketNo, seatNos },
                });
                return response.data;
            }
            catch (err) {
                this.txLogger.error({ err: err.message, ticketNo, seatNos }, 'GDS IsCancellable failed');
                if (env_1.isDevelopment) {
                    return (0, gdsMockData_1.getMockIsCancellable)(ticketNo);
                }
                throw err;
            }
        });
    }
    async cancelSeats(request) {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockCancelResponse)(787.5, 262.5);
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.post('/ota/CancelSeats', request);
                return response.data;
            }
            catch (err) {
                this.txLogger.error({ err: err.message, request }, 'GDS CancelSeats failed');
                if (env_1.isDevelopment) {
                    return (0, gdsMockData_1.getMockCancelResponse)(787.5, 262.5);
                }
                throw err;
            }
        });
    }
    async getBookingDetails(pnr, ticketNo) {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockBookingDetails)(pnr, ticketNo);
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/BookingDetails', {
                    params: { pnr, ticketNo },
                });
                return response.data;
            }
            catch (err) {
                this.txLogger.error({ err: err.message, pnr, ticketNo }, 'GDS BookingDetails failed');
                if (env_1.isDevelopment) {
                    return (0, gdsMockData_1.getMockBookingDetails)(pnr, ticketNo);
                }
                throw err;
            }
        });
    }
    async getBalance() {
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test')) {
            return (0, gdsMockData_1.getMockBalance)();
        }
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/balance');
                return response.data;
            }
            catch (err) {
                this.txLogger.error({ err: err.message }, 'GDS balance call failed');
                if (env_1.isDevelopment) {
                    return (0, gdsMockData_1.getMockBalance)();
                }
                throw err;
            }
        });
    }
}
exports.GdsTransactionClient = GdsTransactionClient;
//# sourceMappingURL=gdsTransactionClient.js.map