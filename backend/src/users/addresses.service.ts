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
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const start = Date.now();
    this.logger.log(`[createAddressFromData] START for user ${userId}`);
    this.logger.log(`[createAddressFromData] Input: ${JSON.stringify(data)}`);

    this.logger.log(`[createAddressFromData] Step 1: validateCoordinates`);
    const t1 = Date.now();
    await this.validateCoordinates(data.lat, data.lng);
    this.logger.log(
      `[createAddressFromData] Step 1 done (${Date.now() - t1}ms)`,
    );

    this.logger.log(`[createAddressFromData] Step 2: sanitize city/state`);
    const t2 = Date.now();
    // Reject common placeholder strings sent by old clients ('Unknown', 'N/A', blank)
    // so they never reach the DB. Fall back to known-good Maiduguri / Borno defaults.
    const PLACEHOLDER = new Set(['unknown', 'n/a', '']);
    const isPlaceholder = (v?: string) =>
      !v || PLACEHOLDER.has(v.trim().toLowerCase());
    const sanitizedCity = !isPlaceholder(data.city)
      ? this.sanitizeString(data.city!)
      : 'Maiduguri';
    const sanitizedState = !isPlaceholder(data.state)
      ? this.sanitizeString(data.state!)
      : 'Borno';
    this.logger.log(
      `[createAddressFromData] Step 2 done (${Date.now() - t2}ms)`,
    );

    this.logger.log(`[createAddressFromData] Step 3: address create`);
    const t3 = Date.now();
    try {
      const result = await tx.address.create({
        data: {
          userId,
          street: this.sanitizeString(data.street),
          city: sanitizedCity,
          state: sanitizedState,
          label: data.label
            ? this.sanitizeString(data.label)
            : 'Delivery Location',
          isDefault: data.isDefault || false,
          lat: data.lat,
          lng: data.lng,
          phone: data.phone ? this.sanitizeString(data.phone) : undefined,
        },
      });
      this.logger.log(
        `[createAddressFromData] Step 3 done (${Date.now() - t3}ms)`,
      );
      this.logger.log(
        `[createAddressFromData] SUCCESS for user ${userId} (total ${Date.now() - start}ms)`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[createAddressFromData] Failed to create address for user ${userId} after ${Date.now() - start}ms`,
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
    } else if (pickupAddress.lat !== lat || pickupAddress.lng !== lng) {
      // Coordinates changed (vendor moved store pin) — refresh cached address
      // so that delivery fee at order creation matches the quote.
      pickupAddress = await tx.address.update({
        where: { id: pickupAddress.id },
        data: { lat, lng },
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
    this.logger.log(`[validateCoordinates] lat=${lat}, lng=${lng}`);
    if (!lat || !lng || (lat === 0 && lng === 0)) {
      this.logger.warn(
        `[validateCoordinates] Invalid: missing or zero coordinates`,
      );
      throw new BadRequestException('Valid GPS coordinates are required');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.logger.warn(`[validateCoordinates] Invalid: out of bounds lat/lng`);
      throw new BadRequestException('Invalid GPS coordinates');
    }

    const t0 = Date.now();
    const isInside = await this.isWithinServiceArea(lat, lng);
    this.logger.log(
      `[validateCoordinates] isWithinServiceArea=${isInside} (${Date.now() - t0}ms)`,
    );
    if (!isInside) {
      this.logger.warn(
        `[validateCoordinates] Outside service area for lat=${lat}, lng=${lng}`,
      );
      throw new BadRequestException(
        'Sorry, this location is outside our active service area.',
      );
    }
    this.logger.log(`[validateCoordinates] PASSED for lat=${lat}, lng=${lng}`);
  }

  /**
   * Check coordinate against active ServiceZone polygons in DB.
   */
  public async isWithinServiceArea(lat: number, lng: number): Promise<boolean> {
    this.logger.log(
      `[isWithinServiceArea] Checking for lat=${lat}, lng=${lng}`,
    );
    const t0 = Date.now();
    const zones = await this.prisma.serviceZone.findMany({
      where: { isActive: true },
      select: { coordinates: true },
    });
    this.logger.log(
      `[isWithinServiceArea] Loaded ${zones.length} zones (${Date.now() - t0}ms)`,
    );

    // If no zones configured, allow all (fail-open for new deployments)
    if (zones.length === 0) {
      this.logger.warn(
        `[isWithinServiceArea] No zones configured, allowing all`,
      );
      return true;
    }

    for (const [i, zone] of zones.entries()) {
      const vertices = zone.coordinates as Array<{ lat: number; lng: number }>;
      const inside = this.isPointInPolygon(lat, lng, vertices);
      this.logger.log(`[isWithinServiceArea] Zone ${i}: inside=${inside}`);
      if (inside) return true;
    }
    return false;
  }

  private isPointInPolygon(
    lat: number,
    lng: number,
    vertices: Array<{ lat: number; lng: number }>,
  ): boolean {
    this.logger.log(
      `[isPointInPolygon] Checking point (${lat},${lng}) in polygon with ${vertices.length} vertices`,
    );
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].lat,
        yi = vertices[i].lng;
      const xj = vertices[j].lat,
        yj = vertices[j].lng;
      const intersect =
        yi > lng !== yj > lng &&
        lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    this.logger.log(`[isPointInPolygon] Result: ${inside}`);
    return inside;
  }
}
