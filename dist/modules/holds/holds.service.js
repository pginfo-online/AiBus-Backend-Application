"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoldsService = void 0;
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const database_1 = require("../../infrastructure/database");
const redis_1 = require("../../infrastructure/redis");
const queues_1 = require("../../infrastructure/queues");
const constants_1 = require("../../shared/constants");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const client_1 = require("@prisma/client");
class HoldsService {
    static instance;
    gdsAdapter;
    holdsLogger = logger_1.logger.child({ module: 'holds-service' });
    constructor() {
        this.gdsAdapter = gdsAdapter_1.GdsAdapter.getInstance();
    }
    static getInstance() {
        if (!HoldsService.instance) {
            HoldsService.instance = new HoldsService();
        }
        return HoldsService.instance;
    }
    async holdSeats(input, userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const requestId = `hold-${(0, uuid_1.v4)()}`;
        const acquiredLocks = [];
        this.holdsLogger.info({ busId: input.busId, journeyDate: input.journeyDate, seats: input.passengers.map((p) => p.seatNo) }, 'Attempting seat hold...');
        // -------------------------------------------------------------------------
        // Layer 1: Acquire Redis Distributed Locks for all requested seats
        // -------------------------------------------------------------------------
        try {
            for (const p of input.passengers) {
                const lockKey = `${constants_1.RedisPrefix.LOCK_SEAT}gds:${input.busId}:${input.journeyDate}:${p.seatNo}`;
                const acquired = await (0, redis_1.acquireLock)(lockKey, requestId, env_1.env.SEAT_LOCK_TTL_SECONDS);
                if (!acquired) {
                    throw new errors_1.SeatUnavailableError(`Seat ${p.seatNo} is currently being booked by another customer. Please select another seat.`);
                }
                acquiredLocks.push(lockKey);
            }
            // Check for active holds in DB as an extra guarantee
            const existingDbHold = await prisma.seatHold.findFirst({
                where: {
                    busId: input.busId,
                    journeyDate: input.journeyDate,
                    status: client_1.HoldStatus.ACTIVE,
                    expiresAt: { gt: new Date() },
                },
            });
            if (existingDbHold) {
                const heldSeats = existingDbHold.seats;
                const conflict = input.passengers.some((p) => heldSeats.some((hs) => (typeof hs === 'string' ? hs === p.seatNo : hs.SeatNo === p.seatNo)));
                if (conflict) {
                    throw new errors_1.SeatUnavailableError('One or more of the selected seats are already on hold.');
                }
            }
            // -----------------------------------------------------------------------
            // Layer 2: Call upstream GDS provider HoldSeats
            // -----------------------------------------------------------------------
            const gdsPassengers = input.passengers.map((p) => ({
                SeatNo: p.seatNo,
                SeatTypeId: p.seatTypeId,
                Fare: p.fare,
                Gender: p.gender,
                Age: p.age,
                Name: p.name,
                IsAcSeat: p.isAcSeat,
            }));
            const gdsResponse = await this.gdsAdapter.holdSeats({
                FromCityId: input.fromCityId,
                ToCityId: input.toCityId,
                JourneyDate: `${input.journeyDate}T00:00:00.000Z`,
                BusId: input.busId,
                PickUpID: input.pickupId,
                DropOffID: input.dropoffId,
                ContactInfo: {
                    CustomerName: input.contactInfo.customerName,
                    Email: input.contactInfo.email,
                    Phone: input.contactInfo.phone,
                    Mobile: input.contactInfo.mobile,
                },
                GSTDetails: input.gstDetails
                    ? {
                        Gstin: input.gstDetails.gstin,
                        GstCompany: input.gstDetails.gstCompany,
                    }
                    : undefined,
                Passengers: gdsPassengers,
                Passenger: gdsPassengers,
            });
            if (gdsResponse.Status !== 1 || !gdsResponse.HoldId) {
                throw new errors_1.ProviderError('GDS', gdsResponse.Message || 'Failed to hold seats with provider');
            }
            // -----------------------------------------------------------------------
            // Layer 3: Persist Hold record in database
            // -----------------------------------------------------------------------
            const expiresAt = new Date(Date.now() + env_1.env.SEAT_HOLD_TTL_SECONDS * 1000);
            const strHoldId = String(gdsResponse.HoldId);
            const holdRecord = await prisma.seatHold.create({
                data: {
                    userId: userId ?? null,
                    providerHoldId: strHoldId,
                    providerName: 'GDS',
                    status: client_1.HoldStatus.ACTIVE,
                    fromCityId: input.fromCityId,
                    toCityId: input.toCityId,
                    journeyDate: input.journeyDate,
                    busId: input.busId,
                    seats: input.passengers,
                    expiresAt,
                },
            });
            // -----------------------------------------------------------------------
            // Layer 4: Schedule delayed BullMQ job to expire hold if unpaid
            // -----------------------------------------------------------------------
            try {
                await (0, queues_1.addJob)(constants_1.QueueName.HOLD_EXPIRY_CLEANUP, 'expire-hold', { holdId: holdRecord.id, providerHoldId: strHoldId }, { delay: env_1.env.SEAT_HOLD_TTL_SECONDS * 1000 });
            }
            catch (queueErr) {
                this.holdsLogger.warn({ queueErr }, 'Failed to enqueue hold expiry cleanup job');
            }
            this.holdsLogger.info({ holdId: holdRecord.id, providerHoldId: strHoldId, expiresAt }, 'Seats successfully held');
            return {
                id: holdRecord.id,
                holdId: strHoldId,
                providerHoldId: strHoldId,
                expiresAt,
                ttlSeconds: env_1.env.SEAT_HOLD_TTL_SECONDS,
                totalFare: gdsResponse.TotalFare || input.passengers.reduce((sum, p) => sum + p.fare, 0),
                seats: input.passengers,
            };
        }
        finally {
            // Release Layer 1 distributed advisory locks
            for (const lockKey of acquiredLocks) {
                try {
                    await (0, redis_1.releaseLock)(lockKey, requestId);
                }
                catch (releaseErr) {
                    this.holdsLogger.warn({ releaseErr, lockKey }, 'Failed to release seat lock');
                }
            }
        }
    }
    async getHold(holdId) {
        const prisma = (0, database_1.getPrismaClient)();
        return prisma.seatHold.findUnique({
            where: { id: holdId },
        });
    }
}
exports.HoldsService = HoldsService;
//# sourceMappingURL=holds.service.js.map