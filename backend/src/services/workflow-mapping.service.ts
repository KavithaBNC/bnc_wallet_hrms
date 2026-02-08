import { AppError } from '../middlewares/errorHandler';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { parsePagination, parseString } from '../utils/queryParser';

export class WorkflowMappingService {
  /**
   * Create new workflow mapping
   */
  async create(data: {
    organizationId: string;
    displayName: string;
    associate?: string;
    paygroupId?: string;
    departmentId?: string;
    priority?: number;
    remarks?: string;
    entryRightsTemplate?: string;
    approvalLevels?: any;
  }) {
    // Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId },
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Validate paygroup if provided
    if (data.paygroupId) {
      const paygroup = await prisma.paygroup.findUnique({
        where: { id: data.paygroupId },
      });
      if (!paygroup || paygroup.organizationId !== data.organizationId) {
        throw new AppError('Paygroup not found', 404);
      }
    }

    // Validate department if provided
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department || department.organizationId !== data.organizationId) {
        throw new AppError('Department not found', 404);
      }
    }

    const workflowMapping = await prisma.workflowMapping.create({
      data: {
        organizationId: data.organizationId,
        displayName: data.displayName.trim(),
        associate: data.associate?.trim() || null,
        paygroupId: data.paygroupId || null,
        departmentId: data.departmentId || null,
        priority: data.priority ?? null,
        remarks: data.remarks?.trim() || null,
        entryRightsTemplate: data.entryRightsTemplate?.trim() || null,
        approvalLevels: data.approvalLevels
          ? (data.approvalLevels as unknown as Prisma.JsonArray)
          : Prisma.JsonNull,
      },
      include: {
        paygroup: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return workflowMapping;
  }

  /**
   * Get all workflow mappings with pagination
   */
  async getAll(query: {
    organizationId?: string;
    page?: string;
    limit?: string;
    search?: string;
    workflowType?: string;
  }) {
    const { page, limit } = parsePagination(query.page, query.limit);
    const skip = (page - 1) * limit;
    const search = parseString(query.search);

    const where: Prisma.WorkflowMappingWhereInput = {};

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { associate: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.workflowMapping.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          paygroup: {
            select: {
              id: true,
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.workflowMapping.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get workflow mapping by ID
   */
  async getById(id: string) {
    const workflowMapping = await prisma.workflowMapping.findUnique({
      where: { id },
      include: {
        paygroup: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!workflowMapping) {
      throw new AppError('Workflow mapping not found', 404);
    }

    return workflowMapping;
  }

  /**
   * Update workflow mapping
   */
  async update(
    id: string,
    data: {
      displayName?: string;
      associate?: string;
      paygroupId?: string;
      departmentId?: string;
      priority?: number;
      remarks?: string;
      entryRightsTemplate?: string;
      approvalLevels?: any;
    }
  ) {
    const existing = await prisma.workflowMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Workflow mapping not found', 404);
    }

    // Validate paygroup if provided
    if (data.paygroupId !== undefined) {
      if (data.paygroupId) {
        const paygroup = await prisma.paygroup.findUnique({
          where: { id: data.paygroupId },
        });
        if (!paygroup || paygroup.organizationId !== existing.organizationId) {
          throw new AppError('Paygroup not found', 404);
        }
      }
    }

    // Validate department if provided
    if (data.departmentId !== undefined) {
      if (data.departmentId) {
        const department = await prisma.department.findUnique({
          where: { id: data.departmentId },
        });
        if (!department || department.organizationId !== existing.organizationId) {
          throw new AppError('Department not found', 404);
        }
      }
    }

    const updateData: Prisma.WorkflowMappingUpdateInput = {};

    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName.trim();
    }
    if (data.associate !== undefined) {
      updateData.associate = data.associate?.trim() || null;
    }
    if (data.paygroupId !== undefined) {
      if (data.paygroupId) {
        updateData.paygroup = { connect: { id: data.paygroupId } };
      } else {
        updateData.paygroup = { disconnect: true };
      }
    }
    if (data.departmentId !== undefined) {
      if (data.departmentId) {
        updateData.department = { connect: { id: data.departmentId } };
      } else {
        updateData.department = { disconnect: true };
      }
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority ?? null;
    }
    if (data.remarks !== undefined) {
      updateData.remarks = data.remarks?.trim() || null;
    }
    if (data.entryRightsTemplate !== undefined) {
      updateData.entryRightsTemplate = data.entryRightsTemplate?.trim() || null;
    }
    if (data.approvalLevels !== undefined) {
      updateData.approvalLevels = data.approvalLevels
        ? (data.approvalLevels as unknown as Prisma.JsonArray)
        : Prisma.JsonNull;
    }

    const workflowMapping = await prisma.workflowMapping.update({
      where: { id },
      data: updateData,
      include: {
        paygroup: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return workflowMapping;
  }

  /**
   * Delete workflow mapping
   */
  async delete(id: string) {
    const existing = await prisma.workflowMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Workflow mapping not found', 404);
    }

    await prisma.workflowMapping.delete({
      where: { id },
    });
  }
}
