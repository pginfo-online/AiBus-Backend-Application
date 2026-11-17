import { getPrismaClient } from "../../infrastructure/database";
import { ProfileInput } from "./users.validation";
import { NotFoundError } from "../../shared/errors";

export class UsersService {
  private static instance: UsersService;

  private constructor() {}

  public static getInstance(): UsersService {
    if (!UsersService.instance) {
      UsersService.instance = new UsersService();
    }
    return UsersService.instance;
  }

  public async getProfile(userId: string) {
    const prisma = getPrismaClient();
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
      throw new NotFoundError("User not found");
    }

    return user;
  }

  public async updateProfile(userId: string, data: ProfileInput) {
    // Contact fields are separate from verified login identities. Editing them cannot claim another account.
    await getPrismaClient().user.update({
      where: { id: userId },
      data: {
        ...data,
        dateOfBirth:
          data.dateOfBirth === undefined
            ? undefined
            : data.dateOfBirth
              ? new Date(`${data.dateOfBirth}T00:00:00Z`)
              : null,
      },
    });
    return this.getProfile(userId);
  }

  public async getWallet(userId: string) {
    const prisma = getPrismaClient();
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
      throw new NotFoundError("User not found");
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
