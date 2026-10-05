import { describe, it, expect, vi, beforeAll } from 'vitest';
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

describe('End-to-End Travel Reservation Lifecycle', () => {
  const app = createApp();
  let holdId: string;
  let bookingId: string;
  let merchantTxnId: string;

  it('Step 1: Search buses between two cities', async () => {
    const res = await request(app).get('/api/v1/search?fromCityId=4292&toCityId=4562&journeyDate=2026-12-10');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results.length).toBeGreaterThan(0);
    expect(res.body.data.results[0]).toHaveProperty('RouteBusId');
  });

  it('Step 2: Retrieve real-time seat chart for selected bus', async () => {
    const res = await request(app).get('/api/v1/buses/6901/chart');
    expect(res.status).toBe(200);
    expect(res.body.data.Layout.length).toBeGreaterThan(0);
    expect(res.body.data.BoardingPoints.length).toBeGreaterThan(0);
    expect(res.body.data.DroppingPoints.length).toBeGreaterThan(0);
  });

  it('Step 3: Hold selected seats for passenger', async () => {
    const holdPayload = {
      fromCityId: 4292,
      toCityId: 4562,
      journeyDate: '2026-12-10',
      busId: 6901,
      pickupId: '44953',
      dropoffId: '750',
      contactInfo: {
        customerName: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        phone: '9876543210',
        mobile: '9876543210',
      },
      passengers: [
        {
          seatNo: 'L1',
          seatTypeId: 2,
          fare: 1050,
          gender: 'M',
          age: 29,
          name: 'Rahul Verma',
          isAcSeat: true,
        },
      ],
    };

    const res = await request(app).post('/api/v1/holds').send(holdPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('providerHoldId');
    holdId = res.body.data.id;
  });

  it('Step 4: Create booking with held seats', async () => {
    const bookingPayload = {
      holdId,
      fromCityId: 4292,
      toCityId: 4562,
      fromCityName: 'Bangalore',
      toCityName: 'Hyderabad',
      journeyDate: '2026-12-10',
      busId: 6901,
      tripId: '15:46754',
      pickupCode: '44953',
      pickupLocation: 'Majestic Anand Rao Circle',
      pickupTime: '2026-12-10 21:00:00',
      dropoffCode: '750',
      dropoffLocation: 'Ameerpet',
      dropoffTime: '2026-12-11 06:00:00',
      operatorName: 'VRL Travels',
      busType: 'Volvo Multi-Axle Sleeper',
      totalFare: 1050,
      baseFare: 950,
      serviceTax: 100,
      contactName: 'Rahul Verma',
      contactEmail: 'rahul.verma@example.com',
      contactPhone: '9876543210',
      passengers: [
        {
          seatNo: 'L1',
          seatTypeId: 2,
          fare: 1050,
          gender: 'M',
          age: 29,
          name: 'Rahul Verma',
          isAcSeat: true,
        },
      ],
    };

    const res = await request(app).post('/api/v1/bookings').send(bookingPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('bookingNumber');
    expect(res.body.data.status).toBe('HELD');
    bookingId = res.body.data.id;
  });

  it('Step 5: Create payment intent for booking', async () => {
    const res = await request(app)
      .post('/api/v1/payments/intent')
      .send({ bookingId, gateway: 'PHONEPE' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('paymentId');
    expect(res.body.data).toHaveProperty('merchantTxnId');
    merchantTxnId = res.body.data.merchantTxnId;
  });

  it('Step 6: Verify payment and confirm booking', async () => {
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .send({
        bookingId,
        merchantTxnId,
        gatewayOrderId: 'PHONEPE-ORDER-001',
        gatewayPaymentId: 'PHONEPE-PAY-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking.status).toBe('CONFIRMED');
    expect(res.body.data.booking).toHaveProperty('providerTicketNo');
    expect(res.body.data.booking).toHaveProperty('providerPnrNo');
  });

  it('Step 7: Retrieve digital ticket', async () => {
    const res = await request(app).get(`/api/v1/tickets/booking/${bookingId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('ticketNumber');
    expect(res.body.data).toHaveProperty('pnrNumber');
    expect(res.body.data.status).toBe('ISSUED');
  });

  it('Step 8: Check cancellability policy and refund projection', async () => {
    const res = await request(app).get(`/api/v1/cancellations/${bookingId}/check`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.IsCancellable).toBe(true);
    expect(res.body.data.RefundAmount).toBeGreaterThan(0);
  });

  it('Step 9: Cancel seats and queue refund', async () => {
    const res = await request(app)
      .post(`/api/v1/cancellations/${bookingId}`)
      .send({
        seatNos: ['L1'],
        reason: 'Change of travel plan',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cancellation.status).toBe('COMPLETED');
    expect(res.body.data.refund.status).toBe('PENDING');
  });
});
