import { AppError } from '../middlewares/errorHandler';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

export class ShiftAssignmentRuleService {
  async create(data: {
    organizationId: string;
    displayName: string;
    shiftId: string;
    paygroupId?: string;
    departmentId?: string;
    effectiveDate: string; // YYYY-MM-DD
    priority?: number;
    remarks?: string;
    employeeIds?: string[];
  }) {
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId },
    });
    if (!organization) throw new AppError('Organization not found', 404);

    const shift = await prisma.shift.findUnique({
      where: { id: data.shiftId },
    });
    if (!shift || shift.organizationId !== data.organizationId) {
      throw new AppError('Shift not found', 404);
    }

    if (data.paygroupId) {
      const pg = await prisma.paygroup.findUnique({
        where: { id: data.paygroupId },
      });
      if (!pg || pg.organizationId !== data.organizationId) {
        throw new AppError('Paygroup not found', 404);
      }
    }
    if (data.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!dept || dept.organizationId !== data.organizationId) {
        throw new AppError('Department not found', 404);
      }
    }

    const rule = await prisma.shiftAssignmentRule.create({
      data: {
        organizationId: data.organizationId,
        displayName: data.displayName,
        shiftId: data.shiftId,
        paygroupId: data.paygroupId || null,
        departmentId: data.departmentId || null,
        effectiveDate: new Date(data.effectiveDate),
        priority: data.priority ?? null,
        remarks: data.remarks || null,
        employeeIds: (data.employeeIds ?? []) as unknown as Prisma.JsonArray,
      },
      include: {
        shift: { select: { id: true, name: true, code: true } },
        paygroup: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
    return rule;
  }

  async getAll(query: {
    organizationId?: string;
    page?: string;
    limit?: string;
    search?: string;
  }) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;
    const where: Prisma.ShiftAssignmentRuleWhereInput = {};
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.search?.trim()) {
      where.OR = [
        { displayName: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }
    const [rules, total] = await Promise.all([
      prisma.shiftAssignmentRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { effectiveDate: 'desc' },
        include: {
          shift: { select: { id: true, name: true, code: true } },
          paygroup: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.shiftAssignmentRule.count({ where }),
    ]);
    return {
      rules,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const rule = await prisma.shiftAssignmentRule.findUnique({
      where: { id },
      include: {
        shift: { select: { id: true, name: true, code: true } },
        paygroup: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
    if (!rule) throw new AppError('Shift assignment rule not found', 404);
    return rule;
  }

  async update(
    id: string,
    data: Partial<{
      displayName: string;
      shiftId: string;
      paygroupId: string;
      departmentId: string;
      effectiveDate: string;
      priority: number;
      remarks: string;
      employeeIds: string[];
    }>
  ) {
    const existing = await prisma.shiftAssignmentRule.findUnique({
      where: { id },
    });
    if (!existing) throw new AppError('Shift assignment rule not found', 404);

    if (data.shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: data.shiftId },
      });
      if (!shift || shift.organizationId !== existing.organizationId) {
        throw new AppError('Shift not found', 404);
      }
    }

    const rule = await prisma.shiftAssignmentRule.update({
      where: { id },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.shiftId !== undefined && { shiftId: data.shiftId }),
        ...(data.paygroupId !== undefined && { paygroupId: data.paygroupId || null }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId || null }),
        ...(data.effectiveDate !== undefined && { effectiveDate: new Date(data.effectiveDate) }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
        ...(data.employeeIds !== undefined && { employeeIds: data.employeeIds as unknown as Prisma.JsonArray }),
      },
      include: {
        shift: { select: { id: true, name: true, code: true } },
        paygroup: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });
    return rule;
  }

  async delete(id: string) {
    const existing = await prisma.shiftAssignmentRule.findUnique({
      where: { id },
    });
    if (!existing) throw new AppError('Shift assignment rule not found', 404);
    await prisma.shiftAssignmentRule.delete({ where: { id } });
    return { message: 'Shift assignment rule deleted successfully' };
  }
}

export const shiftAssignmentRuleService = new ShiftAssignmentRuleService();
