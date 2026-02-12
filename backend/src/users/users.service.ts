import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAddressDto,
  CreateOrderDto,
  OrderItemDto,
} from './dto/users.dto';
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
  // ORDERS METHODS
  // ==================================================================

  async createOrder(
    userId: string,
    data: CreateOrderDto,
    idempotencyKey?: string,
  ) {
    return this.ordersService.createOrder(userId, data, idempotencyKey);
  }

  async createMultiOrder(userId: string, data: CreateOrderDto) {
    return this.ordersService.createMultiOrder(userId, data);
  }

  // Helper: Check if items belong to different stores
  async checkIfMultiVendor(items: OrderItemDto[]): Promise<boolean> {
    if (!items || items.length === 0) return false;

    const ids = items.map((i) => i.id);
    // Fetch only the storeIds for these products
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { storeId: true },
    });

    const storeIds = new Set(products.map((p) => p.storeId));
    return storeIds.size > 1;
  }

  // Helper: Derive a single restaurantId from the items
  async deriveRestaurantId(items: OrderItemDto[]): Promise<string> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: items[0].id },
      select: { storeId: true },
    });

    if (!product) throw new BadRequestException('Product not found');
    return product.storeId;
  }

  async getUserOrders(
    userId: string,
    opts?: { page?: number; pageSize?: number; status?: string },
  ) {
    return this.ordersService.getUserOrders(userId, opts);
  }

  async getOrderDetails(userId: string, orderId: string) {
    return this.ordersService.getOrderDetails(userId, orderId);
  }

  async getOrderQuote(userId: string, data: CreateOrderDto) {
    return this.ordersService.calculateQuote(userId, data);
  }

  // ==================================================================
  // ADDRESS METHODS
  // ==================================================================

  async getUserAddresses(userId: string) {
    return this.addressesService.getUserAddresses(userId);
  }

  async addUserAddress(userId: string, data: CreateAddressDto) {
    return this.addressesService.addUserAddress(userId, data);
  }

  async deleteUserAddress(userId: string, addressId: string) {
    return this.addressesService.deleteUserAddress(userId, addressId);
  }

  async updateExpoPushToken(userId: string, expoPushToken: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { expoPushToken },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update expoPushToken for user ${userId}`,
        error,
      );
      throw new BadRequestException('Failed to update expo push token');
    }
  }

  async deleteExpoPushToken(userId: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { expoPushToken: null },
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete expoPushToken for user ${userId}`,
        error,
      );
      throw new BadRequestException('Failed to delete expo push token');
    }
  }

  // ==================================================================
  // DELIVERIES & RIDES
  // ==================================================================

  async getUserDeliveries(
    userId: string,
    opts?: { status?: string; page?: number; pageSize?: number },
  ) {
    try {
      let statusFilter: any = undefined;
      if (opts?.status === 'active') {
        statusFilter = { notIn: ['DELIVERED', 'CANCELLED'] };
      } else if (opts?.status === 'completed') {
        statusFilter = { in: ['DELIVERED', 'CANCELLED'] };
      } else if (opts?.status) {
        statusFilter = opts.status;
      }

      const page = opts?.page ?? 1;
      const pageSize = opts?.pageSize ?? 50;

      const deliveries = await this.prisma.delivery.findMany({
        where: {
          customerId: userId,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: { dropoffAddress: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
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

  async getDeliveryDetails(userId: string, deliveryId: string) {
    try {
      const delivery = await this.prisma.delivery.findFirst({
        where: { id: deliveryId, customerId: userId },
        include: {
          pickupAddress: true,
          dropoffAddress: true,
          rider: { select: { name: true, phone: true } },
        },
      });

      if (!delivery) throw new NotFoundException('Delivery not found');

      const formatAddress = (addr: any) =>
        addr
          ? [addr.street, addr.city, addr.state].filter(Boolean).join(', ')
          : '';

      return {
        ...delivery,
        riderName: delivery.rider?.name,
        riderPhone: delivery.rider?.phone,
        pickupAddress: {
          ...delivery.pickupAddress,
          address: formatAddress(delivery.pickupAddress),
        },
        dropoffAddress: {
          ...delivery.dropoffAddress,
          address: formatAddress(delivery.dropoffAddress),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to retrieve delivery details');
    }
  }

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

  async getRideDetails(userId: string, rideId: string) {
    try {
      const ride = await this.prisma.ride.findFirst({
        where: { id: rideId, customerId: userId },
        include: {
          pickupAddress: true,
          dropoffAddress: true,
          rider: { include: { vehicle: true } },
        },
      });

      if (!ride) throw new NotFoundException('Ride not found');

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
      throw new BadRequestException('Failed to retrieve ride details');
    }
  }

  // ==================================================================
  // PROFILE & SETTINGS
  // ==================================================================

  async getUserProfile(userId: string) {
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
    return { ...user, avatarUrl: user.image };
  }

  async updateUserProfile(
    userId: string,
    data: { name: string; phone: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name, phone: data.phone },
    });
  }

  async softDeleteUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), status: 'SUSPENDED' },
    });
  }

  async getEmergencyContacts(userId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addEmergencyContact(userId: string, data: CreateEmergencyContactDto) {
    return this.prisma.emergencyContact.create({
      data: { ...data, user: { connect: { id: userId } } },
    });
  }

  async upsertEmergencyContact(
    userId: string,
    id: string,
    data: UpdateEmergencyContactDto,
  ) {
    return this.prisma.emergencyContact.upsert({
      where: { id },
      update: { ...data },
      create: { ...data, user: { connect: { id: userId } } },
    });
  }

  async deleteEmergencyContact(userId: string, id: string) {
    const contact = await this.prisma.emergencyContact.findFirst({
      where: { id, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return this.prisma.emergencyContact.delete({ where: { id } });
  }

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

  async getWalletBalance(userId: string) {
    return { balance: 0, currency: '₦' };
  }

  async getSavedCards(userId: string) {
    return [];
  }

  async deleteSavedCard(userId: string, cardId: string) {
    return { success: true, message: 'Card deleted successfully' };
  }
}
