import { describe, expect, it } from 'vitest';
import { parseGdsChartResponse } from '../../src/providers/gds/gdsChartResponse';

describe('parseGdsChartResponse', () => {
  it('maps provider deck positions, seat numbers, statuses, and fares to the app layout', () => {
    const chart = parseGdsChartResponse(
      {
        success: true,
        data: {
          ChartLayout: {
            Info: { TotalSeats: 2 },
            Layout: {
              Lower: [
                [0, 0, 1, 1, 1, 1],
                [1, 0, 3, 1, 1, 2],
              ],
            },
          },
          ChartSeats: { Seats: ['1A', '1B'] },
          SeatsStatus: {
            Status: [1, 0],
            Fares: [
              [105, 100, 0, 0, 5, 0],
              [105, 100, 0, 0, 5, 0],
            ],
          },
          Pickups: [],
          Dropoffs: [],
          Canc: [],
        },
      },
      42
    );

    expect(chart).toMatchObject({
      BusId: 42,
      TotalSeats: 2,
      AvailableSeats: 1,
      Layout: [
        {
          seq_no: 0,
          seat_no: '1A',
          row: 0,
          column: 1,
          deck: 1,
          seat_status: 1,
          total_fare: 105,
          base_fare: 100,
          service_tax: 5,
        },
        {
          seq_no: 1,
          seat_no: '1B',
          deck: 1,
          seat_status: 0,
        },
      ],
    });
  });

  it('rejects provider responses that do not contain the chart layout data', () => {
    expect(() => parseGdsChartResponse({ success: true, data: {} }, 42)).toThrow(
      'Invalid GDS Chart response: expected ChartLayout, ChartSeats, and SeatsStatus'
    );
  });
});
