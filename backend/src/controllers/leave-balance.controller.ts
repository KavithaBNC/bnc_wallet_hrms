import { Request, Response, NextFunction } from 'express';
import { leaveBalanceService } from '../services/leave-balance.service';

export class LeaveBalanceController {
  /**
   * Get leave balance for employee
   * GET /api/v1/leaves/balance/:employeeId
   */
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const result = await leaveBalanceService.getBalance({
        employeeId,
        year: req.query.year as string,
        leaveTypeId: req.query.leaveTypeId as string,
      });

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get leave calendar
   * GET /api/v1/leaves/calendar
   */
  async getCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, startDate, endDate, departmentId } = req.query;

      if (!organizationId || !startDate || !endDate) {
        return res.status(400).json({
          status: 'fail',
          message: 'organizationId, startDate, and endDate are required',
        });
      }

      const result = await leaveBalanceService.getCalendar(
        organizationId as string,
        new Date(startDate as string),
        new Date(endDate as string),
        departmentId as string | undefined
      );

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const leaveBalanceController = new LeaveBalanceController();
