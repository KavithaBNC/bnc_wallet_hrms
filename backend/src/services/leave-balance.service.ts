
import { AppError } from '../middlewares/errorHandler';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { QueryLeaveBalanceInput } from '../utils/leave.validation';

export class LeaveBalanceService {
  /**
   * Get leave balance for employee
   */
  async getBalance(query: QueryLeaveBalanceInput) {
    const { employeeId, year, leaveTypeId } = query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
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

    // If no balances exist, create default balances for all active leave types
    if (balances.length === 0) {
      const leaveTypes = await prisma.leaveType.findMany({
        where: {
          organizationId: employee.organizationId,
          isActive: true,
        },
      });

      const newBalances = await Promise.all(
        leaveTypes.map(async (leaveType) => {
          return await prisma.employeeLeaveBalance.create({
            data: {
              employeeId,
              leaveTypeId: leaveType.id,
              year: currentYear,
              openingBalance: leaveType.defaultDaysPerYear
                ? new Prisma.Decimal(leaveType.defaultDaysPerYear.toString())
                : new Prisma.Decimal(0),
              accrued: leaveType.defaultDaysPerYear
                ? new Prisma.Decimal(leaveType.defaultDaysPerYear.toString())
                : new Prisma.Decimal(0),
              available: leaveType.defaultDaysPerYear
                ? new Prisma.Decimal(leaveType.defaultDaysPerYear.toString())
                : new Prisma.Decimal(0),
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
