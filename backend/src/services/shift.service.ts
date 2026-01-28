
import { AppError } from '../middlewares/errorHandler';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';

export class ShiftService {
  /**
   * Create new shift
   */
  async create(data: {
    organizationId: string;
    name: string;
    code?: string;
    description?: string;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
    breakDuration?: number; // minutes
    workHours?: number;
    isFlexible?: boolean;
    gracePeriod?: number; // minutes
    earlyLeaveAllowed?: boolean;
    overtimeEnabled?: boolean;
    overtimeThreshold?: number; // hours
    geofenceEnabled?: boolean;
    geofenceRadius?: number; // meters
    geofenceLocation?: any; // {lat, lng, address}
    isActive?: boolean;
  }) {
    // Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: data.organizationId },
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    // Check code uniqueness if provided
    if (data.code) {
      const existing = await prisma.shift.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new AppError('Shift code already exists', 400);
      }
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
      throw new AppError('Invalid time format. Use HH:mm format', 400);
    }

    // Calculate work hours if not provided
    let workHours = data.workHours;
    if (!workHours) {
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const totalMinutes = endMinutes > startMinutes 
        ? endMinutes - startMinutes 
        : (24 * 60) - startMinutes + endMinutes; // Handle overnight shifts
      const breakMins = data.breakDuration || 0;
      workHours = (totalMinutes - breakMins) / 60;
    }

    const shift = await prisma.shift.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        code: data.code || null,
        description: data.description || null,
        startTime: data.startTime,
        endTime: data.endTime,
        breakDuration: data.breakDuration || null,
        workHours: new Prisma.Decimal(workHours),
        isFlexible: data.isFlexible || false,
        gracePeriod: data.gracePeriod || null,
        earlyLeaveAllowed: data.earlyLeaveAllowed || false,
        overtimeEnabled: data.overtimeEnabled !== undefined ? data.overtimeEnabled : true,
        overtimeThreshold: data.overtimeThreshold ? new Prisma.Decimal(data.overtimeThreshold) : null,
        geofenceEnabled: data.geofenceEnabled || false,
        geofenceRadius: data.geofenceRadius ? new Prisma.Decimal(data.geofenceRadius) : null,
        geofenceLocation: data.geofenceLocation || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    return shift;
  }

  /**
   * Get all shifts
   */
  async getAll(query: {
    organizationId?: string;
    isActive?: boolean;
    page?: string;
    limit?: string;
  }) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftWhereInput = {};

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.shift.count({ where }),
    ]);

    return {
      shifts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get shift by ID
   */
  async getById(id: string) {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!shift) {
      throw new AppError('Shift not found', 404);
    }

    return shift;
  }

  /**
   * Update shift
   */
  async update(id: string, data: any) {
    const existing = await prisma.shift.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Shift not found', 404);
    }

    // Validate time format if provided
    if (data.startTime || data.endTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (data.startTime && !timeRegex.test(data.startTime)) {
        throw new AppError('Invalid start time format. Use HH:mm format', 400);
      }
      if (data.endTime && !timeRegex.test(data.endTime)) {
        throw new AppError('Invalid end time format. Use HH:mm format', 400);
      }
    }

    // Check code uniqueness if changing code
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.shift.findUnique({
        where: { code: data.code },
      });

      if (codeExists) {
        throw new AppError('Shift code already exists', 400);
      }
    }

    const updateData: any = { ...data };
    
    // Convert Decimal fields
    if (data.workHours !== undefined) {
      updateData.workHours = data.workHours ? new Prisma.Decimal(data.workHours) : null;
    }
    if (data.overtimeThreshold !== undefined) {
      updateData.overtimeThreshold = data.overtimeThreshold ? new Prisma.Decimal(data.overtimeThreshold) : null;
    }
    if (data.geofenceRadius !== undefined) {
      updateData.geofenceRadius = data.geofenceRadius ? new Prisma.Decimal(data.geofenceRadius) : null;
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    return shift;
  }

  /**
   * Delete shift
   */
  async delete(id: string) {
    const existing = await prisma.shift.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Shift not found', 404);
    }

    // Check if shift is assigned to any employees
    const employeesCount = await prisma.employee.count({
      where: { shiftId: id },
    });

    if (employeesCount > 0) {
      throw new AppError(
        `Cannot delete shift. It is assigned to ${employeesCount} employee(s). Please reassign them first.`,
        400
      );
    }

    await prisma.shift.delete({
      where: { id },
    });

    return { message: 'Shift deleted successfully' };
  }

  /**
   * Validate geofence location
   */
  validateGeofence(
    checkInLocation: { latitude: number; longitude: number },
    geofenceLocation: { latitude: number; longitude: number },
    radius: number
  ): boolean {
    // Haversine formula to calculate distance between two points
    const R = 6371000; // Earth's radius in meters
    const lat1 = (geofenceLocation.latitude * Math.PI) / 180;
    const lat2 = (checkInLocation.latitude * Math.PI) / 180;
    const deltaLat = ((checkInLocation.latitude - geofenceLocation.latitude) * Math.PI) / 180;
    const deltaLng = ((checkInLocation.longitude - geofenceLocation.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters

    return distance <= radius;
  }
}

export const shiftService = new ShiftService();
