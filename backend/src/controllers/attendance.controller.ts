import { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import { biometricSyncService } from '../services/biometric-sync.service';
import { prisma } from '../utils/prisma';

export class AttendanceController {
  /**
   * Check-in
   * POST /api/v1/attendance/check-in
   */
  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          status: 'fail',
          message: 'Authentication required',
        });
      }

      // Get employee ID
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        return res.status(404).json({
          status: 'fail',
          message: 'Employee profile not found',
        });
      }

      const attendance = await attendanceService.checkIn(employee.id, req.body);

      return res.status(201).json({
        status: 'success',
        message: 'Checked in successfully',
        data: { attendance },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Check-out
   * POST /api/v1/attendance/check-out
   */
  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          status: 'fail',
          message: 'Authentication required',
        });
      }

      // Get employee ID
      const employee = await prisma.employee.findUnique({
        where: { userId },
      });

      if (!employee) {
        return res.status(404).json({
          status: 'fail',
          message: 'Employee profile not found',
        });
      }

      const attendance = await attendanceService.checkOut(employee.id, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Checked out successfully',
        data: { attendance },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get attendance records
   * GET /api/v1/attendance/records
   */
  async getRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      const result = await attendanceService.getRecords(req.query as any, userId, userRole);

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get attendance summary
   * GET /api/v1/attendance/summary/:employeeId
   */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          status: 'fail',
          message: 'startDate and endDate are required',
        });
      }

      const result = await attendanceService.getSummary({
        employeeId,
        startDate: startDate as string,
        endDate: endDate as string,
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
   * Get attendance report
   * GET /api/v1/attendance/reports
   */
  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, startDate, endDate, departmentId, employeeId } = req.query;

      if (!organizationId || !startDate || !endDate) {
        return res.status(400).json({
          status: 'fail',
          message: 'organizationId, startDate, and endDate are required',
        });
      }

      const result = await attendanceService.getReport({
        organizationId: organizationId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        departmentId: departmentId as string | undefined,
        employeeId: employeeId as string | undefined,
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
   * Sync biometric (eSSL) attendance
   * POST /api/v1/attendance/sync/biometric
   */
  async syncBiometric(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, fromDate, toDate } = req.body as {
        organizationId: string;
        fromDate: string;
        toDate: string;
      };

      const result = await biometricSyncService.syncBiometricFromEssl(
        organizationId,
        fromDate,
        toDate
      );

      return res.status(200).json({
        status: 'success',
        message: 'Biometric sync completed',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
