// ---------------------------------------------------------------------------
// Admin System Configuration — Service
// Dynamic key-value configs, feature flag toggles, and detailed system diagnostics
// ---------------------------------------------------------------------------

import { SystemConfigType } from '@prisma/client';
import { getPrismaClient } from '../../../infrastructure/database';
import { getRedisClient } from '../../../infrastructure/redis';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError, ConflictError } from '../../../shared/errors';
import {
  CreateConfigInput,
  UpdateConfigInput,
  CreateFeatureFlagInput,
  ToggleFeatureFlagInput,
} from './system-config.validation';

export class SystemConfigService {
  private static instance: SystemConfigService;
  private readonly logger = logger.child({ module: 'admin-system-config' });

  public static getInstance(): SystemConfigService {
    if (!SystemConfigService.instance) {
      SystemConfigService.instance = new SystemConfigService();
    }
    return SystemConfigService.instance;
  }

  // -------------------------------------------------------------------------
  // Dynamic Configuration
  // -------------------------------------------------------------------------

  /**
   * Get all configuration entries, optionally filtered by group
   */
  public async getConfigs(group?: string): Promise<any[]> {
    const prisma = getPrismaClient();

    const where: any = {};
    if (group) {
      where.group = group;
    }

    const configs = await prisma.systemConfig.findMany({
      where,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    // Mask secret configs
    return configs.map((c) => ({
      ...c,
      value: c.isSecret ? '********' : c.value,
    }));
  }

  /**
   * Get single config entry by key
   */
  public async getConfigByKey(key: string): Promise<any> {
    const prisma = getPrismaClient();

    const config = await prisma.systemConfig.findUnique({ where: { key } });
    if (!config) {
      throw new NotFoundError(`System configuration with key '${key}' not found`);
    }

    return {
      ...config,
      value: config.isSecret ? '********' : config.value,
    };
  }

  /**
   * Create new system config
   */
  public async createConfig(input: CreateConfigInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.systemConfig.findUnique({ where: { key: input.key } });
    if (existing) {
      throw new ConflictError(`System configuration with key '${input.key}' already exists`);
    }

    const created = await prisma.systemConfig.create({
      data: {
        key: input.key,
        value: input.value,
        type: (input.type as SystemConfigType) || SystemConfigType.STRING,
        description: input.description,
        group: input.group || 'general',
        isSecret: input.isSecret ?? false,
        updatedBy: adminId,
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'CREATE_SYSTEM_CONFIG',
        module: 'system-config',
        resourceType: 'system_config',
        resourceId: created.id,
        details: { key: created.key, group: created.group },
      },
    });

    this.logger.info({ key: created.key, adminId }, 'System configuration created');
    return {
      ...created,
      value: created.isSecret ? '********' : created.value,
    };
  }

  /**
   * Update existing system config
   */
  public async updateConfig(key: string, input: UpdateConfigInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundError(`System configuration with key '${key}' not found`);
    }

    const updated = await prisma.systemConfig.update({
      where: { key },
      data: {
        value: input.value,
        ...(input.description !== undefined && { description: input.description }),
        ...(input.group !== undefined && { group: input.group }),
        ...(input.isSecret !== undefined && { isSecret: input.isSecret }),
        updatedBy: adminId,
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'UPDATE_SYSTEM_CONFIG',
        module: 'system-config',
        resourceType: 'system_config',
        resourceId: updated.id,
        details: { key },
      },
    });

    this.logger.info({ key, adminId }, 'System configuration updated');
    return {
      ...updated,
      value: updated.isSecret ? '********' : updated.value,
    };
  }

  /**
   * Delete a system config entry
   */
  public async deleteConfig(key: string, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundError(`System configuration with key '${key}' not found`);
    }

    await prisma.systemConfig.delete({ where: { key } });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'DELETE_SYSTEM_CONFIG',
        module: 'system-config',
        resourceType: 'system_config',
        details: { key },
      },
    });

    this.logger.info({ key, adminId }, 'System configuration deleted');
    return { deleted: true, key };
  }

  // -------------------------------------------------------------------------
  // Feature Flags
  // -------------------------------------------------------------------------

  /**
   * Get all feature flags
   */
  public async getFeatureFlags(): Promise<any[]> {
    const prisma = getPrismaClient();
    return prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Create a new feature flag
   */
  public async createFeatureFlag(input: CreateFeatureFlagInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.featureFlag.findUnique({ where: { key: input.key } });
    if (existing) {
      throw new ConflictError(`Feature flag with key '${input.key}' already exists`);
    }

    const flag = await prisma.featureFlag.create({
      data: {
        key: input.key,
        enabled: input.enabled ?? false,
        description: input.description,
        metadata: input.metadata ? (input.metadata as any) : undefined,
        updatedBy: adminId,
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'CREATE_FEATURE_FLAG',
        module: 'system-config',
        resourceType: 'feature_flag',
        resourceId: flag.id,
        details: { key: flag.key, enabled: flag.enabled },
      },
    });

    this.logger.info({ key: flag.key, enabled: flag.enabled, adminId }, 'Feature flag created');
    return flag;
  }

  /**
   * Toggle or update a feature flag
   */
  public async toggleFeatureFlag(
    key: string,
    input: ToggleFeatureFlagInput,
    adminId: string
  ): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.featureFlag.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundError(`Feature flag with key '${key}' not found`);
    }

    const updated = await prisma.featureFlag.update({
      where: { key },
      data: {
        enabled: input.enabled,
        ...(input.metadata !== undefined && { metadata: input.metadata as any }),
        updatedBy: adminId,
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'TOGGLE_FEATURE_FLAG',
        module: 'system-config',
        resourceType: 'feature_flag',
        resourceId: updated.id,
        details: { key, enabled: input.enabled },
      },
    });

    this.logger.info({ key, enabled: input.enabled, adminId }, 'Feature flag toggled');
    return updated;
  }

  // -------------------------------------------------------------------------
  // Detailed System Health
  // -------------------------------------------------------------------------

  /**
   * Comprehensive system health diagnostics
   */
  public async getDetailedSystemHealth(): Promise<any> {
    const prisma = getPrismaClient();
    const redis = getRedisClient();

    // Check DB
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = 'unhealthy';
    }

    // Check Redis
    let redisStatus = 'healthy';
    let redisLatencyMs = 0;
    let redisMemory = 'unknown';
    try {
      const redisStart = Date.now();
      await redis.ping();
      redisLatencyMs = Date.now() - redisStart;
      const info = await redis.info('memory');
      const match = info.match(/used_memory_human:(.*)/);
      if (match && match[1]) {
        redisMemory = match[1].trim();
      }
    } catch {
      redisStatus = 'unhealthy';
    }

    const memoryUsage = process.memoryUsage();

    return {
      status: dbStatus === 'healthy' && redisStatus === 'healthy' ? 'operational' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatencyMs,
        memoryUsed: redisMemory,
      },
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        memory: {
          heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        },
      },
    };
  }
}
