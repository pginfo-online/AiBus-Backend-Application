import { describe, expect, it } from 'vitest';
import { buildGdsHoldSeatsPayload } from '../../src/providers/gds/gdsTransactionClient';

describe('buildGdsHoldSeatsPayload', () => {
  it('sends the documented Passengers field without an unsupported Passenger alias', () => {
    const payload = buildGdsHoldSeatsPayload({
      FromCityId: 4562,
      ToCityId: 4292,
      JourneyDate: '2026-10-10',
      BusId: 249,
      PickUpID: '38310',
      DropOffID: '71581',
      ContactInfo: {
        CustomerName: 'Test User',
        Email: 'test@example.com',
        Phone: '9100000000',
        Mobile: '9100000000',
      },
      Passengers: [
        {
          Name: 'Test User',
          Age: 21,
          Gender: 'M',
          SeatNo: '2',
          Fare: 210,
          SeatTypeId: 4,
          IsAcSeat: false,
        },
      ],
    });

    expect(payload.Passengers).toHaveLength(1);
    expect(payload.Passengers[0]).toMatchObject({
      SeatNo: '2',
      SeatTypeId: 4,
      Fare: 210,
      IsAcSeat: false,
    });
    expect(payload.JourneyDate).toBe('2026-10-10');
    expect(payload).not.toHaveProperty('Passenger');
  });
});
