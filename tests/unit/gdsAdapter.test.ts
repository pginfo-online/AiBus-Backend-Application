import { describe, it, expect } from 'vitest';
import { GdsAdapter } from '../../src/providers/gds/gdsAdapter';

describe('GDS Adapter Unit Tests', () => {
  const adapter = GdsAdapter.getInstance();

  it('should fetch list of cities', async () => {
    const cities = await adapter.getCities();
    expect(Array.isArray(cities)).toBe(true);
    expect(cities.length).toBeGreaterThan(0);
    expect(cities[0]).toHaveProperty('CityId');
    expect(cities[0]).toHaveProperty('CityName');
  });

  it('should search buses by fromCityId, toCityId, journeyDate', async () => {
    const buses = await adapter.searchBuses({
      fromCityId: 4292,
      toCityId: 4562,
      journeyDate: '2026-10-15',
    });

    expect(Array.isArray(buses)).toBe(true);
    expect(buses.length).toBeGreaterThan(0);
    expect(buses[0]).toHaveProperty('RouteBusId');
    expect(buses[0]).toHaveProperty('CompanyName');
    expect(buses[0].TotalFare).toBeGreaterThan(0);
    expect(buses[0].BoardingPoints.length).toBeGreaterThan(0);
    expect(buses[0].DroppingPoints.length).toBeGreaterThan(0);
  });

  it('should retrieve seat chart layout for a bus', async () => {
    const chart = await adapter.getSeatChart(6901);
    expect(chart).toHaveProperty('BusId', 6901);
    expect(Array.isArray(chart.Layout)).toBe(true);
    expect(chart.Layout.length).toBeGreaterThan(0);

    const firstSeat = chart.Layout[0];
    expect(firstSeat).toHaveProperty('seat_no');
    expect(firstSeat).toHaveProperty('seat_type');
    expect(firstSeat).toHaveProperty('total_fare');
  });

  it('should hold seats for passengers', async () => {
    const holdRes = await adapter.holdSeats({
      FromCityId: 4292,
      ToCityId: 4562,
      JourneyDate: '2026-10-15T00:00:00.000Z',
      BusId: 6901,
      PickUpID: '44953',
      DropOffID: '750',
      ContactInfo: {
        CustomerName: 'Test User',
        Email: 'test@example.com',
        Phone: '9876543210',
        Mobile: '9876543210',
      },
      Passengers: [
        {
          SeatNo: 'L1',
          SeatTypeId: 2,
          Fare: 1050,
          Gender: 'M',
          Age: 28,
          Name: 'Test User',
          IsAcSeat: true,
        },
      ],
    });

    expect(holdRes).toHaveProperty('HoldId');
    expect(holdRes.Status).toBe(1);
    expect(holdRes.TotalFare).toBe(1050);
  });

  it('should book held seats and return ticket & pnr', async () => {
    const bookRes = await adapter.bookSeats('GDS-HOLD-123456', 1050);
    expect(bookRes.Status).toBe(1);
    expect(bookRes).toHaveProperty('TicketNo');
    expect(bookRes).toHaveProperty('PNRNo');
  });

  it('should check isCancellable and calculate refund amount', async () => {
    const cancellable = await adapter.isCancellable('TKT12345678', 'L1');
    expect(cancellable.IsCancellable).toBe(true);
    expect(cancellable.RefundAmount).toBeGreaterThan(0);
    expect(cancellable.CancellationCharge).toBeGreaterThan(0);
  });

  it('should query agency balance', async () => {
    const balance = await adapter.getBalance();
    expect(balance.Balance).toBeGreaterThan(0);
    expect(balance.Currency).toBe('INR');
  });
});
