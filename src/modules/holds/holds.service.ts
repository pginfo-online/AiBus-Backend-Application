import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { getPrismaClient } from '../../infrastructure/database';
import { acquireLock, releaseLock } from '../../infrastructure/redis';
import { addJob } from '../../infrastructure/queues';
import { RedisPrefix, QueueName } from '../../shared/constants';
import { SeatUnavailableError, ProviderError, NotFoundError } from '../../shared/errors';
import { logger } from '../../infrastructure/logger';
import { HoldSeatsInput } from './holds.validation';
import { HoldStatus } from '@prisma/client';

export class HoldsService {
  private static instance: HoldsService;
  private gdsAdapter: GdsAdapter;
  private holdsLogger = logger.child({ module: 'holds-service' });

  private constructor() {
    this.gdsAdapter = GdsAdapter.getInstance();
  }

  public static getInstance(): HoldsService {
    if (!HoldsService.instance) {
      HoldsService.instance = new HoldsService();
    }
    return HoldsService.instance;
  }

  public async holdSeats(input: HoldSeatsInput, userId?: string) {
    const prisma = getPrismaClient();
    const requestId = `hold-${uuidv4()}`;
    const acquiredLocks: string[] = [];
    if (new Set(input.passengers.map((p) => p.seatNo)).size !== input.passengers.length) {
      throw new SeatUnavailableError('Select each seat only once');
    }

    this.holdsLogger.info(
      { busId: input.busId, journeyDate: input.journeyDate, seats: input.passengers.map((p) => p.seatNo) },
      'Attempting seat hold...'
    );

    // -------------------------------------------------------------------------
    // Layer 1: Acquire Redis Distributed Locks for all requested seats
    // -------------------------------------------------------------------------
    try {
      for (const p of input.passengers) {
        const lockKey = `${RedisPrefix.LOCK_SEAT}gds:${input.busId}:${input.journeyDate}:${p.seatNo}`;
        const acquired = await acquireLock(lockKey, requestId, env.SEAT_LOCK_TTL_SECONDS);

        if (!acquired) {
          throw new SeatUnavailableError(
            `Seat ${p.seatNo} is currently being booked by another customer. Please select another seat.`
          );
        }
        acquiredLocks.push(lockKey);
      }

      // Check for active holds in DB as an extra guarantee
      const existingDbHolds =
        typeof prisma.seatHold.findMany === 'function'
          ? await prisma.seatHold.findMany({
              where: {
                busId: input.busId,
                journeyDate: input.journeyDate,
                status: HoldStatus.ACTIVE,
                expiresAt: { gt: new Date() },
              },
            })
          : [
              await prisma.seatHold.findFirst({
                where: {
                  busId: input.busId,
                  journeyDate: input.journeyDate,
                  status: HoldStatus.ACTIVE,
                  expiresAt: { gt: new Date() },
                },
              }),
            ].filter(Boolean);

      for (const existingDbHold of existingDbHolds) {
        if (!existingDbHold) continue;
        if (userId && existingDbHold.userId === userId) {
          continue;
        }
        const heldSeats = existingDbHold.seats as any[];
        if (Array.isArray(heldSeats)) {
          const conflict = input.passengers.some((p) =>
            heldSeats.some((hs) => {
              const seat = typeof hs === 'string' ? hs : (hs.SeatNo || hs.seatNo);
              return String(seat) === String(p.seatNo);
            })
          );
          if (conflict) {
            throw new SeatUnavailableError('One or more of the selected seats are already on hold.');
          }
        }
      }

      // -----------------------------------------------------------------------
      // Layer 2: Call upstream GDS provider HoldSeats
      // -----------------------------------------------------------------------
      const chart = await this.gdsAdapter.getSeatChart(input.busId, {
        fromCityId: input.fromCityId, toCityId: input.toCityId, journeyDate: input.journeyDate,
      });
      const layout = new Map(chart.Layout.map((seat) => [seat.seat_no, seat]));
      const passengers = input.passengers.map((passenger) => {
        const seat = layout.get(passenger.seatNo);
        if (!seat || ![1, passenger.gender === 'M' ? 2 : 3].includes(seat.seat_status)) {
          throw new SeatUnavailableError(`Seat ${passenger.seatNo} is no longer available`);
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
        throw new ProviderError('GDS', gdsResponse.Message || 'Failed to hold seats with provider');
      }

      // -----------------------------------------------------------------------
      // Layer 3: Persist Hold record in database (upsert prevents unique constraint conflicts)
      // -----------------------------------------------------------------------
      const ttlSeconds = Math.min(env.SEAT_HOLD_TTL_SECONDS, (gdsResponse.ExpiryMinutes ?? 10) * 60);
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
          status: HoldStatus.ACTIVE,
          fromCityId: input.fromCityId,
          toCityId: input.toCityId,
          journeyDate: input.journeyDate,
          busId: input.busId,
          seats: passengers,
          expiresAt,
        },
        update: {
          userId: userId ?? undefined,
          status: HoldStatus.ACTIVE,
          fromCityId: input.fromCityId,
          toCityId: input.toCityId,
          journeyDate: input.journeyDate,
          busId: input.busId,
          seats: passengers,
          expiresAt,
        },
      });

      // -----------------------------------------------------------------------
      // Layer 4: Schedule delayed BullMQ job to expire hold if unpaid
      // -----------------------------------------------------------------------
      try {
        await addJob(
          QueueName.HOLD_EXPIRY_CLEANUP,
          'expire-hold',
          { holdId: holdRecord.id, providerHoldId: strHoldId },
          { delay: ttlSeconds * 1000 }
        );
      } catch (queueErr) {
        this.holdsLogger.warn({ queueErr }, 'Failed to enqueue hold expiry cleanup job');
      }

      this.holdsLogger.info(
        { holdId: holdRecord.id, providerHoldId: strHoldId, expiresAt },
        'Seats successfully held'
      );

      return {
        id: holdRecord.id,
        holdId: strHoldId,
        providerHoldId: strHoldId,
        expiresAt,
        ttlSeconds,
        totalFare: gdsResponse.TotalFare || passengers.reduce((sum, p) => sum + p.fare, 0),
        seats: passengers,
      };
    } finally {
      // Release Layer 1 distributed advisory locks
      for (const lockKey of acquiredLocks) {
        try {
          await releaseLock(lockKey, requestId);
        } catch (releaseErr) {
          this.holdsLogger.warn({ releaseErr, lockKey }, 'Failed to release seat lock');
        }
      }
    }
  }

  public async getHold(holdId: string, userId?: string) {
    const prisma = getPrismaClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(holdId);
    if (!isUuid && !userId) throw new NotFoundError('Seat hold not found');
    const hold = isUuid
      ? await prisma.seatHold.findUnique({ where: { id: holdId } })
      : await prisma.seatHold.findUnique({
          where: { providerName_providerHoldId: { providerName: 'GDS', providerHoldId: holdId } },
        });
    if (!hold || (hold.userId && hold.userId !== userId) || (!hold.userId && !isUuid)) {
      throw new NotFoundError('Seat hold not found');
    }
    return hold;
  }

  public async checkHoldStatus(holdId: string, userId?: string) {
    const hold = await this.getHold(holdId, userId);
    return this.gdsAdapter.checkBookingStatus(hold.providerHoldId);
  }
}
