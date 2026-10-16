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
            throw new errors_1.NotFoundError('User not found');
        }
        return user;
    }
    async updateProfile(userId, data) {
        const prisma = (0, database_1.getPrismaClient)();
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.firstName && { firstName: data.firstName }),
                ...(data.lastName && { lastName: data.lastName }),
                ...(data.phone && { phone: data.phone }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                status: true,
                walletBalance: true,
                updatedAt: true,
            },
        });
        return updated;
    }
}
exports.UsersService = UsersService;
//# sourceMappingURL=users.service.js.map