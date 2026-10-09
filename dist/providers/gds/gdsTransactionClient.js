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
const errors_1 = require("../../shared/errors");
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
        return this.circuitBreaker.execute(async () => {
            try {
                const passengers = (request.Passengers || request.Passenger || []).map((p) => ({
                    Name: p.Name,
                    Age: Number(p.Age),
                    Gender: p.Gender,
                    SeatNo: String(p.SeatNo),
                    Fare: Number(p.Fare),
                    SeatTypeId: Number(p.SeatTypeId || 1),
                    IsAcSeat: Boolean(p.IsAcSeat),
                }));
                const payload = {
                    FromCityId: Number(request.FromCityId),
                    ToCityId: Number(request.ToCityId),
                    JourneyDate: request.JourneyDate,
                    BusId: Number(request.BusId),
                    PickUpID: String(request.PickUpID),
                    DropOffID: String(request.DropOffID),
                    ContactInfo: {
                        CustomerName: request.ContactInfo.CustomerName,
                        Email: request.ContactInfo.Email,
                        Phone: request.ContactInfo.Phone,
                        Mobile: request.ContactInfo.Mobile,
                    },
                    ...(request.GSTDetails && { GSTDetails: request.GSTDetails }),
                    Passengers: passengers,
                    Passenger: passengers,
                };
                this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/HoldSeats');
                const response = await this.client.post('/ota/HoldSeats', payload);
                const raw = response.data;
                const data = raw?.data || raw;
                this.txLogger.info({ response: data }, 'Mantis GDS HoldSeats Response');
                const holdId = data?.HoldId ?? data?.holdId;
                if (holdId) {
                    return {
                        HoldId: holdId,
                        Status: data?.Status ?? 1,
                        Message: data?.Message || 'Seats held successfully',
                        TotalFare: Number(data?.TotalFare || passengers.reduce((sum, p) => sum + p.Fare, 0)),
                        ExpiryMinutes: data?.ExpiryMinutes || 10,
                    };
                }
                const msg = data?.Message || data?.Error?.Msg || 'Failed to hold seats with provider';
                throw new errors_1.ProviderError('GDS', msg);
            }
            catch (err) {
                if (err instanceof errors_1.ProviderError)
                    throw err;
                const errorData = err.response?.data;
                const gdsMsg = errorData?.Error?.Msg ||
                    errorData?.Message ||
                    errorData?.message ||
                    errorData?.data?.Message ||
                    (typeof errorData === 'string' ? errorData : null) ||
                    err.message ||
                    'Failed to hold seats with provider';
                this.txLogger.error({ err: err.message, status: err.response?.status, errorData, request }, 'GDS HoldSeats failed');
                throw new errors_1.ProviderError('GDS', gdsMsg);
            }
        });
    }
    async bookSeats(holdId, totalFare) {
        return this.circuitBreaker.execute(async () => {
            try {
                const parsedHoldId = isNaN(Number(holdId)) ? holdId : Number(holdId);
                const payload = {
                    HoldId: parsedHoldId,
                };
                this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/BookSeats');
                const response = await this.client.post('/ota/BookSeats', payload);
                const raw = response.data;
                const data = raw?.data || raw;
                this.txLogger.info({ response: data }, 'Mantis GDS BookSeats Response');
                if (data && (data.TicketNo || data.PNRNo || data.HoldId)) {
                    return {
                        HoldId: String(data.HoldId || holdId),
                        TicketNo: String(data.TicketNo || data.ticketNo || ''),
                        PNRNo: String(data.PNRNo || data.pnrNo || ''),
                        Status: data.Status ?? (data.TicketNo ? 1 : 0),
                        Message: data.Message || 'Booking confirmed successfully',
                        TotalFare: Number(data.TotalFare || totalFare || 0),
                    };
                }
                const msg = data?.Message || data?.Error?.Msg || 'Failed to book seats with provider';
                throw new errors_1.ProviderError('GDS', msg);
            }
            catch (err) {
                if (err instanceof errors_1.ProviderError)
                    throw err;
                const errorData = err.response?.data;
                const gdsMsg = errorData?.Error?.Msg ||
                    errorData?.Message ||
                    errorData?.message ||
                    errorData?.data?.Message ||
                    (typeof errorData === 'string' ? errorData : null) ||
                    err.message ||
                    'Failed to book seats with provider';
                this.txLogger.error({ err: err.message, status: err.response?.status, errorData, holdId }, 'GDS BookSeats failed');
                throw new errors_1.ProviderError('GDS', gdsMsg);
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