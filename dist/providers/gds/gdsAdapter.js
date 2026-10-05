"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdsAdapter = void 0;
const circuitBreaker_1 = require("../circuitBreaker");
const gdsPartnerClient_1 = require("./gdsPartnerClient");
const gdsTransactionClient_1 = require("./gdsTransactionClient");
const database_1 = require("../../infrastructure/database");
const logger_1 = require("../../infrastructure/logger");
class GdsAdapter {
    static instance;
    circuitBreaker;
    partnerClient;
    transactionClient;
    adapterLogger = logger_1.logger.child({ module: 'gds-adapter' });
    constructor() {
        this.circuitBreaker = new circuitBreaker_1.CircuitBreaker('GDS', {
            failureThreshold: 5,
            failureWindowMs: 60000,
            resetTimeoutMs: 30000,
        });
        this.partnerClient = new gdsPartnerClient_1.GdsPartnerClient(this.circuitBreaker);
        this.transactionClient = new gdsTransactionClient_1.GdsTransactionClient(this.circuitBreaker);
    }
    static getInstance() {
        if (!GdsAdapter.instance) {
            GdsAdapter.instance = new GdsAdapter();
        }
        return GdsAdapter.instance;
    }
    async getCities() {
        return this.partnerClient.getCityList();
    }
    async searchBuses(params) {
        return this.partnerClient.searchBuses(params);
    }
    async getSeatChart(busId) {
        return this.partnerClient.getSeatChart(busId);
    }
    async holdSeats(params) {
        const start = Date.now();
        let errorMsg;
        let res;
        try {
            res = await this.transactionClient.holdSeats(params);
            return res;
        }
        catch (err) {
            errorMsg = err.message;
            throw err;
        }
        finally {
            this.recordTransaction('HoldSeats', params, res, Date.now() - start, errorMsg);
        }
    }
    async bookSeats(holdId, totalFare = 1050) {
        const start = Date.now();
        let errorMsg;
        let res;
        try {
            res = await this.transactionClient.bookSeats(holdId, totalFare);
            return res;
        }
        catch (err) {
            errorMsg = err.message;
            throw err;
        }
        finally {
            this.recordTransaction('BookSeats', { holdId }, res, Date.now() - start, errorMsg);
        }
    }
    async checkBookingStatus(holdId) {
        const start = Date.now();
        let errorMsg;
        let res;
        try {
            res = await this.transactionClient.checkBookingStatus(holdId);
            return res;
        }
        catch (err) {
            errorMsg = err.message;
            throw err;
        }
        finally {
            this.recordTransaction('BookingStatus', { holdId }, res, Date.now() - start, errorMsg);
        }
    }
    async isCancellable(ticketNo, seatNos) {
        return this.transactionClient.isCancellable(ticketNo, seatNos);
    }
    async cancelSeats(params) {
        const start = Date.now();
        let errorMsg;
        let res;
        try {
            res = await this.transactionClient.cancelSeats(params);
            return res;
        }
        catch (err) {
            errorMsg = err.message;
            throw err;
        }
        finally {
            this.recordTransaction('CancelSeats', params, res, Date.now() - start, errorMsg);
        }
    }
    async getBookingDetails(pnr, ticketNo) {
        return this.transactionClient.getBookingDetails(pnr, ticketNo);
    }
    async getBalance() {
        return this.transactionClient.getBalance();
    }
    getCircuitBreakerState() {
        return this.circuitBreaker.getState();
    }
    /**
     * Asynchronously audit-logs provider transactions without blocking response pipeline
     */
    async recordTransaction(operation, requestPayload, responsePayload, durationMs, errorMessage) {
        try {
            const prisma = (0, database_1.getPrismaClient)();
            await prisma.providerTransaction.create({
                data: {
                    providerName: 'GDS',
                    operation,
                    requestPayload: requestPayload ?? {},
                    responsePayload: responsePayload ?? {},
                    responseStatus: responsePayload?.Status ?? (errorMessage ? 500 : 200),
                    durationMs,
                    errorMessage,
                    requestId: `gds-tx-${Date.now()}`,
                },
            });
        }
        catch (err) {
            this.adapterLogger.warn({ err }, 'Could not record provider transaction audit row');
        }
    }
}
exports.GdsAdapter = GdsAdapter;
//# sourceMappingURL=gdsAdapter.js.map