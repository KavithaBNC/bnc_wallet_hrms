import { Request, Response, NextFunction } from 'express';
import { locationService } from '../services/location.service';

export class LocationController {
  async getByOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.query as { organizationId: string };
      if (!organizationId) {
        return res.status(400).json({ status: 'fail', message: 'organizationId required' });
      }
      const list = await locationService.getByOrganization(organizationId);
      return res.status(200).json({ status: 'success', data: { locations: list } });
    } catch (error) {
      return next(error);
    }
  }
}
export const locationController = new LocationController();
