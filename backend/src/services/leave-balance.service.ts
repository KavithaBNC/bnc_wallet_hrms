import { AppError } from '../middlewares/errorHandler';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { QueryLeaveBalanceInput } from '../utils/leave.validation';
import {
  readEntitlementDays,
  isAutoCreditApplicableToEmployee,
} from '../utils/auto-credit-entitlement';
import {
  getLeaveTypeIdsWithBalance,
  getLeaveTypeIdsWithAutoCreditAllowed,
} from '../utils/event-config';

export class LeaveBalanceService {
  /**
   * Get leave balance for employee. When creating new balances, entitlement is taken only from
   * Auto Credit / Rule settings that match the employee's department and paygroup.
   */
  async getBalance(query: QueryLeaveBalanceInput) {
    const { employeeId, year, leaveTypeId } = query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, organizationId: true, paygroupId: true, departmentId: true, employeeCode: true },
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const where: Prisma.EmployeeLeaveBalanceWhereInput = {
      employeeId,
      year: currentYear,
    };

    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    const balances = await prisma.employeeLeaveBalance.findMany({
      where,
      include: {
        leaveType: {
          select: {
            id: true,
            name: true,
            code: true,
            isPaid: true,
            defaultDaysPerYear: true,
            maxCarryForward: true,
            accrualType: true,
          },
        },
      },
      orderBy: {
        leaveType: {
          name: 'asc',
        },
      },
    });

    if (balances.length === 0) {
      const [leaveTypes, autoCreditSettings, leaveTypeIdsWithBalance, leaveTypeIdsWithAutoCreditAllowed] =
        await Promise.all([
          prisma.leaveType.findMany({
            where: { organizationId: employee.organizationId, isActive: true },
          }),
          prisma.autoCreditSetting.findMany({
            where: {
              organizationId: employee.organizationId,
              effectiveDate: { lte: new Date(currentYear, 11, 31) },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(currentYear, 0, 1) } }],
            },
            select: {
              eventType: true,
              displayName: true,
              paygroupId: true,
              departmentId: true,
              associate: true,
              autoCreditRule: true,
            },
          }),
          getLeaveTypeIdsWithBalance(employee.organizationId),
          getLeaveTypeIdsWithAutoCreditAllowed(employee.organizationId),
        ]);

      // Only maintain balance for leave types whose event config has hasBalance = true
      const leaveTypesToCreateBalance = leaveTypes.filter((lt) => leaveTypeIdsWithBalance.has(lt.id));

      const applicableSettings = autoCreditSettings.filter((s) =>
        isAutoCreditApplicableToEmployee(s, employee)
      );

      const leaveTypeIdsWithAutoCreditInOrg = new Set<string>();
      for (const s of autoCreditSettings) {
        for (const lt of leaveTypes) {
          const nameKey = lt.name.toLowerCase().trim();
          const codeKey = lt.code ? lt.code.trim().toUpperCase() : '';
          const matchByName = s.eventType && s.eventType.toLowerCase().trim() === nameKey;
          const matchByCode = s.displayName && s.displayName.trim().toUpperCase() === codeKey;
          if (matchByName || matchByCode) leaveTypeIdsWithAutoCreditInOrg.add(lt.id);
        }
      }

      // Only use auto credit entitlement for leave types whose event config has allowAutoCreditRule = true
      const entitlementByLeaveTypeId = new Map<string, number>();
      for (const lt of leaveTypesToCreateBalance) {
        if (!leaveTypeIdsWithAutoCreditAllowed.has(lt.id)) {
          // No auto credit for this type; use defaultDaysPerYear if any
          const defaultDays = lt.defaultDaysPerYear ? Number(lt.defaultDaysPerYear) : 0;
          entitlementByLeaveTypeId.set(lt.id, defaultDays);
          continue;
        }
        const nameKey = lt.name.toLowerCase().trim();
        const codeKey = lt.code ? lt.code.trim().toUpperCase() : '';
        for (const s of applicableSettings) {
          const n = readEntitlementDays(s.autoCreditRule);
          if (n == null) continue;
          const matchByName = s.eventType && s.eventType.toLowerCase().trim() === nameKey;
          const matchByCode = s.displayName && s.displayName.trim().toUpperCase() === codeKey;
          if (matchByName || matchByCode) {
            entitlementByLeaveTypeId.set(lt.id, n);
            break;
          }
        }
      }

      const newBalances = await Promise.all(
        leaveTypesToCreateBalance.map(async (leaveType) => {
          const entitlement = entitlementByLeaveTypeId.get(leaveType.id);
          const hasAutoCreditInOrg = leaveTypeIdsWithAutoCreditInOrg.has(leaveType.id);
          const days =
            entitlement != null
              ? entitlement
              : hasAutoCreditInOrg
                ? 0
                : leaveType.defaultDaysPerYear
                  ? Number(leaveType.defaultDaysPerYear)
                  : 0;
          const dec = (n: number) => new Prisma.Decimal(n);
          return await prisma.employeeLeaveBalance.create({
            data: {
              employeeId,
              leaveTypeId: leaveType.id,
              year: currentYear,
              openingBalance: dec(days),
              accrued: dec(days),
              available: dec(days),
            },
            include: {
              leaveType: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  isPaid: true,
                  defaultDaysPerYear: true,
                  maxCarryForward: true,
                  accrualType: true,
                },
              },
            },
          });
        })
      );

      return {
        year: currentYear,
        employeeId,
        balances: newBalances,
      };
    }

    return {
      year: currentYear,
      employeeId,
      balances,
    };
  }

  /**
   * Get leave calendar (all approved leaves for date range)
   */
  async getCalendar(organizationId: string, startDate: Date, endDate: Date, departmentId?: string) {
    const where: Prisma.LeaveRequestWhereInput = {
      status: 'APPROVED',
      employee: {
        organizationId,
        ...(departmentId && { departmentId }),
      },
      OR: [
        {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: startDate } },
          ],
        },
      ],
    };

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            code: true,
            colorCode: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return {
      startDate,
      endDate,
      leaveRequests,
    };
  }
}

export const leaveBalanceService = new LeaveBalanceService();
