import { describe, expect, it } from 'vitest';
import { parseGdsSearchResponse } from '../../src/providers/gds/gdsSearchResponse';

describe('parseGdsSearchResponse', () => {
  it('unwraps and maps the documented Partner Search response', () => {
    const buses = parseGdsSearchResponse({
      success: true,
      data: {
        Buses: [
          {
            RouteBusId: 1,
            CompanyId: 3963,
            CompanyName: 'GDS Demo Test',
            BusType: { IsAC: 'NON_AC', Seating: 'SEATER' },
            Pickups: [{ PickupCode: '39436', PickupName: 'Anand rao circle', PickupArea: '', PickupTime: '2022-06-30T05:00:00.000Z' }],
            Dropoffs: [{ DropoffTime: '2022-06-30T18:00:00.000Z', DropoffName: 'Koyambedu', DropoffCode: '750' }],
            Canc: [{ Amt: 0, Pct: 100, Mins: 0 }],
            BusStatus: { Availability: 35, BaseFares: [50, 0], TotalTax: 6 },
            ChartCode: 'chart-code',
            BusLabel: '2X2(35) NAC Seater',
            ArrTime: '2022-06-30T18:00:00.000Z',
            DeptTime: '2022-06-30T06:00:00.000Z',
            TripId: '15:46754',
          },
        ],
      },
    });

    expect(buses).toHaveLength(1);
    expect(buses[0]).toMatchObject({
      RouteBusId: 1,
      CompanyName: 'GDS Demo Test',
      BusTypeName: '2X2(35) NAC Seater',
      DepartureTime: '2022-06-30T06:00:00.000Z',
      ArrivalTime: '2022-06-30T18:00:00.000Z',
      TotalSeats: 35,
      AvailableSeats: 35,
      BaseFare: 50,
      ServiceTax: 6,
      TotalFare: 56,
      IsAC: false,
      IsSleeper: false,
      BoardingPoints: [{ PickupCode: '39436', PickupName: 'Anand rao circle', Address: '', PickupTime: '2022-06-30T05:00:00.000Z' }],
      DroppingPoints: [{ DropoffCode: '750', DropoffName: 'Koyambedu', DropoffTime: '2022-06-30T18:00:00.000Z' }],
      CancellationPolicy: [{ Amt: 0, Pct: 100, Mins: 0 }],
    });
  });

  it('returns an empty array when the provider returns no buses', () => {
    expect(parseGdsSearchResponse({ success: true, data: { Buses: [] } })).toEqual([]);
  });

  it('reports an invalid provider response instead of returning a non-iterable value', () => {
    expect(() => parseGdsSearchResponse({ success: true, data: {} })).toThrow(
      'Invalid GDS Search response: expected data.Buses to be an array'
    );
  });

  it('reports provider-declared failures', () => {
    expect(() => parseGdsSearchResponse({ success: false, Error: { Msg: 'Invalid route' } })).toThrow(
      'GDS Search failed: Invalid route'
    );
  });
});
