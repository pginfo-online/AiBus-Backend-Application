"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdsTransactionClient = void 0;
exports.buildGdsHoldSeatsPayload = buildGdsHoldSeatsPayload;
const gdsResponseHandling_1 = require("./gdsResponseHandling");
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
const logger_1 = require("../../infrastructure/logger");
const gdsAuthClient_1 = require("./gdsAuthClient");
const errors_1 = require("../../shared/errors");
function buildGdsHoldSeatsPayload(request) {
    const passengers = (request.Passengers || []).map((p) => ({
        Name: p.Name,
        Age: Number(p.Age),
        Gender: p.Gender,
        SeatNo: String(p.SeatNo),
        Fare: Number(p.Fare),
        SeatTypeId: Number(p.SeatTypeId || 1),
        IsAcSeat: Boolean(p.IsAcSeat),
    }));
    return {
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
    };
}
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
            maxRedirects: 0,
            maxContentLength: 16 * 1024 * 1024,
            headers: {
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });
        (0, gdsResponseHandling_1.installGdsResponseHandling)(this.client);
        this.client.interceptors.request.use(async (config) => {
            const token = await this.authClient.getAccessToken();
            config.headers['access-token'] = token;
            return config;
        });
    }
    async holdSeats(request) {
        return this.circuitBreaker.execute(async () => {
            try {
                const payload = buildGdsHoldSeatsPayload(request);
                this.txLogger.info({
                    fromCityId: payload.FromCityId,
                    toCityId: payload.ToCityId,
                    journeyDate: payload.JourneyDate,
                    busId: payload.BusId,
                    pickupId: payload.PickUpID,
                    dropoffId: payload.DropOffID,
                    passengerCount: payload.Passengers.length,
                }, 'Calling Mantis GDS POST /ota/HoldSeats');
                const response = await this.client.post('/ota/HoldSeats', payload);
                const raw = response.data;
                const data = raw?.data || raw;
                const holdId = data?.HoldId ?? data?.holdId;
                if (holdId) {
                    this.txLogger.info({ holdId, status: data?.Status === undefined ? 1 : Number(data.Status) }, 'Mantis GDS HoldSeats succeeded');
                    return {
                        HoldId: holdId,
                        Status: data?.Status === undefined ? 1 : Number(data.Status),
                        Message: data?.Message || 'Seats held successfully',
                        TotalFare: Number(data?.TotalFare || payload.Passengers.reduce((sum, passenger) => sum + passenger.Fare, 0)),
                        ExpiryMinutes: data?.ExpiryMinutes || 10,
                    };
                }
                const msg = data?.Message || data?.Error?.Msg || 'Failed to hold seats with provider';
                throw new errors_1.ProviderError('GDS', msg);
            }
            catch (err) {
                const providerError = err.response?.data?.Error;
                this.txLogger.error({
                    err: err.message,
                    status: err.response?.status,
                    fromCityId: request.FromCityId,
                    toCityId: request.ToCityId,
                    journeyDate: request.JourneyDate,
                    busId: request.BusId,
                    pickupId: request.PickUpID,
                    dropoffId: request.DropOffID,
                    passengerCount: request.Passengers?.length ?? 0,
                    ...(providerError && {
                        providerError: {
                            code: providerError.Code,
                            traceId: providerError.TraceId,
                        },
                    }),
                }, 'GDS HoldSeats failed');
                throw err;
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
                if (data?.TicketNo && data?.PNRNo && (data.Status === undefined || Number(data.Status) === 1)) {
                    return {
                        HoldId: String(data.HoldId || holdId),
                        TicketNo: String(data.TicketNo || data.ticketNo || ''),
                        PNRNo: String(data.PNRNo || data.pnrNo || ''),
                        Status: data.Status === undefined ? (data.TicketNo ? 1 : 0) : Number(data.Status),
                        Message: data.Message || 'Booking confirmed successfully',
                        TotalFare: Number(data.TotalFare || totalFare || 0),
                    };
                }
                const msg = data?.Message || data?.Error?.Msg || 'Failed to book seats with provider';
                throw new errors_1.ProviderError('GDS', msg);
            }
            catch (err) {
                this.txLogger.error({ err: err.message, status: err.response?.status, holdId }, 'GDS BookSeats failed');
                throw err;
            }
        });
    }
    async checkBookingStatus(holdId) {
        return this.circuitBreaker.execute(async () => {
            try {
                const parsedHoldId = isNaN(Number(holdId)) ? holdId : Number(holdId);
                const payload = {
                    HoldId: parsedHoldId,
                };
                this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/bookingstatusv2');
                const response = await this.client.post('/ota/bookingstatusv2', payload);
                const raw = response.data;
                const data = raw?.data || raw;
                this.txLogger.info({ status: data?.Status }, 'Mantis GDS bookingstatusv2 response');
                const status = data?.Status === undefined || data?.Status === null || data?.Status === '' ? NaN : Number(data.Status);
                if (![1, 0, -1, -2].includes(status) || (status === 1 && (!data.TicketNo || !data.PNRNo))) {
                    throw new errors_1.ProviderError('GDS', 'Invalid booking status response');
                }
                return {
                    HoldId: String(data?.HoldId || holdId),
                    Status: status,
                    TicketNo: data?.TicketNo ? String(data.TicketNo) : undefined,
                    PNRNo: data?.PNRNo ? String(data.PNRNo) : undefined,
                    Message: data?.Message || (status === 1 ? 'BOOKING SUCCESSFUL' : 'Booking status retrieved'),
                };
            }
            catch (err) {
                this.txLogger.error({ err: err.message, holdId }, 'GDS bookingstatusv2 failed');
                throw err;
            }
        });
    }
    async isCancellable(ticketNo, seatNos, pnrNo) {
        return this.circuitBreaker.execute(async () => {
            try {
                const cleanTicketNo = String(ticketNo || "").trim();
                const cleanSeatNos = String(seatNos || "").trim();
                const cleanPnrNo = String(pnrNo || "").trim();
                const params = {
                    TicketNo: cleanTicketNo,
                    ticketNo: cleanTicketNo,
                    seatNos: cleanSeatNos,
                    SeatNos: cleanSeatNos,
                };
                if (cleanPnrNo) {
                    params.PNRNo = cleanPnrNo;
                    params.PNR = cleanPnrNo;
                    params.pnrNo = cleanPnrNo;
                }
                this.txLogger.info({ params }, 'Calling Mantis GDS GET /ota/IsCancellable');
                const response = await this.client.get('/ota/IsCancellable', {
                    params,
                });
                const raw = response.data;
                const data = raw?.data || raw;
                const isCancellableBool = data?.IsCancellable === true ||
                    data?.IsCancellable === 'true' ||
                    data?.IsCancellable === 1 ||
                    data?.isCancellable === true ||
                    data?.isCancellable === 'true' ||
                    data?.isCancellable === 1;
                const refundAmt = Number(data?.RefundAmount ?? data?.refundAmount ?? 0);
                const chargeAmt = Number(data?.ChargeAmt ?? data?.chargeAmt ?? data?.CancellationCharge ?? data?.cancellationCharge ?? 0);
                const chargePct = Number(data?.ChargePct ?? data?.chargePct ?? data?.RefundPercentage ?? data?.refundPercentage ?? 0);
                const totalFare = Number(data?.TotalFare ?? data?.totalFare ?? data?.CancSeatsTotalFare ?? 0);
                return {
                    IsCancellable: isCancellableBool,
                    ChargePct: Number.isFinite(chargePct) ? chargePct : 0,
                    ChargeAmt: Number.isFinite(chargeAmt) ? chargeAmt : 0,
                    TotalFare: Number.isFinite(totalFare) ? totalFare : 0,
                    CancSeatsTotalFare: Number(data?.CancSeatsTotalFare ?? data?.cancSeatsTotalFare ?? totalFare),
                    RefundAmount: Number.isFinite(refundAmt) ? refundAmt : 0,
                    Message: data?.Message || data?.message || (isCancellableBool ? 'Cancellability checked successfully' : 'Ticket is not cancellable under operator policy'),
                };
            }
            catch (err) {
                this.txLogger.error({ err: err.message, ticketNo, seatNos, pnrNo }, 'GDS IsCancellable failed');
                throw err;
            }
        });
    }
    async cancelSeats(request) {
        return this.circuitBreaker.execute(async () => {
            try {
                const cleanTicketNo = String(request.TicketNo || "").trim();
                const cleanSeatNos = String(request.SeatNos || "").trim();
                const cleanPnr = String(request.PNR || request.PNRNo || "").trim();
                const payload = {
                    TicketNo: cleanTicketNo,
                    SeatNos: cleanSeatNos,
                    seatNos: cleanSeatNos,
                };
                if (cleanPnr) {
                    payload.PNR = cleanPnr;
                    payload.PNRNo = cleanPnr;
                }
                this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/CancelSeats');
                const response = await this.client.post('/ota/CancelSeats', payload);
                const raw = response.data;
                const data = raw?.data || raw;
                const refundAmt = Number(data?.RefundAmount ?? data?.refundAmount ?? 0);
                const isSuccess = raw?.success === true ||
                    data?.Status === 1 ||
                    data?.status === 1 ||
                    data?.Status === '1' ||
                    Boolean(data?.NewTicketNo) ||
                    (data?.RefundAmount !== undefined && !data?.Error && !data?.error);
                if (!isSuccess || !Number.isFinite(refundAmt) || refundAmt < 0) {
                    const errMsg = data?.Message || data?.message || data?.Error?.Msg || data?.Error?.msg || 'Failed to cancel seats with provider';
                    throw new errors_1.ProviderError('GDS', errMsg);
                }
                const chargeAmt = Number(data?.ChargeAmt ?? data?.chargeAmt ?? data?.CancellationCharge ?? data?.cancellationCharge ?? 0);
                const chargePct = Number(data?.ChargePct ?? data?.chargePct ?? 0);
                const totalFare = Number(data?.TotalFare ?? data?.totalFare ?? 0);
                return {
                    Status: data?.Status === undefined ? 1 : Number(data.Status),
                    NewHoldId: data?.NewHoldId ? String(data.NewHoldId) : undefined,
                    NewTicketNo: data?.NewTicketNo ? String(data.NewTicketNo) : undefined,
                    NewPNRNo: data?.NewPNRNo ? String(data.NewPNRNo) : undefined,
                    NewTotalFare: Number(data?.NewTotalFare ?? 0),
                    ChargeAmt: Number.isFinite(chargeAmt) ? chargeAmt : 0,
                    ChargePct: Number.isFinite(chargePct) ? chargePct : 0,
                    RefundAmount: Number.isFinite(refundAmt) ? refundAmt : 0,
                    CancellationCharge: Number.isFinite(chargeAmt) ? chargeAmt : 0,
                    TotalFare: Number.isFinite(totalFare) ? totalFare : 0,
                    Message: data?.Message || data?.message || 'Seats cancelled successfully',
                };
            }
            catch (err) {
                this.txLogger.error({ err: err.message, request }, 'GDS CancelSeats failed');
                throw err;
            }
        });
    }
    async getBookingDetails(pnr, ticketNo) {
        return this.circuitBreaker.execute(async () => {
            try {
                this.txLogger.info({ pnr, ticketNo }, 'Calling Mantis GDS GET /ota/BookingDetails');
                const response = await this.client.get('/ota/BookingDetails', {
                    params: { PNR: String(pnr), TicketNo: String(ticketNo) },
                });
                const raw = response.data;
                const data = raw?.data || raw;
                return data;
            }
            catch (err) {
                this.txLogger.error({ err: err.message, pnr, ticketNo }, 'GDS BookingDetails failed');
                throw err;
            }
        });
    }
    async getBalance() {
        return this.circuitBreaker.execute(async () => {
            try {
                const response = await this.client.get('/ota/balance');
                const data = response.data?.data;
                if (typeof data?.Balance !== 'number' || !Number.isFinite(data.Balance)) {
                    throw new errors_1.ProviderError('GDS', 'Invalid balance response');
                }
                return { Balance: data.Balance, Currency: 'INR' };
            }
            catch (err) {
                this.txLogger.error({ err: err.message }, 'GDS balance call failed');
                throw err;
            }
        });
    }
}
exports.GdsTransactionClient = GdsTransactionClient;
//# sourceMappingURL=gdsTransactionClient.js.map