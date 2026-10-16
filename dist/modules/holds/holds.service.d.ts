import { HoldSeatsInput } from './holds.validation';
export declare class HoldsService {
    private static instance;
    private gdsAdapter;
    private holdsLogger;
    private constructor();
    static getInstance(): HoldsService;
    holdSeats(input: HoldSeatsInput, userId?: string): Promise<{
        id: string;
        holdId: string;
        providerHoldId: string;
        expiresAt: Date;
        ttlSeconds: number;
        totalFare: number;
        seats: {
            seatNo: string;
            seatTypeId: number;
            fare: number;
            gender: "M" | "F";
            age: number;
            name: string;
            isAcSeat: boolean;
        }[];
    }>;
    getHold(holdId: string): Promise<{
        userId: string | null;
        id: string;
        status: import(".prisma/client").$Enums.HoldStatus;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        providerName: string;
        providerHoldId: string;
        fromCityId: number;
        toCityId: number;
        journeyDate: string;
        busId: number;
        bookingId: string | null;
        seats: import("@prisma/client/runtime/library").JsonValue;
        releasedAt: Date | null;
    } | null>;
    checkHoldStatus(holdId: string): Promise<import("../../providers/types").GdsBookingStatusResponse>;
}
//# sourceMappingURL=holds.service.d.ts.map