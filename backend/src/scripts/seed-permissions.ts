import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to seed default permissions and assign them to HR_MANAGER and ORG_ADMIN
 * Usage: npx ts-node backend/src/scripts/seed-permissions.ts
 */
async function seedPermissions() {
  try {
    console.log('\n🌱 Seeding permissions...\n');

    // Define all modules and their permissions
    const modulePermissions = [
      // Employee Management
      {
        module: 'Employee Management',
        permissions: [
          { name: 'employees.create', resource: 'employees', action: 'create', description: 'Create employees' },
          { name: 'employees.read', resource: 'employees', action: 'read', description: 'View employees' },
          { name: 'employees.update', resource: 'employees', action: 'update', description: 'Update employees' },
          { name: 'employees.delete', resource: 'employees', action: 'delete', description: 'Delete employees' },
          { name: 'employees.view_all', resource: 'employees', action: 'view_all', description: 'View all employees in organization' },
        ],
      },
      // Department Management
      {
        module: 'Department Management',
        permissions: [
          { name: 'departments.create', resource: 'departments', action: 'create', description: 'Create departments' },
          { name: 'departments.read', resource: 'departments', action: 'read', description: 'View departments' },
          { name: 'departments.update', resource: 'departments', action: 'update', description: 'Update departments' },
          { name: 'departments.delete', resource: 'departments', action: 'delete', description: 'Delete departments' },
        ],
      },
      // Position Management
      {
        module: 'Position Management',
        permissions: [
          { name: 'positions.create', resource: 'positions', action: 'create', description: 'Create job positions' },
          { name: 'positions.read', resource: 'positions', action: 'read', description: 'View job positions' },
          { name: 'positions.update', resource: 'positions', action: 'update', description: 'Update job positions' },
          { name: 'positions.delete', resource: 'positions', action: 'delete', description: 'Delete job positions' },
        ],
      },
      // Attendance Management
      {
        module: 'Attendance Management',
        permissions: [
          { name: 'attendance.check_in', resource: 'attendance', action: 'check_in', description: 'Check in' },
          { name: 'attendance.check_out', resource: 'attendance', action: 'check_out', description: 'Check out' },
          { name: 'attendance.read', resource: 'attendance', action: 'read', description: 'View attendance records' },
          { name: 'attendance.view_all', resource: 'attendance', action: 'view_all', description: 'View all attendance in organization' },
          { name: 'attendance.reports', resource: 'attendance', action: 'reports', description: 'View attendance reports' },
          { name: 'attendance.regularization.approve', resource: 'attendance_regularization', action: 'approve', description: 'Approve attendance regularization' },
          { name: 'attendance.regularization.reject', resource: 'attendance_regularization', action: 'reject', description: 'Reject attendance regularization' },
        ],
      },
      // Leave Management
      {
        module: 'Leave Management',
        permissions: [
          { name: 'leaves.apply', resource: 'leaves', action: 'apply', description: 'Apply for leave' },
          { name: 'leaves.read', resource: 'leaves', action: 'read', description: 'View leave requests' },
          { name: 'leaves.view_all', resource: 'leaves', action: 'view_all', description: 'View all leave requests in organization' },
          { name: 'leaves.approve', resource: 'leaves', action: 'approve', description: 'Approve leave requests' },
          { name: 'leaves.reject', resource: 'leaves', action: 'reject', description: 'Reject leave requests' },
          { name: 'leaves.cancel', resource: 'leaves', action: 'cancel', description: 'Cancel own leave requests' },
          { name: 'leave_types.create', resource: 'leave_types', action: 'create', description: 'Create leave types' },
          { name: 'leave_types.read', resource: 'leave_types', action: 'read', description: 'View leave types' },
          { name: 'leave_types.update', resource: 'leave_types', action: 'update', description: 'Update leave types' },
          { name: 'leave_types.delete', resource: 'leave_types', action: 'delete', description: 'Delete leave types' },
          { name: 'leave_policies.create', resource: 'leave_policies', action: 'create', description: 'Create leave policies' },
          { name: 'leave_policies.read', resource: 'leave_policies', action: 'read', description: 'View leave policies' },
          { name: 'leave_policies.update', resource: 'leave_policies', action: 'update', description: 'Update leave policies' },
          { name: 'leave_policies.delete', resource: 'leave_policies', action: 'delete', description: 'Delete leave policies' },
        ],
      },
      // Holiday Management
      {
        module: 'Holiday Management',
        permissions: [
          { name: 'holidays.create', resource: 'holidays', action: 'create', description: 'Create holidays' },
          { name: 'holidays.read', resource: 'holidays', action: 'read', description: 'View holidays' },
          { name: 'holidays.update', resource: 'holidays', action: 'update', description: 'Update holidays' },
          { name: 'holidays.delete', resource: 'holidays', action: 'delete', description: 'Delete holidays' },
        ],
      },
      // Shift Management
      {
        module: 'Shift Management',
        permissions: [
          { name: 'shifts.create', resource: 'shifts', action: 'create', description: 'Create shifts' },
          { name: 'shifts.read', resource: 'shifts', action: 'read', description: 'View shifts' },
          { name: 'shifts.update', resource: 'shifts', action: 'update', description: 'Update shifts' },
          { name: 'shifts.delete', resource: 'shifts', action: 'delete', description: 'Delete shifts' },
        ],
      },
      // Role & Permission Management
      {
        module: 'Role & Permission Management',
        permissions: [
          { name: 'permissions.create', resource: 'permissions', action: 'create', description: 'Create permissions' },
          { name: 'permissions.read', resource: 'permissions', action: 'read', description: 'View permissions' },
          { name: 'permissions.update', resource: 'permissions', action: 'update', description: 'Update permissions' },
          { name: 'permissions.delete', resource: 'permissions', action: 'delete', description: 'Delete permissions' },
          { name: 'role_permissions.assign', resource: 'role_permissions', action: 'assign', description: 'Assign permissions to roles' },
          { name: 'role_permissions.remove', resource: 'role_permissions', action: 'remove', description: 'Remove permissions from roles' },
        ],
      },
    ];

    // Create all permissions
    const createdPermissions: any[] = [];
    for (const module of modulePermissions) {
      for (const perm of module.permissions) {
        const existing = await prisma.permission.findUnique({
          where: { name: perm.name },
        });

        if (!existing) {
          const permission = await prisma.permission.create({
            data: {
              name: perm.name,
              resource: perm.resource,
              action: perm.action,
              description: perm.description,
              module: module.module,
            },
          });
          createdPermissions.push(permission);
          console.log(`✅ Created permission: ${perm.name}`);
        } else {
          console.log(`⏭️  Skipped (exists): ${perm.name}`);
        }
      }
    }

    // Get all permissions (including existing ones)
    const allPermissions = await prisma.permission.findMany();

    // Assign all permissions to HR_MANAGER and ORG_ADMIN (system-wide)
    const rolesToAssign = [UserRole.HR_MANAGER, UserRole.ORG_ADMIN];

    for (const role of rolesToAssign) {
      console.log(`\n📋 Assigning permissions to ${role}...`);
      let assigned = 0;
      let skipped = 0;

      for (const permission of allPermissions) {
        const existing = await prisma.rolePermission.findFirst({
          where: {
            role,
            permissionId: permission.id,
            organizationId: null, // System-wide
          },
        });

        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              role,
              permissionId: permission.id,
              organizationId: null, // System-wide permission
            },
          });
          assigned++;
        } else {
          skipped++;
        }
      }

      console.log(`   ✅ Assigned: ${assigned}, Skipped: ${skipped}`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total Permissions: ${allPermissions.length}`);
    console.log(`   New Permissions Created: ${createdPermissions.length}`);
    console.log(`   Roles Configured: ${rolesToAssign.length}`);
    console.log(`\n✅ Permission seeding completed!\n`);
  } catch (error: any) {
    console.error('❌ Error seeding permissions:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPermissions();
