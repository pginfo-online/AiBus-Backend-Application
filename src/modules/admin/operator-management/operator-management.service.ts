// ---------------------------------------------------------------------------
// Admin Operator Management — Service
// Operator onboarding, status control, profile management, and bookings inquiry
// ---------------------------------------------------------------------------

import { OperatorStatus } from '@prisma/client';
import { getPrismaClient } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError, ConflictError } from '../../../shared/errors';
import { buildPagination, PaginatedResult } from '../admin.utils';
import {
  ListOperatorsQuery,
  CreateOperatorInput,
  UpdateOperatorInput,
} from './operator-management.validation';

export class OperatorManagementService {
  private static instance: OperatorManagementService;
  private readonly logger = logger.child({ module: 'admin-operator-management' });

  public static getInstance(): OperatorManagementService {
    if (!OperatorManagementService.instance) {
      OperatorManagementService.instance = new OperatorManagementService();
    }
    return OperatorManagementService.instance;
  }

  /**
   * List operators with filtering and pagination
   */
  public async listOperators(query: ListOperatorsQuery): Promise<PaginatedResult<any>> {
    const prisma = getPrismaClient();
    const { skip, take, page, limit } = buildPagination(query);

    const where: any = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status as OperatorStatus;
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.state) {
      where.state = { contains: query.state, mode: 'insensitive' };
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
    } else {
      orderBy.name = 'asc';
    }

    const [total, operators] = await Promise.all([
      prisma.operator.count({ where }),
      prisma.operator.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: operators,
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
   * Get single operator with full metadata
   */
  public async getOperatorById(id: string): Promise<any> {
    const prisma = getPrismaClient();

    const operator = await prisma.operator.findUnique({
      where: { id },
    });

    if (!operator) {
      throw new NotFoundError(`Operator with ID '${id}' not found`);
    }

    return operator;
  }

  /**
   * Create a new operator
   */
  public async createOperator(input: CreateOperatorInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.operator.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new ConflictError(`Operator with code '${input.code}' already exists`);
    }

    const operator = await prisma.operator.create({
      data: {
        name: input.name,
        code: input.code,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        status: (input.status as OperatorStatus) || OperatorStatus.ACTIVE,
        providerName: input.providerName || 'GDS',
        providerOperatorId: input.providerOperatorId,
        commissionPct: input.commissionPct,
        gstNumber: input.gstNumber,
        panNumber: input.panNumber,
        address: input.address,
        city: input.city,
        state: input.state,
        metadata: input.metadata ? (input.metadata as any) : undefined,
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'CREATE_OPERATOR',
        module: 'operator-management',
        resourceType: 'operator',
        resourceId: operator.id,
        details: { code: operator.code, name: operator.name },
      },
    });

    this.logger.info({ operatorId: operator.id, adminId, code: operator.code }, 'Operator created');
    return operator;
  }

  /**
   * Update operator details
   */
  public async updateOperator(id: string, input: UpdateOperatorInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.operator.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Operator with ID '${id}' not found`);
    }

    if (input.code && input.code !== existing.code) {
      const codeConflict = await prisma.operator.findUnique({ where: { code: input.code } });
      if (codeConflict) {
        throw new ConflictError(`Operator code '${input.code}' is already taken`);
      }
    }

    const updated = await prisma.operator.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.code !== undefined && { code: input.code }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
        ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
        ...(input.status !== undefined && { status: input.status as OperatorStatus }),
        ...(input.providerName !== undefined && { providerName: input.providerName }),
        ...(input.providerOperatorId !== undefined && { providerOperatorId: input.providerOperatorId }),
        ...(input.commissionPct !== undefined && { commissionPct: input.commissionPct }),
        ...(input.gstNumber !== undefined && { gstNumber: input.gstNumber }),
        ...(input.panNumber !== undefined && { panNumber: input.panNumber }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.state !== undefined && { state: input.state }),
        ...(input.metadata !== undefined && { metadata: input.metadata as any }),
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'UPDATE_OPERATOR',
        module: 'operator-management',
        resourceType: 'operator',
        resourceId: id,
        details: JSON.parse(JSON.stringify({ changes: input })),
      },
    });

    this.logger.info({ operatorId: id, adminId }, 'Operator updated');
    return updated;
  }

  /**
   * Suspend an operator
   */
  public async suspendOperator(id: string, reason: string, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.operator.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Operator with ID '${id}' not found`);
    }

    const updated = await prisma.operator.update({
      where: { id },
      data: { status: OperatorStatus.SUSPENDED },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'SUSPEND_OPERATOR',
        module: 'operator-management',
        resourceType: 'operator',
        resourceId: id,
        details: { reason },
      },
    });

    this.logger.info({ operatorId: id, adminId, reason }, 'Operator suspended');
    return updated;
  }

  /**
   * Activate an operator
   */
  public async activateOperator(id: string, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.operator.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Operator with ID '${id}' not found`);
    }

    const updated = await prisma.operator.update({
      where: { id },
      data: { status: OperatorStatus.ACTIVE },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'ACTIVATE_OPERATOR',
        module: 'operator-management',
        resourceType: 'operator',
        resourceId: id,
      },
    });

    this.logger.info({ operatorId: id, adminId }, 'Operator activated');
    return updated;
  }

  /**
   * Get bookings associated with an operator
   */
  public async getOperatorBookings(
    operatorId: string,
    query: { page?: number; limit?: number }
  ): Promise<PaginatedResult<any>> {
    const prisma = getPrismaClient();

    const operator = await prisma.operator.findUnique({ where: { id: operatorId } });
    if (!operator) {
      throw new NotFoundError(`Operator with ID '${operatorId}' not found`);
    }

    const { skip, take, page, limit } = buildPagination(query);

    const where: any = {
      operatorName: { contains: operator.name, mode: 'insensitive' },
    };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          fromCityName: true,
          toCityName: true,
          journeyDate: true,
          totalFare: true,
          createdAt: true,
          user: {
            select: { firstName: true, lastName: true, email: true, phone: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: bookings,
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
}
