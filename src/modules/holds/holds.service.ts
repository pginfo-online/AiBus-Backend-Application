import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { getPrismaClient } from '../../infrastructure/database';
import { acquireLock, releaseLock } from '../../infrastructure/redis';
import { addJob } from '../../infrastructure/queues';
import { RedisPrefix, QueueName } from '../../shared/constants';
import { SeatUnavailableError, ProviderError } from '../../shared/errors';
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
      const existingDbHold = await prisma.seatHold.findFirst({
        where: {
          busId: input.busId,
          journeyDate: input.journeyDate,
          status: HoldStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingDbHold) {
        const heldSeats = existingDbHold.seats as any[];
        const conflict = input.passengers.some((p) =>
          heldSeats.some((hs) => (typeof hs === 'string' ? hs === p.seatNo : hs.SeatNo === p.seatNo))
        );
        if (conflict) {
          throw new SeatUnavailableError('One or more of the selected seats are already on hold.');
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
        Passenger: gdsPassengers,
      });

      if (gdsResponse.Status !== 1) {
        throw new ProviderError('GDS', gdsResponse.Message || 'Failed to hold seats with provider');
      }

      // -----------------------------------------------------------------------
      // Layer 3: Persist Hold record in database
      // -----------------------------------------------------------------------
      const expiresAt = new Date(Date.now() + env.SEAT_HOLD_TTL_SECONDS * 1000);

      const holdRecord = await prisma.seatHold.create({
        data: {
          userId: userId ?? null,
          providerHoldId: gdsResponse.HoldId,
          providerName: 'GDS',
          status: HoldStatus.ACTIVE,
          fromCityId: input.fromCityId,
          toCityId: input.toCityId,
          journeyDate: input.journeyDate,
          busId: input.busId,
          seats: input.passengers as any,
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
          { holdId: holdRecord.id, providerHoldId: gdsResponse.HoldId },
          { delay: env.SEAT_HOLD_TTL_SECONDS * 1000 }
        );
      } catch (queueErr) {
        this.holdsLogger.warn({ queueErr }, 'Failed to enqueue hold expiry cleanup job');
      }

      this.holdsLogger.info(
        { holdId: holdRecord.id, providerHoldId: gdsResponse.HoldId, expiresAt },
        'Seats successfully held'
      );

      return {
        id: holdRecord.id,
        providerHoldId: gdsResponse.HoldId,
        expiresAt,
        ttlSeconds: env.SEAT_HOLD_TTL_SECONDS,
        totalFare: gdsResponse.TotalFare,
        seats: input.passengers,
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

  public async getHold(holdId: string) {
    const prisma = getPrismaClient();
    return prisma.seatHold.findUnique({
      where: { id: holdId },
    });
  }
}
