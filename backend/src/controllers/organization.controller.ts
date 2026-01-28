import { Request, Response, NextFunction } from 'express';
import { organizationService } from '../services/organization.service';

export class OrganizationController {
  /**
   * Create new organization
   * POST /api/v1/organizations
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const organization = await organizationService.create(req.body);

      res.status(201).json({
        status: 'success',
        message: 'Organization created successfully',
        data: { organization },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get all organizations
   * GET /api/v1/organizations
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await organizationService.getAll(page, limit, search);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get organization by ID
   * GET /api/v1/organizations/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organization = await organizationService.getById(id);

      res.status(200).json({
        status: 'success',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization
   * PUT /api/v1/organizations/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organization = await organizationService.update(id, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Organization updated successfully',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization logo
   * POST /api/v1/organizations/:id/logo
   */
  async updateLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { logoUrl } = req.body;

      if (!logoUrl) {
        res.status(400).json({
          status: 'fail',
          message: 'Logo URL is required',
        });
        return;
      }

      const organization = await organizationService.updateLogo(id, logoUrl);

      res.status(200).json({
        status: 'success',
        message: 'Organization logo updated successfully',
        data: { organization },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create organization admin user
   * POST /api/v1/organizations/:id/admins
   */
  async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await organizationService.createAdmin(id, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Organization admin created successfully',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get organization statistics
   * GET /api/v1/organizations/:id/statistics
   * Note: HRMS_ADMIN (SUPER_ADMIN) is blocked from accessing this
   */
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const statistics = await organizationService.getStatistics(id);

      res.status(200).json({
        status: 'success',
        data: { statistics },
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const organizationController = new OrganizationController();
