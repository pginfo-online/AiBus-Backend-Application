"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
class UsersService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!UsersService.instance) {
            UsersService.instance = new UsersService();
        }
        return UsersService.instance;
    }
    async getProfile(userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                dateOfBirth: true,
                gender: true,
                state: true,
                personalPhone: true,
                contactEmail: true,
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                status: true,
                walletBalance: true,
                emailVerified: true,
                phoneVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw new errors_1.NotFoundError("User not found");
        }
        return user;
    }
    async updateProfile(userId, data) {
        // Contact fields are separate from verified login identities. Editing them cannot claim another account.
        await (0, database_1.getPrismaClient)().user.update({
            where: { id: userId },
            data: {
                ...data,
                dateOfBirth: data.dateOfBirth === undefined
                    ? undefined
                    : data.dateOfBirth
                        ? new Date(`${data.dateOfBirth}T00:00:00Z`)
                        : null,
            },
        });
        return this.getProfile(userId);
    }
    async getWallet(userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                walletBalance: true,
                walletTransactions: {
                    orderBy: { createdAt: "desc" },
                    take: 50,
                },
            },
        });
        if (!user) {
            throw new errors_1.NotFoundError("User not found");
        }
        return {
            walletBalance: Number(user.walletBalance),
            transactions: user.walletTransactions.map((tx) => ({
                id: tx.id,
                type: tx.type,
                amount: Number(tx.amount),
                balanceAfter: Number(tx.balanceAfter),
                referenceType: tx.referenceType,
                referenceId: tx.referenceId,
                description: tx.description,
                createdAt: tx.createdAt,
            })),
        };
    }
}
exports.UsersService = UsersService;
//# sourceMappingURL=users.service.js.map