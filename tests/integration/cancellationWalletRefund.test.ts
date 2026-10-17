import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from '../mocks/prismaMock';

const prismaMock = createPrismaMock();

vi.mock('../../src/infrastructure/database', () => ({
  getPrismaClient: () => prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
  checkDatabaseHealth: vi.fn().mockResolvedValue(true),
}));

import { createApp } from '../../src/app';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

describe('Cancellation Wallet Refund Integration Tests', () => {
  const app = createApp();
  const testUserId = '00000000-0000-0000-0000-000000000001';

  const authToken = jwt.sign(
    {
      sub: testUserId,
      email: 'passenger@aibus.com',
      role: 'CUSTOMER',
      jti: 'test-jti',
    },
    env.JWT_ACCESS_SECRET,
    { issuer: env.JWT_ISSUER, expiresIn: '1h' }
  );

  it('Step 1: Complete booking lifecycle and cancel with wallet credit', async () => {
    // 1. Hold seats
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-11-20',
        busId: 6901,
        pickupId: 'P1',
        dropoffId: 'D1',
        contactInfo: {
          customerName: 'Madhav More',
          email: 'passenger@aibus.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [
          {
            seatNo: '1U',
            seatTypeId: 2,
            fare: 471.45,
            gender: 'M',
            age: 22,
            name: 'Madhav More',
            isAcSeat: true,
          },
        ],
      });

    expect(holdRes.status).toBe(201);
    const holdId = holdRes.body.data.holdId;

    // 2. Create booking
    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        holdId,
        fromCityId: 4292,
        toCityId: 4562,
        fromCityName: 'Pune',
        toCityName: 'Latur',
        journeyDate: '2026-11-20',
        busId: 6901,
        tripId: 'TRIP-101',
        pickupCode: 'P1',
        pickupLocation: 'Opp. Chandani Chowk Bus Stop',
        pickupTime: '22:25',
        dropoffCode: 'D1',
        dropoffLocation: 'Gandhi Square',
        dropoffTime: '07:30',
        operatorName: 'Sangitam Travels',
        busType: 'A/C Sleeper (2+1)',
        totalFare: 471.45,
        baseFare: 400.0,
        serviceTax: 71.45,
        contactName: 'Madhav More',
        contactEmail: 'passenger@aibus.com',
        contactPhone: '9876543210',
        passengers: [
          {
            seatNo: '1U',
            seatTypeId: 2,
            fare: 471.45,
            gender: 'M',
            age: 22,
            name: 'Madhav More',
            isAcSeat: true,
          },
        ],
      });

    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent and verify to confirm booking
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bookingId,
        gateway: 'PHONEPE',
      });
    expect(intentRes.status).toBe(201);
    const merchantTxnId = intentRes.body.data.merchantTxnId;

    const verifyRes = await request(app)
      .post('/api/v1/payments/verify')
      .send({
        bookingId,
        merchantTxnId,
        gatewayOrderId: 'ORDER-WALLET-001',
        gatewayPaymentId: 'PAY-WALLET-001',
      });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.booking.status).toBe('CONFIRMED');

    // 4. Check cancellability
    const checkRes = await request(app).get(`/api/v1/cancellations/${bookingId}/check`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.data.IsCancellable).toBe(true);

    // 5. Cancel with refundToWallet: true
    const cancelRes = await request(app)
      .post(`/api/v1/cancellations/${bookingId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        seatNos: ['1U'],
        reason: 'Change of plans - refund to wallet',
        refundToWallet: true,
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.cancellation.status).toBe('COMPLETED');
    expect(cancelRes.body.data.refund.status).toBe('COMPLETED');
    expect(cancelRes.body.data.refund.destination).toBe('WALLET');
    expect(cancelRes.body.data.walletCredited).toBe(true);

    // 6. Query ticket to ensure status updated to CANCELLED
    const ticketRes = await request(app).get(`/api/v1/tickets/booking/${bookingId}`);
    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.data.status).toBe('CANCELLED');

    // 7. Check user wallet endpoint
    const walletRes = await request(app)
      .get('/api/v1/users/wallet')
      .set('Authorization', `Bearer ${authToken}`);
    expect(walletRes.status).toBe(200);
    expect(walletRes.body.success).toBe(true);
    expect(walletRes.body.data).toHaveProperty('walletBalance');
    expect(walletRes.body.data).toHaveProperty('transactions');
  });
});
