"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PassengersService = void 0;
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
const node_crypto_1 = require("node:crypto");
class PassengersService {
    async list(userId) {
        return (0, database_1.getPrismaClient)().savedPassenger.findMany({
            where: { userId },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 100,
        });
    }
    async save(userId, input, id, requestKey) {
        const prisma = (0, database_1.getPrismaClient)();
        const data = {
            name: input.name,
            gender: input.gender,
            mobile: input.mobile ?? null,
            dateOfBirth: input.dateOfBirth
                ? new Date(`${input.dateOfBirth}T00:00:00Z`)
                : null,
            age: input.dateOfBirth ? null : input.age,
            ageRecordedOn: input.dateOfBirth ? null : new Date(),
        };
        // Serialize writes for one owner's address book, keeping its bound safe under concurrency.
        return prisma.$transaction(async (tx) => {
            await tx.$queryRaw `SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
            if (id) {
                const result = await tx.savedPassenger.updateMany({
                    where: { id, userId },
                    data,
                });
                if (!result.count)
                    throw new errors_1.NotFoundError("Passenger");
                return tx.savedPassenger.findFirstOrThrow({ where: { id, userId } });
            }
            // A retried create after a lost response returns the same passenger. Scope keys to the owner.
            const digest = requestKey
                ? (0, node_crypto_1.createHash)("sha256")
                    .update(`${userId}:${requestKey}`)
                    .digest("hex")
                    .slice(0, 32)
                : undefined;
            const createId = digest
                ? `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20)}`
                : undefined;
            if (createId) {
                const previous = await tx.savedPassenger.findFirst({
                    where: { id: createId, userId },
                });
                if (previous) {
                    if (previous.name !== data.name ||
                        previous.gender !== data.gender ||
                        previous.mobile !== data.mobile ||
                        previous.age !== (data.age ?? null) ||
                        previous.dateOfBirth?.toISOString().slice(0, 10) !==
                            data.dateOfBirth?.toISOString().slice(0, 10)) {
                        throw new errors_1.ConflictError("This request key was already used for different passenger details");
                    }
                    return previous;
                }
            }
            if ((await tx.savedPassenger.count({ where: { userId } })) >= 100) {
                throw new errors_1.ConflictError("You can save up to 100 passengers");
            }
            return tx.savedPassenger.create({
                data: { ...data, userId, id: createId },
            });
        });
    }
}
exports.PassengersService = PassengersService;
//# sourceMappingURL=passengers.service.js.map