import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/users.dto';
import { Prisma } from '@prisma/client';

export const ADDRESS_LABELS = {
  STORE_LOCATION: 'Store Location',
} as const;

// 1. Define City Boundaries (Example: Maiduguri, Nigeria)
// Go to Google Maps, right click top-right and bottom-left of the city to get these.
const CITY_BOUNDS = {
  MIN_LAT: 11.75, // South-most edge
  MAX_LAT: 11.95, // North-most edge
  MIN_LNG: 13.05, // West-most edge
  MAX_LNG: 13.25, // East-most edge
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

  async addUserAddress(userId: string, data: CreateAddressDto) {
    // 2. Validate Coordinates (Geofencing)
    this.validateCoordinates(data.lat, data.lng);

    const sanitizedData = {
      ...data,
      street: this.sanitizeString(data.street),
      city: this.sanitizeString(data.city),
      state: data.state ? this.sanitizeString(data.state) : undefined,
      label: data.label ? this.sanitizeString(data.label) : undefined,
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (sanitizedData.isDefault) {
          await tx.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });
        }

        return tx.address.create({
          data: {
            userId,
            street: sanitizedData.street,
            city: sanitizedData.city,
            state: sanitizedData.state || 'Maiduguri',
            label: sanitizedData.label || 'Home',
            isDefault: sanitizedData.isDefault || false,
            // 3. Use Real Coordinates
            lat: data.lat,
            lng: data.lng,
          },
        });
      });
    } catch (error) {
      // Pass through our specific validation errors
      if (error instanceof BadRequestException) throw error;

      this.logger.error(
        `Failed to add address for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to add address');
    }
  }

  async getOrCreateStoreAddress(
    ownerId: string,
    storeAddress: string,
    lat: number,
    lng: number,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    // Validate Store coordinates too (prevents admins from setting fake store locations)
    if (!this.isWithinCity(lat, lng)) {
      this.logger.warn(
        `Store ${ownerId} has invalid coordinates: ${lat}, ${lng}`,
      );
      // We might throw here, or fallback to a default if legacy data is bad
      throw new BadRequestException('Store location is outside service area');
    }

    let pickupAddress = await tx.address.findFirst({
      where: {
        userId: ownerId,
        label: ADDRESS_LABELS.STORE_LOCATION,
        street: storeAddress,
      },
    });

    if (!pickupAddress) {
      pickupAddress = await tx.address.create({
        data: {
          userId: ownerId,
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

  // ==================================================================
  // VALIDATION HELPERS
  // ==================================================================

  public sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '').substring(0, 500);
  }

  /**
   * Throws if coordinates are "fake" (0,0) or outside the city
   */
  private validateCoordinates(lat: number, lng: number): void {
    if (!lat || !lng || (lat === 0 && lng === 0)) {
      throw new BadRequestException('Valid GPS coordinates are required');
    }

    if (!this.isWithinCity(lat, lng)) {
      throw new BadRequestException(
        'Sorry, this location is outside our Maiduguri service area.',
      );
    }
  }

  /**
   * Checks if lat/lng are within the bounding box
   */
  private isWithinCity(lat: number, lng: number): boolean {
    return (
      lat >= CITY_BOUNDS.MIN_LAT &&
      lat <= CITY_BOUNDS.MAX_LAT &&
      lng >= CITY_BOUNDS.MIN_LNG &&
      lng <= CITY_BOUNDS.MAX_LNG
    );
  }
}
