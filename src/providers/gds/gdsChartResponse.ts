import { GdsChartResponse, GdsSeatLayoutItem } from '../types';

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid GDS Chart response: ${field} must be a number`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid GDS Chart response: ${field} must be a string`);
  }
  return value;
}

function numberArray(value: unknown, field: string): number[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid GDS Chart response: ${field} must be an array`);
  }
  return value.map((item, index) => requiredNumber(item, `${field}[${index}]`));
}

function parseDeck(
  value: unknown,
  deck: number,
  seats: string[],
  statuses: number[],
  fares: number[][]
): GdsSeatLayoutItem[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid GDS Chart response: ChartLayout.Layout.${deck === 1 ? 'Lower' : 'Upper'} must be an array`);
  }

  return value.map((entry, index) => {
    const field = `ChartLayout.Layout.${deck === 1 ? 'Lower' : 'Upper'}[${index}]`;
    if (!Array.isArray(entry) || entry.length < 6) {
      throw new Error(`Invalid GDS Chart response: ${field} must contain seat layout values`);
    }

    const seqNo = requiredNumber(entry[0], `${field}[0]`);
    if (!Number.isInteger(seqNo) || seqNo < 0) {
      throw new Error(`Invalid GDS Chart response: ${field}[0] must be a non-negative integer`);
    }

    const seatNo = seats[seqNo];
    const seatStatus = statuses[seqNo];
    const fare = fares[seqNo];
    if (seatNo === undefined || seatStatus === undefined || !fare || fare.length < 2) {
      throw new Error(`Invalid GDS Chart response: missing seat, status, or fare data for sequence ${seqNo}`);
    }

    const totalFare = requiredNumber(fare[0], `SeatsStatus.Fares[${seqNo}][0]`);
    const baseFare = requiredNumber(fare[1], `SeatsStatus.Fares[${seqNo}][1]`);

    return {
      seq_no: seqNo,
      seat_no: requiredString(seatNo, `ChartSeats.Seats[${seqNo}]`),
      row: requiredNumber(entry[1], `${field}[1]`),
      column: requiredNumber(entry[2], `${field}[2]`),
      width: requiredNumber(entry[3], `${field}[3]`),
      length: requiredNumber(entry[4], `${field}[4]`),
      seat_type: requiredNumber(entry[5], `${field}[5]`),
      deck,
      seat_status: requiredNumber(seatStatus, `SeatsStatus.Status[${seqNo}]`),
      total_fare: totalFare,
      base_fare: baseFare,
      service_tax: totalFare - baseFare,
    };
  });
}

export function parseGdsChartResponse(response: unknown, busId: number): GdsChartResponse {
  if (!isJsonObject(response)) {
    throw new Error('Invalid GDS Chart response: expected an object');
  }

  if (response.success === false) {
    const error = isJsonObject(response.Error) ? response.Error : {};
    const message = typeof error.Msg === 'string' ? error.Msg : 'provider returned success=false';
    throw new Error(`GDS Chart failed: ${message}`);
  }

  if (!isJsonObject(response.data)) {
    throw new Error('Invalid GDS Chart response: expected data to be an object');
  }

  const data = response.data;
  const chartLayout = data.ChartLayout;
  const chartSeats = data.ChartSeats;
  const seatsStatus = data.SeatsStatus;
  if (
    !isJsonObject(chartLayout) ||
    !isJsonObject(chartLayout.Info) ||
    !isJsonObject(chartLayout.Layout) ||
    !isJsonObject(chartSeats) ||
    !isJsonObject(seatsStatus)
  ) {
    throw new Error('Invalid GDS Chart response: expected ChartLayout, ChartSeats, and SeatsStatus');
  }

  const seats = chartSeats.Seats;
  if (!Array.isArray(seats)) {
    throw new Error('Invalid GDS Chart response: ChartSeats.Seats must be an array');
  }

  const statuses = numberArray(seatsStatus.Status, 'SeatsStatus.Status');
  const faresValue = seatsStatus.Fares;
  if (!Array.isArray(faresValue)) {
    throw new Error('Invalid GDS Chart response: SeatsStatus.Fares must be an array');
  }
  const fares = faresValue.map((fare, index) => numberArray(fare, `SeatsStatus.Fares[${index}]`));

  const lowerDeck = parseDeck(chartLayout.Layout.Lower, 1, seats, statuses, fares);
  const upperDeck = chartLayout.Layout.Upper === undefined
    ? []
    : parseDeck(chartLayout.Layout.Upper, 2, seats, statuses, fares);
  const layout = [...lowerDeck, ...upperDeck];
  const cancellationPolicy = Array.isArray(data.Canc)
    ? data.Canc.map((item, index) => {
        if (!isJsonObject(item)) {
          throw new Error(`Invalid GDS Chart response: Canc[${index}] must be an object`);
        }
        return {
          Amt: requiredNumber(item.Amt, `Canc[${index}].Amt`),
          Pct: requiredNumber(item.Pct, `Canc[${index}].Pct`),
          Mins: requiredNumber(item.Mins, `Canc[${index}].Mins`),
        };
      })
    : [];
  const pickups = Array.isArray(data.Pickups) ? data.Pickups : [];
  const dropoffs = Array.isArray(data.Dropoffs) ? data.Dropoffs : [];
  const info = chartLayout.Info;

  return {
    BusId: busId,
    TotalSeats: requiredNumber(info.TotalSeats, 'ChartLayout.Info.TotalSeats'),
    AvailableSeats: layout.filter((seat) => seat.seat_status === 1 || seat.seat_status === 2 || seat.seat_status === 3).length,
    Layout: layout,
    BoardingPoints: pickups.map((pickup, index) => {
      if (!isJsonObject(pickup)) {
        throw new Error(`Invalid GDS Chart response: Pickups[${index}] must be an object`);
      }
      return {
        PickupCode: requiredString(pickup.PickupCode, `Pickups[${index}].PickupCode`),
        PickupName: requiredString(pickup.PickupName, `Pickups[${index}].PickupName`),
        Address: typeof pickup.Address === 'string' ? pickup.Address : '',
        Landmark: typeof pickup.Landmark === 'string' ? pickup.Landmark : undefined,
        Contact: typeof pickup.Contact === 'string' ? pickup.Contact : undefined,
        PickupTime: requiredString(pickup.PickupTime, `Pickups[${index}].PickupTime`),
      };
    }),
    DroppingPoints: dropoffs.map((dropoff, index) => {
      if (!isJsonObject(dropoff)) {
        throw new Error(`Invalid GDS Chart response: Dropoffs[${index}] must be an object`);
      }
      return {
        DropoffCode: requiredString(dropoff.DropoffCode, `Dropoffs[${index}].DropoffCode`),
        DropoffName: requiredString(dropoff.DropoffName, `Dropoffs[${index}].DropoffName`),
        DropoffTime: requiredString(dropoff.DropoffTime, `Dropoffs[${index}].DropoffTime`),
      };
    }),
    CancellationPolicy: cancellationPolicy,
  };
}
