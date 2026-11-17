"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoldsService = void 0;
const node_crypto_1 = require("node:crypto");
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
        if (env_1.env.NODE_ENV === 'production' && !(0, redis_1.isRedisAvailable)())
            throw new errors_1.ProviderError('GDS', 'Seat reservations are temporarily unavailable');
        const prisma = (0, database_1.getPrismaClient)();
        const requestId = `hold-${(0, uuid_1.v4)()}`;
        const requestHash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ passengers: input.passengers.map(({ seatNo, name, gender, age }) => ({ seatNo, name, gender, age })).sort((a, b) => a.seatNo.localeCompare(b.seatNo)), pickupId: input.pickupId, dropoffId: input.dropoffId, contact: input.contactInfo, gst: input.gstDetails })).digest('hex');
        const acquiredLocks = [];
        if (new Set(input.passengers.map((p) => p.seatNo)).size !== input.passengers.length) {
            throw new errors_1.SeatUnavailableError('Select each seat only once');
        }
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
            const existingDbHolds = typeof prisma.seatHold.findMany === 'function'
                ? await prisma.seatHold.findMany({
                    where: {
                        busId: input.busId,
                        journeyDate: input.journeyDate,
                        status: client_1.HoldStatus.ACTIVE,
                        expiresAt: { gt: new Date() },
                    },
                })
                : [
                    await prisma.seatHold.findFirst({
                        where: {
                            busId: input.busId,
                            journeyDate: input.journeyDate,
                            status: client_1.HoldStatus.ACTIVE,
                            expiresAt: { gt: new Date() },
                        },
                    }),
                ].filter(Boolean);
            for (const existingDbHold of existingDbHolds) {
                if (!existingDbHold)
                    continue;
                const heldSeats = existingDbHold.seats;
                if (Array.isArray(heldSeats)) {
                    const conflict = input.passengers.some((p) => heldSeats.some((hs) => {
                        const seat = typeof hs === 'string' ? hs : (hs.SeatNo || hs.seatNo);
                        return String(seat) === String(p.seatNo);
                    }));
                    if (conflict) {
                        const context = existingDbHold.passengerContext;
                        const same = userId && existingDbHold.userId === userId && heldSeats.length === input.passengers.length
                            && existingDbHold.passengerContext?.requestHash === requestHash && context?.pickupId === input.pickupId && context?.dropoffId === input.dropoffId
                            && input.passengers.every((p) => heldSeats.some((s) => s.seatNo === p.seatNo && s.name === p.name && s.gender === p.gender && s.age === p.age));
                        if (same)
                            return { id: existingDbHold.id, holdId: existingDbHold.providerHoldId, providerHoldId: existingDbHold.providerHoldId, expiresAt: existingDbHold.expiresAt, ttlSeconds: Math.max(0, Math.floor((existingDbHold.expiresAt.getTime() - Date.now()) / 1000)), totalFare: heldSeats.reduce((sum, s) => sum + Number(s.fare), 0) };
                        throw new errors_1.SeatUnavailableError('One or more of the selected seats are already on hold.');
                    }
                }
            }
            // -----------------------------------------------------------------------
            // Layer 2: Call upstream GDS provider HoldSeats
            // -----------------------------------------------------------------------
            const chart = await this.gdsAdapter.getSeatChart(input.busId, {
                fromCityId: input.fromCityId, toCityId: input.toCityId, journeyDate: input.journeyDate,
            });
            const pickup = chart.BoardingPoints.find((point) => String(point.PickupCode) === input.pickupId);
            const dropoff = chart.DroppingPoints.find((point) => String(point.DropoffCode) === input.dropoffId);
            if ((chart.BoardingPoints.length && !pickup) || (chart.DroppingPoints.length && !dropoff))
                throw new errors_1.SeatUnavailableError('Boarding or dropping point is no longer available');
            const journey = {
                operatorName: chart.CompanyName ?? null, busType: chart.BusTypeName ?? null,
                cancellationPolicy: chart.CancellationPolicy,
                pickupSnapshot: pickup ? { code: pickup.PickupCode, name: pickup.PickupName, time: pickup.PickupTime, address: pickup.Address ?? null, landmark: pickup.Landmark ?? null, contact: pickup.Contact ?? null } : null,
                dropoffSnapshot: dropoff ? { code: dropoff.DropoffCode, name: dropoff.DropoffName, time: dropoff.DropoffTime, address: dropoff.Address ?? null, landmark: dropoff.Landmark ?? null, contact: dropoff.Contact ?? null } : null,
            };
            const layout = new Map(chart.Layout.map((seat) => [seat.seat_no, seat]));
            const passengers = input.passengers.map((passenger) => {
                const seat = layout.get(passenger.seatNo);
                if (!seat || !(seat.seat_status === 1 || (passenger.gender === 'M' && seat.seat_status === 2) || (passenger.gender === 'F' && seat.seat_status === 3))) {
                    throw new errors_1.SeatUnavailableError(`Seat ${passenger.seatNo} is no longer available`);
                }
                return {
                    ...passenger, seatTypeId: seat.seat_type, fare: seat.total_fare,
                    baseFare: seat.base_fare, serviceTax: seat.service_tax,
                };
            });
            const gdsPassengers = passengers.map((p) => ({
                SeatNo: p.seatNo, SeatTypeId: p.seatTypeId, Fare: p.fare, Gender: p.gender,
                Age: p.age, Name: p.name, IsAcSeat: p.isAcSeat,
            }));
            const gdsResponse = await this.gdsAdapter.holdSeats({
                FromCityId: input.fromCityId,
                ToCityId: input.toCityId,
                JourneyDate: input.journeyDate,
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
            });
            if (gdsResponse.Status !== 1 || !gdsResponse.HoldId) {
                throw new errors_1.ProviderError('GDS', gdsResponse.Message || 'Failed to hold seats with provider');
            }
            // -----------------------------------------------------------------------
            // Layer 3: Persist Hold record in database (upsert prevents unique constraint conflicts)
            // -----------------------------------------------------------------------
            const ttlSeconds = Math.min(env_1.env.SEAT_HOLD_TTL_SECONDS, (gdsResponse.ExpiryMinutes ?? 10) * 60);
            const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
            const strHoldId = String(gdsResponse.HoldId);
            const holdRecord = await prisma.seatHold.upsert({
                where: {
                    providerName_providerHoldId: {
                        providerName: 'GDS',
                        providerHoldId: strHoldId,
                    },
                },
                create: {
                    userId: userId ?? null,
                    providerHoldId: strHoldId,
                    providerName: 'GDS',
                    status: client_1.HoldStatus.ACTIVE,
                    fromCityId: input.fromCityId,
                    toCityId: input.toCityId,
                    journeyDate: input.journeyDate,
                    busId: input.busId,
                    seats: passengers,
                    passengerContext: { journey, requestHash, pickupId: input.pickupId, dropoffId: input.dropoffId, state: input.contactInfo.state ?? null, gstDetails: input.gstDetails ?? null },
                    expiresAt,
                },
                update: {
                    userId: userId ?? undefined,
                    status: client_1.HoldStatus.ACTIVE,
                    fromCityId: input.fromCityId,
                    toCityId: input.toCityId,
                    journeyDate: input.journeyDate,
                    busId: input.busId,
                    seats: passengers,
                    passengerContext: { journey, requestHash, pickupId: input.pickupId, dropoffId: input.dropoffId, state: input.contactInfo.state ?? null, gstDetails: input.gstDetails ?? null },
                    expiresAt,
                },
            });
            // -----------------------------------------------------------------------
            // Layer 4: Schedule delayed BullMQ job to expire hold if unpaid
            // -----------------------------------------------------------------------
            try {
                await (0, queues_1.addJob)(constants_1.QueueName.HOLD_EXPIRY_CLEANUP, 'expire-hold', { holdId: holdRecord.id, providerHoldId: strHoldId }, { delay: ttlSeconds * 1000 });
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
                ttlSeconds,
                totalFare: gdsResponse.TotalFare || passengers.reduce((sum, p) => sum + p.fare, 0),
                seats: passengers,
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
    async getHold(holdId, userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(holdId);
        if (!isUuid && !userId)
            throw new errors_1.NotFoundError('Seat hold not found');
        const hold = isUuid
            ? await prisma.seatHold.findUnique({ where: { id: holdId } })
            : await prisma.seatHold.findUnique({
                where: { providerName_providerHoldId: { providerName: 'GDS', providerHoldId: holdId } },
            });
        if (!hold || (hold.userId && hold.userId !== userId) || (!hold.userId && !isUuid)) {
            throw new errors_1.NotFoundError('Seat hold not found');
        }
        return hold;
    }
    async checkHoldStatus(holdId, userId) {
        const hold = await this.getHold(holdId, userId);
        return this.gdsAdapter.checkBookingStatus(hold.providerHoldId);
    }
}
exports.HoldsService = HoldsService;
//# sourceMappingURL=holds.service.js.map