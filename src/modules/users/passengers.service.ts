import { getPrismaClient } from "../../infrastructure/database";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { PassengerInput } from "./users.validation";
import { createHash } from "node:crypto";

export class PassengersService {
  async list(userId: string) {
    return getPrismaClient().savedPassenger.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 100,
    });
  }

  async save(
    userId: string,
    input: PassengerInput,
    id?: string,
    requestKey?: string,
  ) {
    const prisma = getPrismaClient();
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
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      if (id) {
        const result = await tx.savedPassenger.updateMany({
          where: { id, userId },
          data,
        });
        if (!result.count) throw new NotFoundError("Passenger");
        return tx.savedPassenger.findFirstOrThrow({ where: { id, userId } });
      }
      // A retried create after a lost response returns the same passenger. Scope keys to the owner.
      const digest = requestKey
        ? createHash("sha256")
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
          if (
            previous.name !== data.name ||
            previous.gender !== data.gender ||
            previous.mobile !== data.mobile ||
            previous.age !== (data.age ?? null) ||
            previous.dateOfBirth?.toISOString().slice(0, 10) !==
              data.dateOfBirth?.toISOString().slice(0, 10)
          ) {
            throw new ConflictError(
              "This request key was already used for different passenger details",
            );
          }
          return previous;
        }
      }
      if ((await tx.savedPassenger.count({ where: { userId } })) >= 100) {
        throw new ConflictError("You can save up to 100 passengers");
      }
      return tx.savedPassenger.create({
        data: { ...data, userId, id: createId },
      });
    });
  }
}
