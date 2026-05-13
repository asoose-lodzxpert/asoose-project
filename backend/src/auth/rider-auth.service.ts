import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  hashPassword,
  verifyPassword,
  upgradeNeeded,
} from './password-hash.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiderDto } from './dto/create-rider.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { OtpService } from './otp.service';
import { EmailProducer } from '../mail/email.producer';
import { TokenRevocationService } from './token-revocation.service';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RiderAuthService {
  private readonly logger = new Logger(RiderAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private emailProducer: EmailProducer,
    private tokenRevocation: TokenRevocationService,
    private eventEmitter: EventEmitter2,
  ) { }

  private signRefreshToken(
    payload: Record<string, unknown>,
    expiresIn = '30d',
  ): string {
    return this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      { expiresIn: expiresIn as any },
    );
  }

  // ============== REGISTRATION ==============
  async registerRider(dto: CreateRiderDto) {
    // Hash with Argon2id for all new rider registrations
    const hashedPassword = await hashPassword(dto.password);

    // Check if email already exists
    const existingRider = await this.prisma.rider.findUnique({
      where: { email: dto.email },
    });

    if (existingRider) {
      throw new ConflictException('Email already registered');
    }

    // Resolve commission rate from global system setting (fallback: 10%)
    let commissionRate = 10;
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'global_commission' },
      });
      if (setting?.value) {
        const parsed = parseFloat(setting.value);
        if (!isNaN(parsed)) commissionRate = parsed;
      }
    } catch {
      // Non-critical: registration can still succeed with the default rate
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
        commissionRate,
        currentLat: dto.location?.lat,
        currentLng: dto.location?.lng,
        cityId: dto.cityId,

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

    // Audit Hook
    this.eventEmitter.emit('system.action', {
      action: 'RIDER_REGISTERED',
      severity: 'NORMAL',
      title: 'New Dispatcher Registration',
      message: `${rider.name} (${rider.email}) registered as a ${dto.role.toLowerCase() || 'rider'}.`,
      metadata: {
        riderId: rider.id,
        email: rider.email,
        phone: rider.phone,
        role: rider.role,
        vehicleType: dto.vehicleType,
      },
    });

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
      this.logger.warn('Failed rider login: not found', { email: body.email });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password — handles both legacy bcrypt hashes and Argon2id hashes
    const isPasswordValid = await verifyPassword(body.password, rider.password);
    if (!isPasswordValid) {
      this.logger.warn('Failed rider login: wrong password', {
        riderId: rider.id,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Transparent bcrypt → Argon2id upgrade on first successful login after migration
    if (upgradeNeeded(rider.password)) {
      hashPassword(body.password)
        .then((newHash) =>
          this.prisma.rider.update({
            where: { id: rider.id },
            data: { password: newHash },
          }),
        )
        .catch(() => {
          // Non-critical: the next login will retry the upgrade
        });
    }

    if (rider.status === 'BANNED' || rider.status === 'SUSPENDED') {
      this.logger.warn('Failed rider login: account restricted', {
        riderId: rider.id,
        status: rider.status,
      });
      throw new UnauthorizedException(
        `Account is ${rider.status.toLowerCase()}. Contact support.`,
      );
    }

    const payload = { sub: rider.id, email: rider.email, role: rider.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.signRefreshToken(payload);

    return {
      user: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        image: rider.image,
        role: rider.role,
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

    const hashedPassword = await hashPassword(dto.newPassword);
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

    const hashedPassword = await hashPassword(newPassword);
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
      if (payload.jti) {
        const revoked = await this.tokenRevocation.isRefreshTokenRevoked(
          payload.jti,
        );
        if (revoked)
          throw new UnauthorizedException('Refresh token has been revoked');
      }
      const rider = await this.prisma.rider.findUnique({
        where: { id: payload.sub || payload.id },
      });

      if (!rider) {
        throw new UnauthorizedException('Rider not found');
      }

      const newPayload = {
        sub: rider.id,
        email: rider.email,
        role: rider.role,
      };
      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.signRefreshToken(newPayload);

      // Invalidate the old refresh token
      if (payload.jti) {
        const now = Math.floor(Date.now() / 1000);
        const ttl = payload.exp ? payload.exp - now : 30 * 24 * 60 * 60;
        await this.tokenRevocation.revokeRefreshToken(payload.jti, ttl);
      }

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /** Invalidates the supplied refresh token JTI on logout. */
  async logoutRider(refreshToken: string): Promise<{ message: string }> {
    try {
      const decoded = this.jwtService.decode(refreshToken) as Record<
        string,
        any
      > | null;
      if (decoded?.jti) {
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp ? decoded.exp - now : 30 * 24 * 60 * 60;
        await this.tokenRevocation.revokeRefreshToken(decoded.jti, ttl);
      }
    } catch {
      /* ignore */
    }
    return { message: 'Logged out successfully' };
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
    const isExpoToken =
      token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken[');
    const effectivePlatform = isExpoToken ? 'expo' : platform;

    try {
      await this.prisma.pushToken.upsert({
        where: { token },
        update: { riderId, platform: effectivePlatform },
        create: { token, riderId, platform: effectivePlatform },
      });
      return { message: 'Push token saved' };
    } catch (error) {
      this.logger.error(`Failed to save push token for rider ${riderId}:`, error);
      throw new BadRequestException('Failed to save push token');
    }
  }

  // ============== DELETE PUSH TOKEN ==============
  async deletePushToken(riderId: string, token?: string) {
    try {
      if (token) {
        await this.prisma.pushToken.deleteMany({
          where: { token, riderId },
        });
      } else {
        await this.prisma.pushToken.deleteMany({
          where: { riderId },
        });
      }
      return { message: 'Push token deleted' };
    } catch (error) {
      throw new BadRequestException('Failed to delete push token');
    }
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
