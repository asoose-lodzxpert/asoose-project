import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/users.dto';
import { Prisma } from '@prisma/client';

export const ADDRESS_LABELS = {
  STORE_LOCATION: 'Store Location',
} as const;

// 1. Define City Boundaries (Example: Maiduguri, Nigeria)
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
            userId, // Explicitly linking to User
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
      if (error instanceof BadRequestException) throw error;

      this.logger.error(
        `Failed to add address for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to add address');
    }
  }

  /**
   * FIX APPLIED:
   * 1. Renamed ownerId -> vendorId for type safety.
   * 2. Writes to 'vendorId' column instead of 'userId'.
   * 3. Leaves 'userId' null for store addresses to prevent FK violations.
   */
  async getOrCreateStoreAddress(
    vendorId: string,
    storeAddress: string,
    lat: number,
    lng: number,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    // Validate Store coordinates
    if (!this.isWithinCity(lat, lng)) {
      this.logger.warn(
        `Store ${vendorId} has invalid coordinates: ${lat}, ${lng}`,
      );
      throw new BadRequestException('Store location is outside service area');
    }

    // Fix: Query against vendorId
    let pickupAddress = await tx.address.findFirst({
      where: {
        vendorId: vendorId, 
        label: ADDRESS_LABELS.STORE_LOCATION,
        street: storeAddress,
      },
    });

    if (!pickupAddress) {
      // Fix: Create with vendorId, leaving userId null
      pickupAddress = await tx.address.create({
        data: {
          vendorId: vendorId,
          userId: null, // Explicitly null ensuring no Foreign Key constraint violation
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
      // 1. Verify ownership
      const address = await this.prisma.address.findUnique({
        where: { id: addressId },
      });

      // Ensure we only delete if the userId matches (security check)
      if (!address || address.userId !== userId) {
        throw new NotFoundException('Address not found or access denied');
      }

      // 2. Delete
      return await this.prisma.address.delete({
        where: { id: addressId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      
      // Handle Foreign Key constraints (e.g. if address is used in an order)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') { 
        throw new BadRequestException('Cannot delete address used in previous orders/rides');
      }

      this.logger.error(`Failed to delete address ${addressId}`, error.stack);
      throw new BadRequestException('Failed to delete address');
    }
  }

  // ==================================================================
  // VALIDATION HELPERS
  // ==================================================================

  public sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '').substring(0, 500);
  }

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

  private isWithinCity(lat: number, lng: number): boolean {
    return (
      lat >= CITY_BOUNDS.MIN_LAT &&
      lat <= CITY_BOUNDS.MAX_LAT &&
      lng >= CITY_BOUNDS.MIN_LNG &&
      lng <= CITY_BOUNDS.MAX_LNG
    );
  }
}