export declare class UsersService {
    private static instance;
    private constructor();
    static getInstance(): UsersService;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        phoneVerified: boolean;
        walletBalance: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    }): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        walletBalance: import("@prisma/client/runtime/library").Decimal;
        updatedAt: Date;
    }>;
    getWallet(userId: string): Promise<{
        walletBalance: number;
        transactions: {
            id: string;
            type: import(".prisma/client").$Enums.WalletTransactionType;
            amount: number;
            balanceAfter: number;
            referenceType: string;
            referenceId: string | null;
            description: string | null;
            createdAt: Date;
        }[];
    }>;
}
//# sourceMappingURL=users.service.d.ts.map