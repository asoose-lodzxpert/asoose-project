import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, CreateOrderDto } from './dto/users.dto';
import { OrdersService } from './orders.service';
import { AddressesService } from './addresses.service';
import {
  CreateEmergencyContactDto,
  UpdateEmergencyContactDto,
} from './dto/emergency-contact.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private addressesService: AddressesService,
  ) {}

  // ==================================================================
  // DELEGATED METHODS (Orders & Addresses)
  // ==================================================================

  async createOrder(
    userId: string,
    data: CreateOrderDto,
    idempotencyKey?: string, // <--- Add this
  ) {
    // Pass it to ordersService
    return this.ordersService.createOrder(userId, data, idempotencyKey);
  }

  async getUserOrders(userId: string) {
    return this.ordersService.getUserOrders(userId);
  }

  async getOrderDetails(userId: string, orderId: string) {
    return this.ordersService.getOrderDetails(userId, orderId);
  }

  async getUserAddresses(userId: string) {
    return this.addressesService.getUserAddresses(userId);
  }

  async addUserAddress(userId: string, data: CreateAddressDto) {
    return this.addressesService.addUserAddress(userId, data);
  }

  // ==================================================================
  // REMAINING LOGIC (Rides & Deliveries)
  // ==================================================================

  // Since we didn't create specific services for Rides/Deliveries,
  // their logic remains here to "tie everything up".

  /**
   * Retrieves all deliveries for a user
   */
  async getUserDeliveries(userId: string) {
    try {
      const deliveries = await this.prisma.delivery.findMany({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
        include: { dropoffAddress: true },
        take: 50,
      });

      return deliveries.map((d) => ({
        id: d.id,
        status: d.status,
        total: d.deliveryFee,
        createdAt: d.createdAt,
        description: `Delivery to ${d.dropoffAddress.city}`,
        recipient: d.recipientName,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch deliveries for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to retrieve deliveries');
    }
  }

  /**
   * Retrieves detailed information for a specific delivery
   */
  async getDeliveryDetails(userId: string, deliveryId: string) {
    try {
      const delivery = await this.prisma.delivery.findFirst({
        where: {
          id: deliveryId,
          customerId: userId,
        },
        include: {
          pickupAddress: true,
          dropoffAddress: true,
          rider: { select: { name: true, phone: true } },
        },
      });

      if (!delivery) {
        throw new NotFoundException('Delivery not found');
      }

      return {
        ...delivery,
        riderName: delivery.rider?.name,
        riderPhone: delivery.rider?.phone,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      this.logger.error(
        `Failed to fetch delivery ${deliveryId} for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to retrieve delivery details');
    }
  }

  /**
   * Retrieves all rides for a user
   */
  async getUserRides(userId: string) {
    try {
      const rides = await this.prisma.ride.findMany({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
        include: { dropoffAddress: true },
        take: 50,
      });

      return rides.map((r) => ({
        id: r.id,
        status: r.status,
        total: r.totalFare,
        createdAt: r.createdAt,
        description: `Ride to ${r.dropoffAddress.city}`,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch rides for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to retrieve rides');
    }
  }

  /**
   * Retrieves detailed information for a specific ride
   */
  async getRideDetails(userId: string, rideId: string) {
    try {
      const ride = await this.prisma.ride.findFirst({
        where: {
          id: rideId,
          customerId: userId,
        },
        include: {
          pickupAddress: true,
          dropoffAddress: true,
          rider: {
            include: {
              vehicle: true,
            },
          },
        },
      });

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      return {
        ...ride,
        driverName: ride.rider?.name,
        driverPhone: ride.rider?.phone,
        vehicle: ride.rider?.vehicle
          ? `${ride.rider.vehicle.color} ${ride.rider.vehicle.model} (${ride.rider.vehicle.plateNumber})`
          : null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      this.logger.error(
        `Failed to fetch ride ${rideId} for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to retrieve ride details');
    }
  }

  async getOrderQuote(userId: string, data: CreateOrderDto) {
    return this.ordersService.calculateQuote(userId, data);
  }

  // ==================================================================
  // PROFILE LOGIC (Missing!)
  // ==================================================================
  async getUserProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          createdAt: true,
          role: true,
        },
      });

      if (!user) throw new NotFoundException('User not found');

      return {
        ...user,
        // The frontend expects 'avatarUrl', so we map the database 'image' field to it
        avatarUrl: user.image,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch profile for ${userId}`, error);
      throw new BadRequestException('Failed to fetch profile');
    }
  }
  async updateUserProfile(
    userId: string,
    data: { name: string; phone: string },
  ) {
    try {
      // 1. Update the user in the database
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          phone: data.phone,
        },
      });

      return updatedUser;
    } catch (error) {
      this.logger.error(`Failed to update profile for ${userId}`, error);
      throw new BadRequestException('Failed to update profile');
    }
  }
  async softDeleteUser(userId: string) {
    try {
      // Soft delete: Set deletedAt to now and change status to SUSPENDED
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          status: 'SUSPENDED', // Optional: Prevents login immediately
        },
      });
    } catch (error) {
      this.logger.error(`Failed to soft delete user ${userId}`, error);
      throw new BadRequestException('Failed to delete account');
    }
  }

  async deleteUserAddress(userId: string, addressId: string) {
    return this.addressesService.deleteUserAddress(userId, addressId);
  }

  // ==================================================================
  // EMERGENCY CONTACT SERVICE METHODS
  // ==================================================================

  async getEmergencyContacts(userId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addEmergencyContact(userId: string, data: CreateEmergencyContactDto) {
    return this.prisma.emergencyContact.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
      },
    });
  }

  async updateEmergencyContact(
    userId: string,
    id: string,
    data: UpdateEmergencyContactDto,
  ) {
    // Ensure the contact belongs to the user
    const contact = await this.prisma.emergencyContact.findFirst({
      where: { id, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.emergencyContact.update({
      where: { id },
      data,
    });
  }

  async deleteEmergencyContact(userId: string, id: string) {
    // Ensure the contact belongs to the user
    const contact = await this.prisma.emergencyContact.findFirst({
      where: { id, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.emergencyContact.delete({
      where: { id },
    });
  }

  // ==================================================================
  // NOTIFICATION CONFIG SERVICE METHODS
  // ==================================================================

  async getNotificationConfig(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationsPreferences: true },
    });
    let prefs: any = {};
    if (user?.notificationsPreferences) {
      try {
        prefs =
          typeof user.notificationsPreferences === 'string'
            ? JSON.parse(user.notificationsPreferences)
            : user.notificationsPreferences;
      } catch {
        prefs = {};
      }
    }
    return {
      push: prefs.push ?? true,
      sms: prefs.sms ?? false,
      email: prefs.email ?? true,
      emergencyAlerts: prefs.emergencyAlerts ?? true,
      tripUpdates: prefs.tripUpdates ?? true,
    };
  }

  async updateNotificationConfig(userId: string, config: any) {
    const allowed = ['push', 'sms', 'email', 'emergencyAlerts', 'tripUpdates'];
    const filtered = Object.fromEntries(
      Object.entries(config).filter(([k]) => allowed.includes(k)),
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationsPreferences: JSON.stringify(filtered) },
    });
    return { success: true };
  }
}
