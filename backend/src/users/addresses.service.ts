import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/users.dto';
import { Prisma } from '@prisma/client';

export const ADDRESS_LABELS = {
  STORE_LOCATION: 'Store Location',
} as const;

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private prisma: PrismaService) {}

  async getUserAddresses(userId: string) {
    try {
      return await this.prisma.address.findMany({
        where: { userId },
        orderBy: { isDefault: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch addresses for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to retrieve addresses');
    }
  }

  /**
   * Wrapper for HTTP requests to add an address.
   * Manages its own transaction.
   */
  async addUserAddress(userId: string, data: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      // Handle "Default" logic toggle
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      // Delegate to the core creation logic
      return this.createAddressFromData(userId, data, tx);
    });
  }

  /**
   * ✅ CORE METHOD: Single Source of Truth for Address Creation
   * 1. Validates Coordinates (Geofencing)
   * 2. Sanitizes Inputs
   * 3. Supports External Transactions (for Delivery/Order flows)
   */
  async createAddressFromData(
    userId: string,
    data: {
      street: string;
      city?: string;
      state?: string;
      label?: string;
      phone?: string;
      lat: number;
      lng: number;
      isDefault?: boolean;
    },
    tx: Prisma.TransactionClient = this.prisma, // Defaults to main client if no tx provided
  ) {
    // 1. CRITICAL: Enforce Geofence Validation
    await this.validateCoordinates(data.lat, data.lng);

    // 2. Data Integrity: Sanitize inputs
    // Fallbacks provided for City/State if missing from frontend map data
    const sanitizedCity = data.city
      ? this.sanitizeString(data.city)
      : 'Maiduguri';
    const sanitizedState = data.state
      ? this.sanitizeString(data.state)
      : 'Borno';

    try {
      return await tx.address.create({
        data: {
          userId,
          street: this.sanitizeString(data.street),
          city: sanitizedCity,
          state: sanitizedState,
          label: data.label ? this.sanitizeString(data.label) : 'Delivery Location',
          isDefault: data.isDefault || false,
          lat: data.lat,
          lng: data.lng,
          phone: data.phone ? this.sanitizeString(data.phone) : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create address for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException('Failed to save valid address');
    }
  }

  async getOrCreateStoreAddress(
    vendorId: string,
    storeAddress: string,
    lat: number,
    lng: number,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    // Re-use validation logic
    await this.validateCoordinates(lat, lng);

    let pickupAddress = await tx.address.findFirst({
      where: {
        vendorId: vendorId,
        label: ADDRESS_LABELS.STORE_LOCATION,
        street: storeAddress,
      },
    });

    if (!pickupAddress) {
      pickupAddress = await tx.address.create({
        data: {
          vendorId: vendorId,
          userId: null,
          label: ADDRESS_LABELS.STORE_LOCATION,
          street: storeAddress,
          city: 'Maiduguri',
          state: 'Borno',
          lat: lat,
          lng: lng,
          isDefault: false,
        },
      });
    }

    return pickupAddress;
  }

  async deleteUserAddress(userId: string, addressId: string) {
    try {
      const address = await this.prisma.address.findUnique({
        where: { id: addressId },
      });

      if (!address || address.userId !== userId) {
        throw new NotFoundException('Address not found or access denied');
      }

      return await this.prisma.address.delete({
        where: { id: addressId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Cannot delete address used in previous orders/rides',
        );
      }
      throw new BadRequestException('Failed to delete address');
    }
  }

  // ==================================================================
  // VALIDATION HELPERS
  // ==================================================================

  public sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '').substring(0, 500);
  }

  public async validateCoordinates(lat: number, lng: number): Promise<void> {
    if (!lat || !lng || (lat === 0 && lng === 0)) {
      throw new BadRequestException('Valid GPS coordinates are required');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('Invalid GPS coordinates');
    }

    const isInside = await this.isWithinServiceArea(lat, lng);
    if (!isInside) {
      throw new BadRequestException(
        'Sorry, this location is outside our active service area.',
      );
    }
  }

  /**
   * Check coordinate against active ServiceZone polygons in DB.
   */
  public async isWithinServiceArea(lat: number, lng: number): Promise<boolean> {
    const zones = await this.prisma.serviceZone.findMany({
      where: { isActive: true },
      select: { coordinates: true },
    });

    // If no zones configured, allow all (fail-open for new deployments)
    if (zones.length === 0) return true;

    return zones.some((zone) => {
      const vertices = zone.coordinates as Array<{ lat: number; lng: number }>;
      return this.isPointInPolygon(lat, lng, vertices);
    });
  }

  private isPointInPolygon(lat: number, lng: number, vertices: Array<{ lat: number; lng: number }>): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].lat, yi = vertices[i].lng;
      const xj = vertices[j].lat, yj = vertices[j].lng;
      const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}