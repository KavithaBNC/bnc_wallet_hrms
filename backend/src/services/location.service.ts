import { prisma } from '../utils/prisma';

export class LocationService {
  async getByOrganization(organizationId: string) {
    return prisma.location.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
  }
}
export const locationService = new LocationService();
