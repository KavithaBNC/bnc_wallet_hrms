import { Request, Response, NextFunction } from 'express';
import { attendanceComponentService } from '../services/attendance-component.service';

export class AttendanceComponentController {
  /**
   * Create new attendance component
   * POST /api/v1/attendance-components
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const component = await attendanceComponentService.create(req.body);

      return res.status(201).json({
        status: 'success',
        message: 'Attendance component created successfully',
        data: { component },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get all attendance components
   * GET /api/v1/attendance-components
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, page, limit, search } = req.query;
      
      const result = await attendanceComponentService.getAll({
        organizationId: organizationId as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search: search as string | undefined,
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
   * Get attendance component by ID
   * GET /api/v1/attendance-components/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const component = await attendanceComponentService.getById(id);

      return res.status(200).json({
        status: 'success',
        data: { component },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update attendance component
   * PUT /api/v1/attendance-components/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const component = await attendanceComponentService.update(id, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Attendance component updated successfully',
        data: { component },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Delete attendance component
   * DELETE /api/v1/attendance-components/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await attendanceComponentService.delete(id);

      return res.status(200).json({
        status: 'success',
        message: 'Attendance component deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const attendanceComponentController = new AttendanceComponentController();
