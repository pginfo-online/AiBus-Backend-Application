import { GdsBusSearchResult } from '../types';

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid GDS Search response: ${field} must be a number`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid GDS Search response: ${field} must be a string`);
  }
  return value;
}

function parseBus(value: unknown, index: number): GdsBusSearchResult {
  const field = `data.Buses[${index}]`;
  if (!isJsonObject(value)) {
    throw new Error(`Invalid GDS Search response: ${field} must be an object`);
  }

  const busType = isJsonObject(value.BusType) ? value.BusType : {};
  const busStatus = isJsonObject(value.BusStatus) ? value.BusStatus : {};
  const availability = requiredNumber(busStatus.Availability, `${field}.BusStatus.Availability`);
  const fares = Array.isArray(busStatus.BaseFares) ? busStatus.BaseFares : [];
  const baseFare = fares.length > 0 ? requiredNumber(fares[0], `${field}.BusStatus.BaseFares[0]`) : 0;
  const serviceTax = typeof busStatus.TotalTax === 'number' ? busStatus.TotalTax : 0;
  const busLabel = requiredString(value.BusLabel, `${field}.BusLabel`);
  const seatsFromLabel = busLabel.match(/\((\d+)\)/);
  const cancellationPolicy = Array.isArray(value.Canc)
    ? value.Canc.map((item, policyIndex) => {
        if (!isJsonObject(item)) {
          throw new Error(`Invalid GDS Search response: ${field}.Canc[${policyIndex}] must be an object`);
        }
        return {
          Amt: requiredNumber(item.Amt, `${field}.Canc[${policyIndex}].Amt`),
          Pct: requiredNumber(item.Pct, `${field}.Canc[${policyIndex}].Pct`),
          Mins: requiredNumber(item.Mins, `${field}.Canc[${policyIndex}].Mins`),
        };
      })
    : undefined;

  const pickups = Array.isArray(value.Pickups) ? value.Pickups : [];
  const dropoffs = Array.isArray(value.Dropoffs) ? value.Dropoffs : [];

  return {
    RouteBusId: requiredNumber(value.RouteBusId, `${field}.RouteBusId`),
    CompanyId: requiredNumber(value.CompanyId, `${field}.CompanyId`),
    CompanyName: requiredString(value.CompanyName, `${field}.CompanyName`),
    BusTypeName: busLabel,
    DepartureTime: requiredString(value.DeptTime, `${field}.DeptTime`),
    ArrivalTime: requiredString(value.ArrTime, `${field}.ArrTime`),
    TripId: requiredString(value.TripId, `${field}.TripId`),
    ChartCode: requiredString(value.ChartCode, `${field}.ChartCode`),
    TotalSeats: seatsFromLabel ? Number(seatsFromLabel[1]) : availability,
    AvailableSeats: availability,
    BaseFare: baseFare,
    TotalFare: baseFare + serviceTax,
    ServiceTax: serviceTax,
    IsAC: busType.IsAC === 'AC',
    IsSleeper: typeof busType.Seating === 'string' && busType.Seating.includes('SLEEPER'),
    BoardingPoints: pickups.map((pickup, pickupIndex) => {
      if (!isJsonObject(pickup)) {
        throw new Error(`Invalid GDS Search response: ${field}.Pickups[${pickupIndex}] must be an object`);
      }
      return {
        PickupCode: requiredString(pickup.PickupCode, `${field}.Pickups[${pickupIndex}].PickupCode`),
        PickupName: requiredString(pickup.PickupName, `${field}.Pickups[${pickupIndex}].PickupName`),
        Address: typeof pickup.PickupArea === 'string' ? pickup.PickupArea : '',
        PickupTime: requiredString(pickup.PickupTime, `${field}.Pickups[${pickupIndex}].PickupTime`),
      };
    }),
    DroppingPoints: dropoffs.map((dropoff, dropoffIndex) => {
      if (!isJsonObject(dropoff)) {
        throw new Error(`Invalid GDS Search response: ${field}.Dropoffs[${dropoffIndex}] must be an object`);
      }
      return {
        DropoffCode: requiredString(dropoff.DropoffCode, `${field}.Dropoffs[${dropoffIndex}].DropoffCode`),
        DropoffName: requiredString(dropoff.DropoffName, `${field}.Dropoffs[${dropoffIndex}].DropoffName`),
        DropoffTime: requiredString(dropoff.DropoffTime, `${field}.Dropoffs[${dropoffIndex}].DropoffTime`),
      };
    }),
    CancellationPolicy: cancellationPolicy,
  };
}

export function parseGdsSearchResponse(response: unknown): GdsBusSearchResult[] {
  if (!isJsonObject(response)) {
    throw new Error('Invalid GDS Search response: expected an object');
  }

  if (response.success === false) {
    const error = isJsonObject(response.Error) ? response.Error : {};
    const message = typeof error.Msg === 'string' ? error.Msg : 'provider returned success=false';
    throw new Error(`GDS Search failed: ${message}`);
  }

  if (!isJsonObject(response.data) || !Array.isArray(response.data.Buses)) {
    throw new Error('Invalid GDS Search response: expected data.Buses to be an array');
  }

  return response.data.Buses.map(parseBus);
}
