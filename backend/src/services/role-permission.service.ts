
import type { UserRole as UserRoleType } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/errorHandler';

export interface AssignPermissionInput {
  role: UserRoleType | string;
  permissionIds: string[];
  organizationId?: string; // Optional: for org-specific permissions
}

export interface RemovePermissionInput {
  role: UserRoleType | string;
  permissionId: string;
  organizationId?: string;
}

export class RolePermissionService {
  /**
   * Assign permissions to a role
   */
  async assignPermissions(data: AssignPermissionInput): Promise<{
    assigned: number;
    skipped: number;
  }> {
    const { role, permissionIds, organizationId } = data;

    let assigned = 0;
    let skipped = 0;

    for (const permissionId of permissionIds) {
      // Check if permission exists
      const permission = await prisma.permission.findUnique({
        where: { id: permissionId },
      });

      if (!permission) {
        skipped++;
        continue;
      }

      // Check if already assigned
      const existing = await prisma.rolePermission.findFirst({
        where: {
          role: role as UserRole,
          permissionId,
          organizationId: organizationId || null,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Assign permission
      await prisma.rolePermission.create({
        data: {
          role: role as UserRole,
          permissionId,
          organizationId: organizationId || null,
        },
      });

      assigned++;
    }

    return { assigned, skipped };
  }

  /**
   * Remove permission from a role
   */
  async removePermission(data: RemovePermissionInput): Promise<void> {
    const { role, permissionId, organizationId } = data;

    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role: role as UserRole,
        permissionId,
        organizationId: organizationId || null,
      },
    });

    if (!rolePermission) {
      throw new AppError('Permission not assigned to this role', 404);
    }

    await prisma.rolePermission.delete({
      where: { id: rolePermission.id },
    });
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(
    role: UserRoleType,
    organizationId?: string
  ): Promise<any[]> {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: role as UserRole,
        organizationId: organizationId || null,
      },
      include: {
        permission: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Sort permissions manually by module, resource, action
    rolePermissions.sort((a, b) => {
      const permA = a.permission;
      const permB = b.permission;
      
      // First by module
      if (permA.module !== permB.module) {
        return (permA.module || '').localeCompare(permB.module || '');
      }
      // Then by resource
      if (permA.resource !== permB.resource) {
        return permA.resource.localeCompare(permB.resource);
      }
      // Finally by action
      return permA.action.localeCompare(permB.action);
    });

    return rolePermissions.map((rp) => ({
      id: rp.id,
      role: rp.role,
      permission: rp.permission,
      organizationId: rp.organizationId,
      createdAt: rp.createdAt,
    }));
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(
    role: UserRole,
    resource: string,
    action: string,
    organizationId?: string
  ): Promise<boolean> {
    // First, find the permission
    const permission = await prisma.permission.findFirst({
      where: {
        resource,
        action,
      },
    });

    if (!permission) {
      return false;
    }

    // Check if role has this permission (system-wide or org-specific)
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role: role as UserRole,
        permissionId: permission.id,
        OR: [
          { organizationId: null }, // System-wide permission
          { organizationId: organizationId || null }, // Org-specific permission
        ],
      },
    });

    return !!rolePermission;
  }

  /**
   * Get all permissions for a user (considering their role and organization)
   */
  async getUserPermissions(
    role: UserRoleType,
    organizationId?: string
  ): Promise<any[]> {
    // Get system-wide permissions
    const systemPermissions = await prisma.rolePermission.findMany({
      where: {
        role: role as UserRole,
        organizationId: null,
      },
      include: {
        permission: true,
      },
    });

    // Get org-specific permissions if organizationId is provided
    let orgPermissions: any[] = [];
    if (organizationId) {
      orgPermissions = await prisma.rolePermission.findMany({
        where: {
          role: role as UserRole,
          organizationId,
        },
        include: {
          permission: true,
        },
      });
    }

    // Combine and deduplicate
    const allPermissions = [...systemPermissions, ...orgPermissions];
    const uniquePermissions = new Map();

    allPermissions.forEach((rp) => {
      if (!uniquePermissions.has(rp.permissionId)) {
        uniquePermissions.set(rp.permissionId, {
          id: rp.permission.id,
          name: rp.permission.name,
          resource: rp.permission.resource,
          action: rp.permission.action,
          module: rp.permission.module,
          description: rp.permission.description,
        });
      }
    });

    return Array.from(uniquePermissions.values());
  }

  /**
   * Replace all permissions for a role (remove old, assign new)
   */
  async replaceRolePermissions(
    role: UserRoleType | string,
    permissionIds: string[],
    organizationId?: string
  ): Promise<{
    removed: number;
    assigned: number;
  }> {
    // Remove all existing permissions for this role (system-wide or org-specific)
    const deleted = await prisma.rolePermission.deleteMany({
      where: {
        role: role as UserRole,
        organizationId: organizationId || null,
      },
    });

    // Assign new permissions
    const result = await this.assignPermissions({
      role,
      permissionIds,
      organizationId,
    });

    return {
      removed: deleted.count,
      assigned: result.assigned,
    };
  }
}

export const rolePermissionService = new RolePermissionService();
