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

  // 1. Base Fare: check BaseFares array or BaseFare number
  const baseFares = Array.isArray(busStatus.BaseFares)
    ? busStatus.BaseFares
    : (Array.isArray(value.BaseFares) ? value.BaseFares : []);
  const rawBaseFare = baseFares.length > 0 && typeof baseFares[0] === 'number'
    ? baseFares[0]
    : (typeof busStatus.BaseFare === 'number'
        ? busStatus.BaseFare
        : (typeof value.BaseFare === 'number' ? value.BaseFare : 0));

  // 2. Total Fare: check TotalFares array, TotalFare number, or GrossFare
  const totalFaresArray = Array.isArray(busStatus.TotalFares)
    ? busStatus.TotalFares
    : (Array.isArray(value.TotalFares) ? value.TotalFares : []);
  const rawTotalFare = totalFaresArray.length > 0 && typeof totalFaresArray[0] === 'number'
    ? totalFaresArray[0]
    : (typeof busStatus.TotalFare === 'number'
        ? busStatus.TotalFare
        : (typeof value.TotalFare === 'number'
            ? value.TotalFare
            : (typeof busStatus.GrossFare === 'number'
                ? busStatus.GrossFare
                : (typeof value.GrossFare === 'number' ? value.GrossFare : undefined))));

  // 3. Tax / GST: check TotalTax, ServiceTax, Tax, GST across busStatus and value
  const rawTax = typeof busStatus.TotalTax === 'number'
    ? busStatus.TotalTax
    : (typeof busStatus.ServiceTax === 'number'
        ? busStatus.ServiceTax
        : (typeof busStatus.Tax === 'number'
            ? busStatus.Tax
            : (typeof busStatus.GST === 'number'
                ? busStatus.GST
                : (typeof busStatus.Gst === 'number'
                    ? busStatus.Gst
                    : (typeof value.TotalTax === 'number'
                        ? value.TotalTax
                        : (typeof value.ServiceTax === 'number'
                            ? value.ServiceTax
                            : (typeof value.Tax === 'number'
                                ? value.Tax
                                : (typeof value.GST === 'number'
                                    ? value.GST
                                    : (typeof value.Gst === 'number' ? value.Gst : undefined)))))))));

  let baseFare = rawBaseFare;
  let totalFare = rawTotalFare !== undefined ? rawTotalFare : (rawTax !== undefined ? baseFare + rawTax : baseFare);
  let serviceTax = rawTax !== undefined ? rawTax : (rawTotalFare !== undefined && rawTotalFare >= baseFare ? rawTotalFare - baseFare : 0);

  // If totalFare is smaller than baseFare and both are positive, swap/adjust
  if (totalFare < baseFare && totalFare > 0) {
    const temp = totalFare;
    totalFare = baseFare;
    baseFare = temp;
    serviceTax = totalFare - baseFare;
  }
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
