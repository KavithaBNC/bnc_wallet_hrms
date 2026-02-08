import { AppError } from '../middlewares/errorHandler';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { parsePagination, parseString } from '../utils/queryParser';

export class RuleSettingService {
  async create(data: {
    organizationId: string;
    eventType: string;
    displayName: string;
    associate?: string;
    paygroupId?: string;
    departmentId?: string;
    priority?: number;
    remarks?: string;
    eventRuleDefinition?: Record<string, unknown>;
  }) {
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId },
    });
    if (!organization) {
      throw new AppError('Organization not found', 404);
    }
    if (data.paygroupId) {
      const paygroup = await prisma.paygroup.findUnique({
        where: { id: data.paygroupId },
      });
      if (!paygroup || paygroup.organizationId !== data.organizationId) {
        throw new AppError('Paygroup not found', 404);
      }
    }
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department || department.organizationId !== data.organizationId) {
        throw new AppError('Department not found', 404);
      }
    }

    const ruleSetting = await prisma.ruleSetting.create({
      data: {
        organizationId: data.organizationId,
        eventType: data.eventType.trim(),
        displayName: data.displayName.trim(),
        associate: data.associate?.trim() || null,
        paygroupId: data.paygroupId || null,
        departmentId: data.departmentId || null,
        priority: data.priority ?? 0,
        remarks: data.remarks?.trim() || null,
        eventRuleDefinition: (data.eventRuleDefinition ?? undefined) as Prisma.InputJsonValue | undefined,
      },
      include: {
        paygroup: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
    return ruleSetting;
  }

  async getAll(query: {
    organizationId?: string;
    eventType?: string;
    page?: string;
    limit?: string;
    search?: string;
  }) {
    const { page, limit } = parsePagination(query.page, query.limit);
    const skip = (page - 1) * limit;
    const search = parseString(query.search);

    const where: Prisma.RuleSettingWhereInput = {};
    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }
    if (query.eventType) {
      where.eventType = query.eventType;
    }
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { associate: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.ruleSetting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { priority: 'asc' },
        include: {
          paygroup: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.ruleSetting.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const ruleSetting = await prisma.ruleSetting.findUnique({
      where: { id },
      include: {
        paygroup: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
    if (!ruleSetting) {
      throw new AppError('Rule setting not found', 404);
    }
    return ruleSetting;
  }

  async update(
    id: string,
    data: {
      eventType?: string;
      displayName?: string;
      associate?: string;
      paygroupId?: string;
      departmentId?: string;
      priority?: number;
      remarks?: string;
      eventRuleDefinition?: Record<string, unknown>;
    }
  ) {
    const existing = await prisma.ruleSetting.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Rule setting not found', 404);
    }
    if (data.paygroupId !== undefined && data.paygroupId) {
      const paygroup = await prisma.paygroup.findUnique({
        where: { id: data.paygroupId },
      });
      if (!paygroup || paygroup.organizationId !== existing.organizationId) {
        throw new AppError('Paygroup not found', 404);
      }
    }
    if (data.departmentId !== undefined && data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department || department.organizationId !== existing.organizationId) {
        throw new AppError('Department not found', 404);
      }
    }

    const updateData: Prisma.RuleSettingUpdateInput = {};
    if (data.eventType !== undefined) updateData.eventType = data.eventType.trim();
    if (data.displayName !== undefined) updateData.displayName = data.displayName.trim();
    if (data.associate !== undefined) updateData.associate = data.associate?.trim() || null;
    if (data.paygroupId !== undefined) {
      updateData.paygroup = data.paygroupId ? { connect: { id: data.paygroupId } } : { disconnect: true };
    }
    if (data.departmentId !== undefined) {
      updateData.department = data.departmentId ? { connect: { id: data.departmentId } } : { disconnect: true };
    }
    if (data.priority !== undefined) updateData.priority = data.priority ?? 0;
    if (data.remarks !== undefined) updateData.remarks = data.remarks?.trim() || null;
    if (data.eventRuleDefinition !== undefined) updateData.eventRuleDefinition = data.eventRuleDefinition as Prisma.InputJsonValue;

    const ruleSetting = await prisma.ruleSetting.update({
      where: { id },
      data: updateData,
      include: {
        paygroup: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
    return ruleSetting;
  }

  async delete(id: string) {
    const existing = await prisma.ruleSetting.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Rule setting not found', 404);
    }
    await prisma.ruleSetting.delete({ where: { id } });
  }
}
