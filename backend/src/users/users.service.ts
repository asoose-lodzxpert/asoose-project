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
import { PaystackAccountService } from '../payment/paystack-account.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private addressesService: AddressesService,
    private readonly paystackAccount: PaystackAccountService,
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
        include: { dropoffAddress: true, pickupAddress: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return deliveries.map((d) => {
        const PLACEHOLDER = new Set(['unknown', 'n/a']);
        const isReal = (v: unknown): v is string =>
          typeof v === 'string' &&
          v.trim().length > 0 &&
          !PLACEHOLDER.has(v.trim().toLowerCase());

        // Resolve pickup label: prefer city, fall back to first part of street
        const pickupCity = isReal(d.pickupAddress?.city)
          ? d.pickupAddress!.city!
          : d.pickupAddress?.street?.split(',')[0]?.trim() || null;

        // Resolve dropoff label: prefer city, fall back to first part of street
        const dropoffCity = isReal(d.dropoffAddress?.city)
          ? d.dropoffAddress!.city!
          : d.dropoffAddress?.street?.split(',')[0]?.trim() || null;

        // Build a distinctive description
        let description: string;
        if (d.packageDetails && isReal(d.packageDetails)) {
          // "2x Shoes, 1x Watch → Maiduguri"
          const dest = dropoffCity || 'destination';
          description = `${d.packageDetails.trim()} → ${dest}`;
        } else if (pickupCity && dropoffCity && pickupCity !== dropoffCity) {
          // "From Lagos to Maiduguri"
          description = `From ${pickupCity} to ${dropoffCity}`;
        } else if (d.pickupAddress?.street && dropoffCity) {
          // "From 12 Herbert Macaulay to Maiduguri"
          const fromStreet = d.pickupAddress.street.split(',')[0].trim();
          description = `From ${fromStreet} to ${dropoffCity}`;
        } else {
          description = `Delivery to ${dropoffCity || 'destination'}`;
        }

        return {
          id: d.id,
          status: d.status,
          total: d.deliveryFee ?? 0,
          createdAt: d.createdAt,
          description,
          recipient: d.recipientName || 'Recipient',
        };
      });
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

      // Strip placeholder values (stored by old clients as 'Unknown' / 'N/A')
      // so they are not shown in the formatted address string.
      const PLACEHOLDER = new Set(['unknown', 'n/a']);
      const isReal = (v: unknown): v is string =>
        typeof v === 'string' &&
        v.trim().length > 0 &&
        !PLACEHOLDER.has(v.trim().toLowerCase());
      const formatAddress = (addr: any) =>
        addr
          ? [addr.street, addr.city, addr.state].filter(isReal).join(', ')
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletBalance: true,
        walletBalanceHidden: true,
        dedicatedVirtualAccountNumber: true,
        dedicatedVirtualAccountBank: true,
        paystackCustomerCode: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      balance: user.walletBalance,
      currency: '₦',
      balanceHidden: user.walletBalanceHidden,
      hasWallet: !!user.dedicatedVirtualAccountNumber,
      accountNumber: user.dedicatedVirtualAccountNumber ?? null,
      bankName: user.dedicatedVirtualAccountBank ?? null,
    };
  }

  async provisionWallet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        dedicatedVirtualAccountNumber: true,
        dedicatedVirtualAccountBank: true,
        walletBalance: true,
        walletBalanceHidden: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Return existing wallet without re-provisioning
    if (user.dedicatedVirtualAccountNumber) {
      return {
        message: 'Wallet already provisioned',
        accountNumber: user.dedicatedVirtualAccountNumber,
        bankName: user.dedicatedVirtualAccountBank,
        balance: user.walletBalance,
        balanceHidden: user.walletBalanceHidden,
        hasWallet: true,
      };
    }

    // Split name into first/last
    const [firstName, ...rest] = (user.name ?? 'Customer').trim().split(' ');
    const lastName = rest.join(' ') || firstName;

    // Use the single-step assign endpoint (recommended by Paystack).
    // Account details arrive asynchronously via the
    // `dedicatedaccount.assign.success` webhook which updates our DB.
    await this.paystackAccount.assignDedicatedAccount({
      email: user.email,
      firstName,
      lastName,
      phone: user.phone ?? undefined,
    });

    return {
      message:
        'Wallet creation initiated. Your account number will be ready shortly.',
      accountNumber: null,
      bankName: null,
      balance: user.walletBalance,
      balanceHidden: user.walletBalanceHidden,
      hasWallet: false,
      pending: true,
    };
  }

  async setWalletVisibility(userId: string, hidden: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { walletBalanceHidden: hidden },
    });
    return { balanceHidden: hidden };
  }

  /**
   * Triggers a Paystack DVA requery for the user's dedicated virtual account.
   * Call this when a customer reports their balance hasn't been updated after
   * a bank transfer.  Paystack rate-limits to once per 10 minutes.
   */
  async requeryWallet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        dedicatedVirtualAccountNumber: true,
        dedicatedVirtualAccountBank: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.dedicatedVirtualAccountNumber) {
      throw new BadRequestException(
        'No wallet account found. Please create a wallet first.',
      );
    }

    await this.paystackAccount.requeryDVA(
      user.dedicatedVirtualAccountNumber,
      user.dedicatedVirtualAccountBank ?? undefined,
    );

    return {
      message:
        'Requery initiated. Any pending transfers will reflect in your balance shortly.',
    };
  }

  async getWalletHistory(userId: string, page = 1, limit = 10) {
    // 1. Get user's Paystack customer code for DVA top-up lookup
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { paystackCustomerCode: true },
    });

    // 2. Fetch local DB payments (orders, rides, deliveries) — no limit so we can merge
    const dbPayments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        method: true,
        status: true,
        reference: true,
        createdAt: true,
        paidAt: true,
        orderId: true,
        rideId: true,
        deliveryId: true,
      },
    });

    const dbRows = dbPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method as string,
      status: p.status as string,
      reference: p.reference,
      type: p.orderId
        ? 'Order Payment'
        : p.rideId
          ? 'Ride Payment'
          : p.deliveryId
            ? 'Delivery Payment'
            : 'Wallet Top-up',
      date: (p.paidAt ?? p.createdAt).toISOString(),
    }));

    // 3. Fetch Paystack DVA top-ups (only if customer has a Paystack profile)
    let paystackRows: typeof dbRows = [];
    if (user?.paystackCustomerCode) {
      const dvaTopups = await this.paystackAccount.listCustomerDVATopups(
        user.paystackCustomerCode,
        1, // always fetch first page (50 results) — DVA top-ups are infrequent
        50,
      );

      // Build a set of references already in DB to avoid duplicates
      const knownRefs = new Set(dbRows.map((r) => r.reference));

      paystackRows = dvaTopups
        .filter((tx) => !knownRefs.has(tx.reference))
        .map((tx) => ({
          id: tx.reference, // use reference as id (no local DB id)
          amount: tx.amount / 100, // kobo → naira
          method: 'dedicated_nuban',
          status:
            tx.status.toUpperCase() === 'SUCCESS'
              ? 'PAID'
              : tx.status.toUpperCase(),
          reference: tx.reference,
          type: 'Wallet Top-up',
          date: tx.paidAt ?? tx.createdAt,
        }));
    }

    // 4. Merge, sort by date desc, paginate
    const all = [...dbRows, ...paystackRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const total = all.length;
    const skip = (page - 1) * limit;
    const data = all.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getSavedCards(userId: string) {
    const cards = await this.prisma.savedCard.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        last4: true,
        brand: true,
        expiryMonth: true,
        expiryYear: true,
        bank: true,
        cardType: true,
        isDefault: true,
        createdAt: true,
      },
    });
    return cards;
  }

  async setDefaultCard(userId: string, cardId: string) {
    // Clear existing default, set new one
    await this.prisma.$transaction([
      this.prisma.savedCard.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      this.prisma.savedCard.updateMany({
        where: { id: cardId, userId },
        data: { isDefault: true },
      }),
    ]);
    return { success: true };
  }

  async deleteSavedCard(userId: string, cardId: string) {
    const existing = await this.prisma.savedCard.findFirst({
      where: { id: cardId, userId },
    });
    if (!existing) throw new NotFoundException('Card not found');
    await this.prisma.savedCard.delete({ where: { id: cardId } });
    return { success: true, message: 'Card removed' };
  }
}
