import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async getRiderProfile(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        countryCode: true,
        image: true,
        status: true,
        rating: true,
        totalRides: true,
        walletBalance: true,
        isOnline: true,
        currentLat: true,
        currentLng: true,
        vehicle: {
          select: {
            id: true,
            type: true,
            brand: true,
            model: true,
            plateNumber: true,
            color: true,
            year: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            url: true,
            status: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            bankCode: true,
            accountNumber: true,
            accountName: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return rider;
  }

  async getWalletBalance(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { walletBalance: true },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return {
      balance: rider.walletBalance || 0,
    };
  }

  async getEarnings(riderId: string, timeframe: string = 'week') {
    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    // Fetch completed deliveries within the timeframe
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        riderId,
        status: 'DELIVERED',
        deliveredAt: {
          gte: startDate,
        },
      },
      select: {
        deliveryFee: true,
        createdAt: true,
        deliveredAt: true,
      },
    });

    // Calculate metrics
    const totalDeliveries = deliveries.length;
    const deliveryFees = deliveries.reduce(
      (sum, delivery) => sum + (delivery.deliveryFee || 0),
      0,
    );

    // Mock bonuses and service fees (you can implement actual logic)
    const bonuses = deliveryFees * 0.05; // 5% bonus
    const serviceFees = deliveryFees * -0.15; // 15% service fee
    const total = deliveryFees + bonuses + serviceFees;

    // Calculate average per delivery
    const avgPerDelivery = totalDeliveries > 0 ? total / totalDeliveries : 0;

    // Calculate hours online (mock - you can implement actual tracking)
    const hoursOnline = totalDeliveries * 0.75; // Assume 45min per delivery

    // Get rider rating
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { rating: true },
    });

    return {
      total,
      deliveries: totalDeliveries,
      avgPerDelivery,
      hoursOnline,
      rating: rider?.rating || 0,
      breakdown: {
        deliveryFees,
        bonuses,
        serviceFees,
      },
    };
  }

  async getBankAccount(riderId: string) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { riderId },
      select: {
        id: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      bankAccount,
    };
  }

  async updateBankAccount(riderId: string, updateData: UpdateBankAccountDto) {
    // Check if bank account exists
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { riderId },
    });

    if (!existingAccount) {
      // Create new bank account if it doesn't exist
      if (
        !updateData.bankName ||
        !updateData.accountNumber ||
        !updateData.accountName
      ) {
        throw new Error(
          'Bank name, account number, and account name are required',
        );
      }

      const newAccount = await this.prisma.bankAccount.create({
        data: {
          riderId,
          bankName: updateData.bankName,
          bankCode: updateData.bankCode || '',
          accountNumber: updateData.accountNumber,
          accountName: updateData.accountName,
        },
        select: {
          id: true,
          bankName: true,
          bankCode: true,
          accountNumber: true,
          accountName: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        message: 'Bank account created successfully',
        bankAccount: newAccount,
      };
    }

    // Update existing bank account
    const updatedAccount = await this.prisma.bankAccount.update({
      where: { riderId },
      data: {
        ...(updateData.bankName && { bankName: updateData.bankName }),
        ...(updateData.bankCode && { bankCode: updateData.bankCode }),
        ...(updateData.accountNumber && {
          accountNumber: updateData.accountNumber,
        }),
        ...(updateData.accountName && { accountName: updateData.accountName }),
      },
      select: {
        id: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Bank account updated successfully',
      bankAccount: updatedAccount,
    };
  }

  async getNotificationSettings(riderId: string) {
    let settings = await this.prisma.riderNotificationSettings.findUnique({
      where: { riderId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await this.prisma.riderNotificationSettings.create({
        data: {
          riderId,
          masterEnabled: true,
          newOrders: true,
          orderUpdates: true,
          vibration: true,
          paymentUpdates: true,
          dailySummary: false,
          weeklySummary: true,
          securityAlerts: true,
        },
      });
    }

    return {
      settings,
    };
  }

  async updateNotificationSettings(
    riderId: string,
    updateData: UpdateNotificationSettingsDto,
  ) {
    // Check if settings exist
    const existingSettings =
      await this.prisma.riderNotificationSettings.findUnique({
        where: { riderId },
      });

    if (!existingSettings) {
      // Create new settings if they don't exist
      const newSettings = await this.prisma.riderNotificationSettings.create({
        data: {
          riderId,
          masterEnabled: updateData.masterEnabled ?? true,
          newOrders: updateData.newOrders ?? true,
          orderUpdates: updateData.orderUpdates ?? true,
          vibration: updateData.vibration ?? true,
          paymentUpdates: updateData.paymentUpdates ?? true,
          dailySummary: updateData.dailySummary ?? false,
          weeklySummary: updateData.weeklySummary ?? true,
          securityAlerts: updateData.securityAlerts ?? true,
        },
      });

      return {
        message: 'Notification settings created successfully',
        settings: newSettings,
      };
    }

    // Update existing settings
    const updatedSettings = await this.prisma.riderNotificationSettings.update({
      where: { riderId },
      data: {
        ...(updateData.masterEnabled !== undefined && {
          masterEnabled: updateData.masterEnabled,
        }),
        ...(updateData.newOrders !== undefined && {
          newOrders: updateData.newOrders,
        }),
        ...(updateData.orderUpdates !== undefined && {
          orderUpdates: updateData.orderUpdates,
        }),
        ...(updateData.vibration !== undefined && {
          vibration: updateData.vibration,
        }),
        ...(updateData.paymentUpdates !== undefined && {
          paymentUpdates: updateData.paymentUpdates,
        }),
        ...(updateData.dailySummary !== undefined && {
          dailySummary: updateData.dailySummary,
        }),
        ...(updateData.weeklySummary !== undefined && {
          weeklySummary: updateData.weeklySummary,
        }),
        ...(updateData.securityAlerts !== undefined && {
          securityAlerts: updateData.securityAlerts,
        }),
      },
    });

    return {
      message: 'Notification settings updated successfully',
      settings: updatedSettings,
    };
  }

  async getPersonalInfo(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        countryCode: true,
        image: true,
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    // Map rider data to PersonalInfo structure
    const personalInfo = {
      id: rider.id,
      fullName: rider.name,
      address: '', // You may want to add an address field to the Rider model
      phoneCode: rider.countryCode,
      phoneNumber: rider.phone,
      dob: '', // You may want to add a dob field to the Rider model
      state: null,
      city: null,
      email: {
        value: rider.email,
        isVerified: true, // Assuming email is verified after registration
      },
      phone: {
        value: rider.phone,
        isVerified: true, // Assuming phone is verified after registration
      },
      image: rider.image,
    };

    return {
      personalInfo,
    };
  }

  async updatePersonalInfo(riderId: string, updateData: UpdatePersonalInfoDto) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    // Update rider with the provided data
    const updatedRider = await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        ...(updateData.fullName && { name: updateData.fullName }),
        ...(updateData.phoneCode && { countryCode: updateData.phoneCode }),
        ...(updateData.phoneNumber && { phone: updateData.phoneNumber }),
        ...(updateData.image !== undefined && { image: updateData.image }),
        // Add other fields as they're added to the Rider model
        // ...(updateData.address && { address: updateData.address }),
        // ...(updateData.dob && { dob: new Date(updateData.dob) }),
        // ...(updateData.state && { state: updateData.state }),
        // ...(updateData.city && { city: updateData.city }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        countryCode: true,
        image: true,
      },
    });

    const personalInfo = {
      id: updatedRider.id,
      fullName: updatedRider.name,
      address: '',
      phoneCode: updatedRider.countryCode,
      phoneNumber: updatedRider.phone,
      dob: '',
      state: null,
      city: null,
      email: {
        value: updatedRider.email,
        isVerified: true,
      },
      phone: {
        value: updatedRider.phone,
        isVerified: true,
      },
      image: updatedRider.image,
    };

    return {
      message: 'Personal information updated successfully',
      personalInfo,
    };
  }

  // Withdrawal methods
  async getWithdrawalInfo(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        walletBalance: true,
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            bankCode: true,
            accountNumber: true,
            accountName: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    // Hardcoded minimum withdrawal for now (can be moved to config/environment)
    const minWithdrawal = 5000;

    return {
      balance: rider.walletBalance,
      minWithdrawal,
      bankAccount: rider.bankAccount,
    };
  }

  async requestWithdrawal(
    riderId: string,
    createWithdrawalDto: CreateWithdrawalDto,
  ) {
    const { amount, bankAccountId } = createWithdrawalDto;

    // Fetch rider with balance and bank account
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        walletBalance: true,
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            bankCode: true,
            accountNumber: true,
            accountName: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    if (!rider.bankAccount) {
      throw new BadRequestException('No bank account configured');
    }

    if (rider.bankAccount.id !== bankAccountId) {
      throw new BadRequestException('Invalid bank account');
    }

    const minWithdrawal = 5000;
    if (amount < minWithdrawal) {
      throw new BadRequestException(
        `Minimum withdrawal is ₦${minWithdrawal.toLocaleString()}`,
      );
    }

    if (amount > rider.walletBalance) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create withdrawal (payout) request
    const withdrawal = await this.prisma.riderPayout.create({
      data: {
        riderId,
        amount,
        status: 'PENDING',
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        processedAt: true,
      },
    });

    // Deduct from wallet balance
    await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        walletBalance: {
          decrement: amount,
        },
      },
    });

    return {
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        bankAccount: rider.bankAccount,
        createdAt: withdrawal.createdAt.toISOString(),
        processedAt: withdrawal.processedAt?.toISOString(),
      },
    };
  }

  async getOrdersHistory(
    riderId: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    // Parse status filter if provided
    let statusArray: string[] | undefined;
    if (status) {
      statusArray = status.split(',').map((s) => s.trim());
    }

    // Build where clauses
    const rideWhere: any = { riderId };
    const deliveryWhere: any = { riderId };

    if (statusArray && statusArray.length > 0) {
      rideWhere.status = { in: statusArray };
      deliveryWhere.status = { in: statusArray };
    }

    // Fetch both rides and deliveries
    const [rides, deliveries] = await Promise.all([
      this.prisma.ride.findMany({
        where: rideWhere,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              image: true,
            },
          },
          pickupAddress: {
            select: {
              id: true,
              street: true,
              city: true,
              state: true,
              lat: true,
              lng: true,
            },
          },
          dropoffAddress: {
            select: {
              id: true,
              street: true,
              city: true,
              state: true,
              lat: true,
              lng: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.delivery.findMany({
        where: deliveryWhere,
        include: {
          order: {
            include: {
              store: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              image: true,
            },
          },
          pickupAddress: {
            select: {
              id: true,
              street: true,
              city: true,
              state: true,
              lat: true,
              lng: true,
            },
          },
          dropoffAddress: {
            select: {
              id: true,
              street: true,
              city: true,
              state: true,
              lat: true,
              lng: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Transform rides
    const transformedRides = rides.map((ride) => ({
      id: ride.id,
      type: 'ride',
      customerId: ride.customerId,
      customerName: ride.customer?.name || 'Unknown',
      customerPhone: ride.customer?.phone || 'N/A',
      customerImage: ride.customer?.image,
      pickupLocation: ride.pickupAddress
        ? `${ride.pickupAddress.street}, ${ride.pickupAddress.city}`
        : 'N/A',
      pickupLat: ride.pickupAddress?.lat,
      pickupLng: ride.pickupAddress?.lng,
      dropoffLocation: ride.dropoffAddress
        ? `${ride.dropoffAddress.street}, ${ride.dropoffAddress.city}`
        : 'N/A',
      dropoffLat: ride.dropoffAddress?.lat,
      dropoffLng: ride.dropoffAddress?.lng,
      totalAmount: ride.totalFare || 0,
      distance: ride.distanceKm,
      duration: ride.durationMin,
      status: ride.status,
      createdAt: ride.createdAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
    }));

    // Transform deliveries
    const transformedDeliveries = deliveries.map((delivery) => ({
      id: delivery.id,
      type: 'delivery',
      orderId: delivery.orderId,
      storeName: delivery.order?.store?.name || 'Unknown Store',
      storeAddress: delivery.order?.store?.address || 'N/A',
      customerName: delivery.customer?.name || 'Unknown',
      customerPhone: delivery.customer?.phone || 'N/A',
      customerImage: delivery.customer?.image,
      pickupLocation: delivery.pickupAddress
        ? `${delivery.pickupAddress.street}, ${delivery.pickupAddress.city}`
        : 'N/A',
      pickupLat: delivery.pickupAddress?.lat,
      pickupLng: delivery.pickupAddress?.lng,
      dropoffLocation: delivery.dropoffAddress
        ? `${delivery.dropoffAddress.street}, ${delivery.dropoffAddress.city}`
        : 'N/A',
      dropoffLat: delivery.dropoffAddress?.lat,
      dropoffLng: delivery.dropoffAddress?.lng,
      totalAmount: delivery.deliveryFee,
      distance: delivery.distanceKm,
      status: delivery.status,
      createdAt: delivery.createdAt,
      assignedAt: delivery.assignedAt,
      pickedUpAt: delivery.pickedUpAt,
      deliveredAt: delivery.deliveredAt,
    }));

    // Combine and sort by createdAt (newest first)
    const combined = [...transformedRides, ...transformedDeliveries].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    // Apply pagination
    const total = combined.length;
    const paginatedData = combined.slice(skip, skip + limit);

    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
