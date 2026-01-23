import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiderDto } from './dto/create-rider.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { OtpService } from './otp.service';
import { EmailProducer } from '../mail/email.producer';

@Injectable()
export class RiderAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private emailProducer: EmailProducer,
  ) {}

  // ============== REGISTRATION ==============
  async registerRider(dto: CreateRiderDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Check if email already exists
    const existingRider = await this.prisma.rider.findUnique({
      where: { email: dto.email },
    });

    if (existingRider) {
      throw new ConflictException('Email already registered');
    }

    const rider = await this.prisma.rider.create({
      data: {
        name: dto.name,
        email: dto.email,
        countryCode: dto.countryCode,
        phone: dto.phone,
        role: dto.role,
        password: hashedPassword,
        image: dto.image,
        currentLat: dto.location?.lat,
        currentLng: dto.location?.lng,

        // Create vehicle if provided
        ...(dto.vehicleType && {
          vehicle: {
            create: {
              type: dto.vehicleType,
              brand: dto.vehicleBrand || 'Unknown',
              model: dto.vehicleModel || 'Unknown',
              plateNumber: dto.plateNumber || `TEMP-${Date.now()}`,
              color: dto.vehicleColor || 'Unknown',
              year: dto.vehicleYear || new Date().getFullYear(),
            },
          },
        }),

        // Create bank account if provided
        ...(dto.bankName &&
          dto.accountNumber && {
            bankAccount: {
              create: {
                bankName: dto.bankName,
                bankCode: dto.bankCode || '000',
                accountNumber: dto.accountNumber,
                accountName: dto.accountName || dto.name,
                currency: 'NGN',
              },
            },
          }),

        // Create documents if provided
        ...(dto.driverLicense && {
          documents: {
            create: [
              {
                type: 'DRIVER_LICENSE',
                url: dto.driverLicense,
                status: 'PENDING',
              },
              ...(dto.vehicleInsurance
                ? [
                    {
                      type: 'VEHICLE_INSURANCE',
                      url: dto.vehicleInsurance,
                      status: 'PENDING' as const,
                    },
                  ]
                : []),
              ...(dto.vehicleRegistration
                ? [
                    {
                      type: 'VEHICLE_REGISTRATION',
                      url: dto.vehicleRegistration,
                      status: 'PENDING' as const,
                    },
                  ]
                : []),
            ],
          },
        }),
      },
      include: { vehicle: true, documents: true, bankAccount: true },
    });

    // Send welcome email
    await this.emailProducer.sendRiderWelcomeEmail(rider.email, rider.name);

    return {
      rider: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        status: rider.status,
      },
      message: 'Registration successful! Please wait for account verification.',
    };
  }

  // ============== LOGIN ==============
  async loginRider(body: { email: string; password: string }) {
    const rider = await this.prisma.rider.findUnique({
      where: { email: body.email },
      include: {
        vehicle: true,
        documents: true,
        bankAccount: true,
      },
    });

    if (!rider) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(body.password, rider.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (rider.status === 'BANNED' || rider.status === 'SUSPENDED') {
      throw new UnauthorizedException(
        `Account is ${rider.status.toLowerCase()}. Contact support.`,
      );
    }

    const payload = { sub: rider.id, email: rider.email, role: 'RIDER' };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      user: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        image: rider.image,
        status: rider.status,
        rating: rider.rating,
        totalRides: rider.totalRides,
        walletBalance: rider.walletBalance,
        isOnline: rider.isOnline,
        currentLat: rider.currentLat,
        currentLng: rider.currentLng,
        vehicle: rider.vehicle,
        documents: rider.documents,
        bankAccount: rider.bankAccount,
      },
      accessToken,
      refreshToken,
    };
  }

  // ============== GET RIDER DETAILS ==============
  async getPublicRiderDetails(identifier: string) {
    const rider = await this.prisma.rider.findFirst({
      where: {
        OR: [{ id: identifier }, { email: identifier }],
      },
      include: {
        vehicle: true,
        documents: true,
        bankAccount: true,
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const { password, ...riderWithoutPassword } = rider;

    return {
      user: riderWithoutPassword,
    };
  }

  // ============== PASSWORD RESET ==============
  async sendOtpForPasswordReset(email: string) {
    const rider = await this.prisma.rider.findUnique({ where: { email } });
    if (!rider) {
      throw new NotFoundException('No rider account found with this email');
    }

    const otp = await this.otpService.generateOtp(email);
    await this.emailProducer.sendRiderPasswordResetOtp(email, rider.name, otp);

    return { message: 'OTP sent to your email' };
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    return this.otpService.verifyOtp(email, otp);
  }

  async resetRiderPassword(dto: ResetPasswordDto & { otp: string }) {
    const isValid = await this.otpService.verifyOtp(dto.email, dto.otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const rider = await this.prisma.rider.findUnique({
      where: { email: dto.email },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.rider.update({
      where: { email: dto.email },
      data: { password: hashedPassword },
    });

    await this.otpService.clearOtp(dto.email);

    return { message: 'Password reset successful' };
  }

  async changePassword(email: string, otp: string, newPassword: string) {
    const isValid = await this.otpService.verifyOtp(email, otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.rider.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await this.otpService.clearOtp(email);

    return { message: 'Password changed successfully' };
  }

  // ============== PROFILE UPDATE ==============
  async updateRiderProfile(riderId: string, dto: UpdateProfileDto) {
    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        name: dto.name,
        phone: dto.phone,
        image: dto.avatarUrl,
      },
    });

    const { password, ...riderWithoutPassword } = rider;
    return riderWithoutPassword;
  }

  // ============== REFRESH TOKEN ==============
  async refreshRiderToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const rider = await this.prisma.rider.findUnique({
        where: { id: payload.sub || payload.id }, // Support both for backward compatibility
      });

      if (!rider) {
        throw new UnauthorizedException('Rider not found');
      }

      const newPayload = { sub: rider.id, email: rider.email, role: 'RIDER' };
      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ============== NOTIFICATIONS PREFERENCES ==============
  async getNotificationsPreferences(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { notificationsPreferences: true },
    });

    return (
      rider?.notificationsPreferences || {
        newRides: true,
        rideUpdates: true,
        payouts: true,
        promotions: true,
      }
    );
  }

  async updateNotificationsPreferences(riderId: string, preferences: any) {
    const rider = await this.prisma.rider.update({
      where: { id: riderId },
      data: { notificationsPreferences: preferences },
    });

    return {
      message: 'Preferences updated',
      preferences: rider.notificationsPreferences,
    };
  }

  // ============== PUSH TOKEN ==============
  async savePushToken(riderId: string, token: string, platform: string) {
    await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        ...(platform === 'expo'
          ? { expoPushToken: token }
          : { fcmToken: token }),
      },
    });

    return { message: 'Push token saved' };
  }

  // ============== RIDER DETAILS (Vehicle, Documents, Bank) ==============
  async updateVehicleDetails(riderId: string, data: any) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      include: { vehicle: true },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    if (rider.vehicle) {
      // Update existing vehicle
      await this.prisma.vehicle.update({
        where: { id: rider.vehicle.id },
        data: {
          type: data.vehicleType,
          brand: data.vehicleBrand,
          model: data.vehicleModel,
          plateNumber: data.plateNumber,
          color: data.vehicleColor,
          year: data.vehicleYear,
        },
      });
    } else {
      // Create new vehicle
      await this.prisma.vehicle.create({
        data: {
          riderId: rider.id,
          type: data.vehicleType,
          brand: data.vehicleBrand,
          model: data.vehicleModel,
          plateNumber: data.plateNumber,
          color: data.vehicleColor,
          year: data.vehicleYear,
        },
      });
    }

    return { message: 'Vehicle details updated' };
  }

  async updateRiderDocuments(riderId: string, data: any) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    // Update or create documents
    const documentTypes = [
      { type: 'DRIVER_LICENSE', url: data.driverLicense },
      { type: 'VEHICLE_INSURANCE', url: data.vehicleInsurance },
      { type: 'VEHICLE_REGISTRATION', url: data.vehicleRegistration },
    ];

    for (const doc of documentTypes) {
      if (doc.url) {
        const existing = await this.prisma.riderDocument.findFirst({
          where: { riderId: rider.id, type: doc.type },
        });

        if (existing) {
          await this.prisma.riderDocument.update({
            where: { id: existing.id },
            data: { url: doc.url, status: 'PENDING' },
          });
        } else {
          await this.prisma.riderDocument.create({
            data: {
              riderId: rider.id,
              type: doc.type,
              url: doc.url,
              status: 'PENDING',
            },
          });
        }
      }
    }

    return { message: 'Documents updated' };
  }

  async getRiderDetails(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        vehicle: true,
        documents: true,
        bankAccount: true,
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return {
      profile: {
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        image: rider.image,
      },
      vehicle: rider.vehicle,
      documents: rider.documents,
      bankAccount: rider.bankAccount,
    };
  }
}
