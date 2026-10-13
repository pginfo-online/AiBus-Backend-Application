"use strict";
// ---------------------------------------------------------------------------
// Admin City Management — Service
// City CRUD, active status toggling, GDS city sync triggering, cache invalidation
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.CityManagementService = void 0;
const database_1 = require("../../../infrastructure/database");
const redis_1 = require("../../../infrastructure/redis");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const constants_1 = require("../../../shared/constants");
const admin_utils_1 = require("../admin.utils");
const cities_service_1 = require("../../cities/cities.service");
class CityManagementService {
    static instance;
    logger = logger_1.logger.child({ module: 'admin-city-management' });
    static getInstance() {
        if (!CityManagementService.instance) {
            CityManagementService.instance = new CityManagementService();
        }
        return CityManagementService.instance;
    }
    async invalidateCitiesCache() {
        try {
            const redis = (0, redis_1.getRedisClient)();
            await redis.del(`${constants_1.RedisPrefix.CACHE_CITIES}gds`);
        }
        catch (err) {
            this.logger.warn({ err }, 'Failed to clear cities cache in Redis');
        }
    }
    /**
     * List all cities with filtering and pagination
     */
    async listCities(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const { skip, take, page, limit } = (0, admin_utils_1.buildPagination)(query);
        const where = {};
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
        const orderBy = {};
        if (query.sortBy) {
            orderBy[query.sortBy] = query.sortOrder || 'asc';
        }
        else {
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
    async getCityById(id) {
        const prisma = (0, database_1.getPrismaClient)();
        const city = await prisma.city.findUnique({
            where: { id },
        });
        if (!city) {
            throw new errors_1.NotFoundError(`City with ID '${id}' not found`);
        }
        return city;
    }
    /**
     * Create a new city manually
     */
    async createCity(input, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
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
                throw new errors_1.ConflictError(`City with providerCityId ${input.providerCityId} already exists under provider ${input.providerName || 'GDS'}`);
            }
        }
        const city = await prisma.city.create({
            data: {
                name: input.name,
                state: input.state,
                providerCityId: input.providerCityId,
                providerName: input.providerName || 'GDS',
                aliases: input.aliases ? input.aliases : undefined,
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
    async updateCity(id, input, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) {
            throw new errors_1.NotFoundError(`City with ID '${id}' not found`);
        }
        const updated = await prisma.city.update({
            where: { id },
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.state !== undefined && { state: input.state }),
                ...(input.providerCityId !== undefined && { providerCityId: input.providerCityId }),
                ...(input.providerName !== undefined && { providerName: input.providerName }),
                ...(input.aliases !== undefined && { aliases: input.aliases }),
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
    async deactivateCity(id, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.city.findUnique({ where: { id } });
        if (!existing) {
            throw new errors_1.NotFoundError(`City with ID '${id}' not found`);
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
    async syncCities(adminId) {
        const count = await cities_service_1.CitiesService.getInstance().syncCities();
        const prisma = (0, database_1.getPrismaClient)();
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
exports.CityManagementService = CityManagementService;
//# sourceMappingURL=city-management.service.js.map