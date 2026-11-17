import { PassengerInput } from "./users.validation";
export declare class PassengersService {
    list(userId: string): Promise<{
        name: string;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        dateOfBirth: Date | null;
        gender: string;
        age: number | null;
        ageRecordedOn: Date | null;
        mobile: string | null;
    }[]>;
    save(userId: string, input: PassengerInput, id?: string, requestKey?: string): Promise<{
        name: string;
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        dateOfBirth: Date | null;
        gender: string;
        age: number | null;
        ageRecordedOn: Date | null;
        mobile: string | null;
    }>;
}
//# sourceMappingURL=passengers.service.d.ts.map