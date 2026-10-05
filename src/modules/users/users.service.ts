import { getPrismaClient } from '../../infrastructure/database';
import { NotFoundError } from '../../shared/errors';

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
      throw new NotFoundError('User not found');
    }

    return user;
  }

  public async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    const prisma = getPrismaClient();

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
