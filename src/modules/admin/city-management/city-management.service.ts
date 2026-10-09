// ---------------------------------------------------------------------------
// Admin City Management — Service
// City CRUD, active status toggling, GDS city sync triggering, cache invalidation
// ---------------------------------------------------------------------------

import { getPrismaClient } from '../../../infrastructure/database';
import { getRedisClient } from '../../../infrastructure/redis';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError, ConflictError } from '../../../shared/errors';
import { RedisPrefix } from '../../../shared/constants';
import { buildPagination, PaginatedResult } from '../admin.utils';
import { ListCitiesQuery, CreateCityInput, UpdateCityInput } from './city-management.validation';
import { CitiesService } from '../../cities/cities.service';

export class CityManagementService {
  private static instance: CityManagementService;
  private readonly logger = logger.child({ module: 'admin-city-management' });

  public static getInstance(): CityManagementService {
    if (!CityManagementService.instance) {
      CityManagementService.instance = new CityManagementService();
    }
    return CityManagementService.instance;
  }

  private async invalidateCitiesCache(): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(`${RedisPrefix.CACHE_CITIES}gds`);
    } catch (err) {
      this.logger.warn({ err }, 'Failed to clear cities cache in Redis');
    }
  }

  /**
   * List all cities with filtering and pagination
   */
  public async listCities(query: ListCitiesQuery): Promise<PaginatedResult<any>> {
    const prisma = getPrismaClient();
    const { skip, take, page, limit } = buildPagination(query);

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { state: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.state) {
      where.state = { contains: query.state, mode: 'insensitive' };
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
    } else {
      orderBy.name = 'asc';
    }

    const [total, cities] = await Promise.all([
      prisma.city.count({ where }),
      prisma.city.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: cities,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get city details by ID
   */
  public async getCityById(id: string): Promise<any> {
    const prisma = getPrismaClient();

    const city = await prisma.city.findUnique({
      where: { id },
    });

    if (!city) {
      throw new NotFoundError(`City with ID '${id}' not found`);
    }

    return city;
  }

  /**
   * Create a new city manually
   */
  public async createCity(input: CreateCityInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    if (input.providerCityId) {
      const existing = await prisma.city.findUnique({
        where: {
          providerName_providerCityId: {
            providerName: input.providerName || 'GDS',
            providerCityId: input.providerCityId,
          },
        },
      });

      if (existing) {
        throw new ConflictError(
          `City with providerCityId ${input.providerCityId} already exists under provider ${input.providerName || 'GDS'}`
        );
      }
    }

    const city = await prisma.city.create({
      data: {
        name: input.name,
        state: input.state,
        providerCityId: input.providerCityId,
        providerName: input.providerName || 'GDS',
        aliases: input.aliases ? (input.aliases as any) : undefined,
        active: input.active ?? true,
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'CREATE_CITY',
        module: 'city-management',
        resourceType: 'city',
        resourceId: city.id,
        details: { name: city.name, state: city.state },
      },
    });

    await this.invalidateCitiesCache();
    this.logger.info({ cityId: city.id, adminId }, 'City created successfully');
    return city;
  }

  /**
   * Update an existing city
   */
  public async updateCity(id: string, input: UpdateCityInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.city.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`City with ID '${id}' not found`);
    }

    const updated = await prisma.city.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.state !== undefined && { state: input.state }),
        ...(input.providerCityId !== undefined && { providerCityId: input.providerCityId }),
        ...(input.providerName !== undefined && { providerName: input.providerName }),
        ...(input.aliases !== undefined && { aliases: input.aliases as any }),
        ...(input.active !== undefined && { active: input.active }),
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'UPDATE_CITY',
        module: 'city-management',
        resourceType: 'city',
        resourceId: id,
        details: { changes: input },
      },
    });

    await this.invalidateCitiesCache();
    this.logger.info({ cityId: id, adminId }, 'City updated successfully');
    return updated;
  }

  /**
   * Deactivate or soft-delete a city
   */
  public async deactivateCity(id: string, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.city.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`City with ID '${id}' not found`);
    }

    const updated = await prisma.city.update({
      where: { id },
      data: { active: false },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'DEACTIVATE_CITY',
        module: 'city-management',
        resourceType: 'city',
        resourceId: id,
      },
    });

    await this.invalidateCitiesCache();
    this.logger.info({ cityId: id, adminId }, 'City deactivated');
    return updated;
  }

  /**
   * Trigger GDS city synchronization
   */
  public async syncCities(adminId: string): Promise<{ syncedCount: number }> {
    const count = await CitiesService.getInstance().syncCities();

    const prisma = getPrismaClient();
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'SYNC_CITIES_GDS',
        module: 'city-management',
        resourceType: 'city',
        details: { syncedCount: count },
      },
    });

    await this.invalidateCitiesCache();
    this.logger.info({ adminId, count }, 'City sync completed from GDS');
    return { syncedCount: count };
  }
}
