import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createPrismaMock } from '../mocks/prismaMock';
import { env } from '../../src/config/env';

const prismaMock = createPrismaMock();

vi.mock('../../src/infrastructure/database', () => ({
  getPrismaClient: () => prismaMock,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
  checkDatabaseHealth: vi.fn().mockResolvedValue(true),
}));

import { createApp } from '../../src/app';

describe('PhonePe Webhook Integration Tests (Success & Reject)', () => {
  const app = createApp();
  const saltKey = env.PHONEPE_CLIENT_SECRET;
  const saltIndex = env.PHONEPE_CLIENT_VERSION || '1';

  const authToken = jwt.sign(
    {
      sub: '00000000-0000-0000-0000-000000000001',
      email: 'webhook.test@example.com',
      role: 'CUSTOMER',
      jti: 'test-token-id',
    },
    env.JWT_ACCESS_SECRET,
    { issuer: env.JWT_ISSUER, expiresIn: '1h' }
  );

  function createWebhookPayload(payloadObj: any) {
    const jsonStr = JSON.stringify(payloadObj);
    const base64Response = Buffer.from(jsonStr).toString('base64');
    const hash = crypto.createHash('sha256').update(base64Response + saltKey).digest('hex');
    const xVerify = `${hash}###${saltIndex}`;
    return {
      body: { response: base64Response },
      xVerify,
    };
  }

  it('Scenario 1: SUCCESS Webhook -> Confirms booking and issues ticket', async () => {
    // 1. Create a hold
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-12-10',
        busId: 6901,
        pickupId: '44953',
        dropoffId: '750',
        contactInfo: {
          customerName: 'Webhook Tester',
          email: 'tester@example.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [{
          seatNo: 'U1',
          seatTypeId: 2,
          fare: 1050,
          gender: 'M',
          age: 28,
          name: 'Webhook Tester',
          isAcSeat: true,
        }],
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
        fromCityName: 'Bengaluru',
        toCityName: 'Chennai',
        journeyDate: '2026-12-10',
        busId: 6901,
        tripId: '15:46754',
        pickupCode: '44953',
        pickupLocation: 'Majestic Anand Rao Circle',
        pickupTime: '2026-12-10 21:00:00',
        dropoffCode: '750',
        dropoffLocation: 'Koyambedu',
        dropoffTime: '2026-12-11 06:00:00',
        operatorName: 'VRL Travels',
        busType: 'AC Sleeper',
        totalFare: 1050,
        baseFare: 950,
        serviceTax: 100,
        contactName: 'Webhook Tester',
        contactEmail: 'tester@example.com',
        contactPhone: '9876543210',
        passengers: [{
          seatNo: 'U1',
          seatTypeId: 2,
          fare: 1050,
          gender: 'M',
          age: 28,
          name: 'Webhook Tester',
          isAcSeat: true,
        }],
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'PHONEPE' });
    expect(intentRes.status).toBe(201);
    const merchantTxnId = intentRes.body.data.merchantTxnId;

    // 4. Send PAYMENT_SUCCESS Webhook
    const webhookData = createWebhookPayload({
      success: true,
      code: 'PAYMENT_SUCCESS',
      message: 'Payment Successful',
      data: {
        merchantId: 'PGTESTPAYUAT',
        merchantTransactionId: merchantTxnId,
        transactionId: `GATEWAY-${Date.now()}`,
        amount: 105000,
        state: 'COMPLETED',
        responseCode: 'SUCCESS',
      },
    });

    const whRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('X-VERIFY', webhookData.xVerify)
      .send(webhookData.body);

    expect(whRes.status).toBe(200);
    expect(whRes.body.success).toBe(true);

    // 5. Verify booking is now CONFIRMED
    const verifyBookingRes = await request(app).get(`/api/v1/bookings/${bookingId}`);
    expect(verifyBookingRes.status).toBe(200);
    expect(verifyBookingRes.body.data.status).toBe('CONFIRMED');

    // 6. Verify digital ticket is issued
    const ticketRes = await request(app).get(`/api/v1/tickets/booking/${bookingId}`);
    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.data.status).toBe('ISSUED');
  });

  it('Scenario 2: REJECT / DECLINED Webhook -> Marks payment and booking as FAILED', async () => {
    // 1. Create a hold
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-12-10',
        busId: 6901,
        pickupId: '44953',
        dropoffId: '750',
        contactInfo: {
          customerName: 'Decline Tester',
          email: 'decline@example.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [{
          seatNo: 'U2',
          seatTypeId: 2,
          fare: 1050,
          gender: 'F',
          age: 26,
          name: 'Decline Tester',
          isAcSeat: true,
        }],
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
        fromCityName: 'Bengaluru',
        toCityName: 'Chennai',
        journeyDate: '2026-12-10',
        busId: 6901,
        tripId: '15:46754',
        pickupCode: '44953',
        pickupLocation: 'Majestic Anand Rao Circle',
        pickupTime: '2026-12-10 21:00:00',
        dropoffCode: '750',
        dropoffLocation: 'Koyambedu',
        dropoffTime: '2026-12-11 06:00:00',
        operatorName: 'VRL Travels',
        busType: 'AC Sleeper',
        totalFare: 1050,
        baseFare: 950,
        serviceTax: 100,
        contactName: 'Decline Tester',
        contactEmail: 'decline@example.com',
        contactPhone: '9876543210',
        passengers: [{
          seatNo: 'U2',
          seatTypeId: 2,
          fare: 1050,
          gender: 'F',
          age: 26,
          name: 'Decline Tester',
          isAcSeat: true,
        }],
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'PHONEPE' });
    expect(intentRes.status).toBe(201);
    const merchantTxnId = intentRes.body.data.merchantTxnId;

    // 4. Send PAYMENT_DECLINED Webhook
    const webhookData = createWebhookPayload({
      success: false,
      code: 'PAYMENT_DECLINED',
      message: 'Declined by customer bank',
      data: {
        merchantId: 'PGTESTPAYUAT',
        merchantTransactionId: merchantTxnId,
        transactionId: `GATEWAY-${Date.now()}`,
        amount: 105000,
        state: 'FAILED',
        responseCode: 'PAYMENT_DECLINED',
      },
    });

    const whRes = await request(app)
      .post('/api/v1/payments/webhook')
      .set('X-VERIFY', webhookData.xVerify)
      .send(webhookData.body);

    expect(whRes.status).toBe(200);
    expect(whRes.body.success).toBe(true);

    // 5. Verify payment status is FAILED
    const payment = await prismaMock.payment.findUnique({ where: { merchantTxnId } });
    expect(payment?.status).toBe('FAILED');
  });

  it('Scenario 3: Controlled Development Webhook Simulator (SUCCESS) -> Confirms booking and issues ticket', async () => {
    // 1. Create hold
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-12-10',
        busId: 6901,
        pickupId: '44953',
        dropoffId: '750',
        contactInfo: {
          customerName: 'Sim Tester',
          email: 'sim@example.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [{
          seatNo: 'U3',
          seatTypeId: 2,
          fare: 1050,
          gender: 'M',
          age: 30,
          name: 'Sim Tester',
          isAcSeat: true,
        }],
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
        fromCityName: 'Bengaluru',
        toCityName: 'Chennai',
        journeyDate: '2026-12-10',
        busId: 6901,
        tripId: '15:46754',
        pickupCode: '44953',
        pickupLocation: 'Majestic Anand Rao Circle',
        pickupTime: '2026-12-10 21:00:00',
        dropoffCode: '750',
        dropoffLocation: 'Koyambedu',
        dropoffTime: '2026-12-11 06:00:00',
        operatorName: 'VRL Travels',
        busType: 'AC Sleeper',
        totalFare: 1050,
        baseFare: 950,
        serviceTax: 100,
        contactName: 'Sim Tester',
        contactEmail: 'sim@example.com',
        contactPhone: '9876543210',
        passengers: [{
          seatNo: 'U3',
          seatTypeId: 2,
          fare: 1050,
          gender: 'M',
          age: 30,
          name: 'Sim Tester',
          isAcSeat: true,
        }],
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'PHONEPE' });
    expect(intentRes.status).toBe(201);
    const merchantTxnId = intentRes.body.data.merchantTxnId;

    // 4. Trigger controlled dev webhook simulation with SUCCESS
    const simRes = await request(app)
      .post('/api/v1/payments/simulate-webhook')
      .send({
        merchantTxnId,
        status: 'SUCCESS',
      });
    expect(simRes.status).toBe(200);
    expect(simRes.body.success).toBe(true);
    expect(simRes.body.data.bookingStatus).toBe('CONFIRMED');
    expect(simRes.body.data.ticket).toBeDefined();

    // 5. Verify booking is CONFIRMED
    const booking = await prismaMock.booking.findUnique({ where: { id: bookingId } });
    expect(booking?.status).toBe('CONFIRMED');
  });

  it('Scenario 4: Controlled Development Webhook Simulator (DECLINED) -> Marks payment and booking FAILED, allows payment retry', async () => {
    // 1. Create hold
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-12-10',
        busId: 6901,
        pickupId: '44953',
        dropoffId: '750',
        contactInfo: {
          customerName: 'Retry Tester',
          email: 'retry@example.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [{
          seatNo: 'U4',
          seatTypeId: 2,
          fare: 1050,
          gender: 'F',
          age: 27,
          name: 'Retry Tester',
          isAcSeat: true,
        }],
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
        fromCityName: 'Bengaluru',
        toCityName: 'Chennai',
        journeyDate: '2026-12-10',
        busId: 6901,
        tripId: '15:46754',
        pickupCode: '44953',
        pickupLocation: 'Majestic Anand Rao Circle',
        pickupTime: '2026-12-10 21:00:00',
        dropoffCode: '750',
        dropoffLocation: 'Koyambedu',
        dropoffTime: '2026-12-11 06:00:00',
        operatorName: 'VRL Travels',
        busType: 'AC Sleeper',
        totalFare: 1050,
        baseFare: 950,
        serviceTax: 100,
        contactName: 'Retry Tester',
        contactEmail: 'retry@example.com',
        contactPhone: '9876543210',
        passengers: [{
          seatNo: 'U4',
          seatTypeId: 2,
          fare: 1050,
          gender: 'F',
          age: 27,
          name: 'Retry Tester',
          isAcSeat: true,
        }],
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'PHONEPE' });
    expect(intentRes.status).toBe(201);
    const merchantTxnId = intentRes.body.data.merchantTxnId;

    // 4. Trigger controlled dev webhook simulation with DECLINED
    const simRes = await request(app)
      .post('/api/v1/payments/simulate-webhook')
      .send({
        merchantTxnId,
        status: 'DECLINED',
        reason: 'Customer cancelled transaction',
      });
    expect(simRes.status).toBe(200);
    expect(simRes.body.data.bookingStatus).toBe('PAYMENT_FAILED');

    // 5. Verify payment retry is permitted on the same booking while hold is still active
    const retryIntentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'PHONEPE' });
    expect(retryIntentRes.status).toBe(201);
    expect(retryIntentRes.body.success).toBe(true);
    expect(retryIntentRes.body.data).toHaveProperty('merchantTxnId');
  });

  it('Scenario 5: Simulation endpoint is rejected with 403 Forbidden in production environment', async () => {
    const originalEnv = env.NODE_ENV;
    (env as any).NODE_ENV = 'production';
    try {
      const res = await request(app)
        .post('/api/v1/payments/simulate-webhook')
        .send({
          merchantTxnId: 'TXN-PROD-TEST',
          status: 'SUCCESS',
        });
      expect(res.status).toBe(403);
    } finally {
      (env as any).NODE_ENV = originalEnv;
    }
  });
});
