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

describe('Production-Grade Razorpay Payment Gateway Integration Tests', () => {
  const app = createApp();

  const authToken = jwt.sign(
    {
      sub: '00000000-0000-0000-0000-000000000002',
      email: 'razorpay.tester@example.com',
      role: 'CUSTOMER',
      jti: 'rzp-token-id',
    },
    env.JWT_ACCESS_SECRET,
    { issuer: env.JWT_ISSUER, expiresIn: '1h' }
  );

  it('1. Create Razorpay Payment Intent: returns valid SDK payload with orderId, amount in paise, and currency', async () => {
    // 1. Create a hold
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-12-15',
        busId: 6902,
        pickupId: '44953',
        dropoffId: '750',
        contactInfo: {
          customerName: 'Aditya Patil',
          email: 'aditya@example.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [
          {
            seatNo: 'L2',
            seatTypeId: 1,
            fare: 850,
            gender: 'M',
            age: 29,
            name: 'Aditya Patil',
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
        fromCityName: 'Bengaluru',
        toCityName: 'Chennai',
        journeyDate: '2026-12-15',
        busId: 6902,
        tripId: '15:99999',
        pickupCode: '44953',
        pickupLocation: 'Majestic Anand Rao Circle',
        pickupTime: '2026-12-15 22:00:00',
        dropoffCode: '750',
        dropoffLocation: 'Koyambedu',
        dropoffTime: '2026-12-16 06:30:00',
        operatorName: 'SRS Travels',
        busType: 'AC Sleeper',
        totalFare: 850,
        baseFare: 780,
        serviceTax: 70,
        contactName: 'Aditya Patil',
        contactEmail: 'aditya@example.com',
        contactPhone: '9876543210',
        passengers: [
          {
            seatNo: 'L2',
            seatTypeId: 1,
            fare: 850,
            gender: 'M',
            age: 29,
            name: 'Aditya Patil',
            isAcSeat: true,
          },
        ],
      });
    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent for RAZORPAY
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'RAZORPAY', paymentMode: 'UPI' });

    expect(intentRes.status).toBe(201);
    expect(intentRes.body.success).toBe(true);
    const data = intentRes.body.data;

    expect(data.gateway).toBe('RAZORPAY');
    expect(data.amount).toBe(850);
    expect(data.currency).toBe('INR');
    expect(data.merchantTxnId).toBeDefined();
    expect(data.gatewayOrderId).toBeDefined();
    expect(data.sdkPayload).toBeDefined();
    expect(data.sdkPayload.key).toBeDefined();
    expect(data.sdkPayload.amount).toBe(85000); // 850 * 100 paise
    expect(data.sdkPayload.currency).toBe('INR');
    expect(data.sdkPayload.modal).toEqual({ confirm_close: true });
    expect(data.sdkPayload.prefill.contact).toBe('9876543210');
  });

  it('2. Cryptographic HMAC-SHA256 Verification: verifies valid signature and confirms booking', async () => {
    // 1. Create a hold
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-12-15',
        busId: 6902,
        pickupId: '44953',
        dropoffId: '750',
        contactInfo: {
          customerName: 'Signature Tester',
          email: 'sig@example.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [
          {
            seatNo: 'L3',
            seatTypeId: 1,
            fare: 850,
            gender: 'M',
            age: 32,
            name: 'Signature Tester',
            isAcSeat: true,
          },
        ],
      });
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
        journeyDate: '2026-12-15',
        busId: 6902,
        tripId: '15:99999',
        pickupCode: '44953',
        pickupLocation: 'Majestic Anand Rao Circle',
        pickupTime: '2026-12-15 22:00:00',
        dropoffCode: '750',
        dropoffLocation: 'Koyambedu',
        dropoffTime: '2026-12-16 06:30:00',
        operatorName: 'SRS Travels',
        busType: 'AC Sleeper',
        totalFare: 850,
        baseFare: 780,
        serviceTax: 70,
        contactName: 'Signature Tester',
        contactEmail: 'sig@example.com',
        contactPhone: '9876543210',
        passengers: [
          {
            seatNo: 'L3',
            seatTypeId: 1,
            fare: 850,
            gender: 'M',
            age: 32,
            name: 'Signature Tester',
            isAcSeat: true,
          },
        ],
      });
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'RAZORPAY' });

    const { merchantTxnId, gatewayOrderId } = intentRes.body.data;
    const gatewayPaymentId = `pay_rzp_live_${Date.now()}`;
    const secret = env.RAZORPAY_KEY_SECRET || 'mock_secret';

    // Compute authentic HMAC SHA256
    const gatewaySignature = crypto
      .createHmac('sha256', secret)
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest('hex');

    // 4. Verify Payment via backend API
    const verifyRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bookingId,
        merchantTxnId,
        gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.status).toBe('SUCCESS');
    expect(verifyRes.body.data.booking.status).toBe('CONFIRMED');

    // 5. Idempotent check: calling verify again returns existing confirmed booking
    const idempotentRes = await request(app)
      .post('/api/v1/payments/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bookingId,
        merchantTxnId,
        gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature,
      });

    expect(idempotentRes.status).toBe(200);
    expect(idempotentRes.body.data.status).toBe('SUCCESS');
  });

  it('3. Razorpay Webhook Simulation (payment.captured): confirms booking and issues ticket', async () => {
    // 1. Create a hold
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-12-15',
        busId: 6902,
        pickupId: '44953',
        dropoffId: '750',
        contactInfo: {
          customerName: 'Webhook Tester',
          email: 'wh@example.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [
          {
            seatNo: 'L4',
            seatTypeId: 1,
            fare: 850,
            gender: 'F',
            age: 27,
            name: 'Webhook Tester',
            isAcSeat: true,
          },
        ],
      });
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
        journeyDate: '2026-12-15',
        busId: 6902,
        tripId: '15:99999',
        pickupCode: '44953',
        pickupLocation: 'Majestic Anand Rao Circle',
        pickupTime: '2026-12-15 22:00:00',
        dropoffCode: '750',
        dropoffLocation: 'Koyambedu',
        dropoffTime: '2026-12-16 06:30:00',
        operatorName: 'SRS Travels',
        busType: 'AC Sleeper',
        totalFare: 850,
        baseFare: 780,
        serviceTax: 70,
        contactName: 'Webhook Tester',
        contactEmail: 'wh@example.com',
        contactPhone: '9876543210',
        passengers: [
          {
            seatNo: 'L4',
            seatTypeId: 1,
            fare: 850,
            gender: 'F',
            age: 27,
            name: 'Webhook Tester',
            isAcSeat: true,
          },
        ],
      });
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'RAZORPAY' });

    const merchantTxnId = intentRes.body.data.merchantTxnId;

    // 4. Simulate official Razorpay webhook
    const simRes = await request(app)
      .post('/api/v1/payments/simulate-webhook')
      .send({
        merchantTxnId,
        status: 'SUCCESS',
      });

    expect(simRes.status).toBe(200);
    expect(simRes.body.success).toBe(true);
    expect(simRes.body.data.gateway).toBe('RAZORPAY');
    expect(simRes.body.data.bookingStatus).toBe('CONFIRMED');
    expect(simRes.body.data.ticket).toBeDefined();

    // 5. Verify Ticket is issued
    const ticketRes = await request(app).get(`/api/v1/tickets/booking/${bookingId}`);
    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.data.status).toBe('ISSUED');
  });

  it('4. Razorpay Hosted Checkout HTML page render', async () => {
    // 1. Create a hold
    const holdRes = await request(app)
      .post('/api/v1/holds')
      .send({
        fromCityId: 4292,
        toCityId: 4562,
        journeyDate: '2026-12-15',
        busId: 6902,
        pickupId: '44953',
        dropoffId: '750',
        contactInfo: {
          customerName: 'Checkout Tester',
          email: 'chk@example.com',
          phone: '9876543210',
          mobile: '9876543210',
        },
        passengers: [
          {
            seatNo: 'L5',
            seatTypeId: 1,
            fare: 850,
            gender: 'M',
            age: 35,
            name: 'Checkout Tester',
            isAcSeat: true,
          },
        ],
      });
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
        journeyDate: '2026-12-15',
        busId: 6902,
        tripId: '15:99999',
        pickupCode: '44953',
        pickupLocation: 'Majestic Anand Rao Circle',
        pickupTime: '2026-12-15 22:00:00',
        dropoffCode: '750',
        dropoffLocation: 'Koyambedu',
        dropoffTime: '2026-12-16 06:30:00',
        operatorName: 'SRS Travels',
        busType: 'AC Sleeper',
        totalFare: 850,
        baseFare: 780,
        serviceTax: 70,
        contactName: 'Checkout Tester',
        contactEmail: 'chk@example.com',
        contactPhone: '9876543210',
        passengers: [
          {
            seatNo: 'L5',
            seatTypeId: 1,
            fare: 850,
            gender: 'M',
            age: 35,
            name: 'Checkout Tester',
            isAcSeat: true,
          },
        ],
      });
    const bookingId = bookingRes.body.data.id;

    // 3. Create payment intent
    const intentRes = await request(app)
      .post('/api/v1/payments/intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ bookingId, gateway: 'RAZORPAY' });

    const merchantTxnId = intentRes.body.data.merchantTxnId;

    // 4. GET /api/v1/payments/checkout/:merchantTxnId
    const htmlRes = await request(app).get(`/api/v1/payments/checkout/${merchantTxnId}`);
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.header['content-type']).toContain('text/html');
    expect(htmlRes.text).toContain('checkout.razorpay.com');
    expect(htmlRes.text).toContain('AiBus');
  });
});
