import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { EmailProducer } from '../mail/email.producer';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { RedisClientType } from 'redis';
import { OtpService } from './otp.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
    private readonly emailProducer: EmailProducer,
  ) {}

  // ---------------- NOTIFICATION PREFERENCES ----------------

  async getNotificationsPreferences(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    return vendor?.notificationsPreferences || {};
  }

  async updateNotificationsPreferences(vendorId: string, preferences: any) {
    const vendor = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { notificationsPreferences: preferences },
    });
    return vendor.notificationsPreferences;
  }

  // ---------------- LOGIN ----------------

  async loginVendor(body: { email: string; password: string }) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { email: body.email },
      include: { store: true },
    });

    if (!vendor || !(await bcrypt.compare(body.password, vendor.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: vendor.id, role: 'VENDOR', email: vendor.email };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        countryCode: vendor.countryCode,
        phone: vendor.phone,
        businessType: vendor.businessType,
        employees: vendor.employees,
        image: vendor.image,
        storeId: vendor.store?.id || null,
      },
    };
  }

  // ---------------- REGISTER ----------------

  async registerVendor(dto: CreateVendorDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const vendor = await this.prisma.vendor.create({
      data: {
        name: dto.name,
        email: dto.email,
        countryCode: dto.countryCode,
        phone: dto.phone,
        businessType: dto.businessType,
        employees: dto.employees,
        password: hashedPassword,
        businessRegCert: dto.businessRegCert,
        taxIdDoc: dto.taxIdDoc,
        proofOfAddress: dto.proofOfAddress,
        image: dto.image,

        store: {
          create: {
            name: dto.storeName,
            description: dto.storeDescription,
            slug:
              dto.storeName.toLowerCase().replace(/\s+/g, '-') +
              '-' +
              Math.floor(Math.random() * 10000),
            type: VendorAuthService.mapBusinessTypeToStoreType(
              dto.businessType,
            ),
            logo: dto.storeLogo,
            banner: dto.storeBanner,
            lat: dto.location?.lat,
            lng: dto.location?.lng,
            openHours: dto.openHours,
            status: 'PENDING',
          },
        },
      },
      include: { store: true },
    });

    return vendor;
  }

  // ---------------- OTP PASSWORD RESET ----------------

  async sendOtpForPasswordReset(email: string): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({ where: { email } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const otp = await this.otpService.generateOtp(email);

    await this.emailProducer.sendVendorMessage(
      email,
      'Password Reset OTP',
      `Your OTP code for password reset is: ${otp}`,
    );
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    return this.otpService.verifyOtp(email, otp);
  }

  async resetVendorPassword(dto: ResetPasswordDto & { otp: string }) {
    const valid = await this.otpService.verifyOtp(dto.email, dto.otp);
    if (!valid) throw new UnauthorizedException('Invalid OTP');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.otpService.clearOtp(dto.email);

    return this.prisma.vendor.update({
      where: { email: dto.email },
      data: { password: hashedPassword },
    });
  }

  // ---------------- AUTHENTICATED CHANGE PASSWORD ----------------

  async changePassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const valid = await this.otpService.verifyOtp(email, otp);
    if (!valid) throw new UnauthorizedException('Invalid or expired OTP');

    const vendor = await this.prisma.vendor.findUnique({ where: { email } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.otpService.clearOtp(email);

    await this.prisma.vendor.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  // ---------------- PUSH TOKENS ----------------
  async savePushToken(vendorId: string, token: string, platform: string) {
    const field =
      platform === 'ios' || platform === 'android'
        ? 'expoPushToken'
        : 'fcmToken';

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { [field]: token },
    });

    return { message: 'Push token saved successfully' };
  }

  async removePushToken(vendorId: string) {
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { expoPushToken: null, fcmToken: null },
    });

    return { message: 'Push token removed successfully' };
  }

  // ---------------- PROFILE ----------------

  async updateVendorProfile(vendorId: string, dto: UpdateProfileDto) {
    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: dto,
    });
  }

  // ---------------- REFRESH TOKEN ----------------

  async refreshVendorToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);

      if (!payload?.sub || payload.role !== 'VENDOR') {
        throw new UnauthorizedException();
      }

      const vendor = await this.prisma.vendor.findUnique({
        where: { id: payload.sub },
      });
      if (!vendor) throw new NotFoundException('Vendor not found');

      const newPayload = {
        sub: vendor.id,
        role: 'VENDOR',
        email: vendor.email,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: '15m',
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ---------------- PUBLIC PROFILE ----------------

  async getPublicVendorDetails(idOrEmail: string) {
    let vendor = await this.prisma.vendor.findUnique({
      where: { id: idOrEmail },
      include: { store: true },
    });

    if (!vendor) {
      vendor = await this.prisma.vendor.findUnique({
        where: { email: idOrEmail },
        include: { store: true },
      });
    }

    if (!vendor) throw new NotFoundException('Vendor not found');

    const {
      id,
      name,
      email,
      countryCode,
      phone,
      businessType,
      employees,
      image,
      store,
    } = vendor;

    return {
      id,
      name,
      email,
      countryCode,
      phone,
      businessType,
      employees,
      image,
      storeId: store?.id || null,
    };
  }

  async getBusinessDetails(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { store: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return {
      step1: {
        businessName: vendor.name,
        businessEmail: vendor.email,
        phoneNumber: vendor.phone,
        businessType: vendor.businessType,
        employees: vendor.employees,
      },
      step2: {
        businessRegCert: vendor.businessRegCert,
        taxIdDoc: vendor.taxIdDoc,
        proofOfAddress: vendor.proofOfAddress,
      },
      step3: {
        storeName: vendor.store?.name || '',
        storeDescription: vendor.store?.description || '',
        openHours: vendor.store?.openHours || '',
      },
    };
  }

  // ---------------- BUSINESS INFO UPDATE ----------------
  async updateBusinessInfo(vendorId: string, data: any) {
    // Only allow updating certain fields
    const allowed = [
      'name',
      'email',
      'countryCode',
      'phone',
      'businessType',
      'employees',
    ];
    const update: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }
    return this.prisma.vendor.update({ where: { id: vendorId }, data: update });
  }

  async updateBusinessDocuments(vendorId: string, data: any) {
    // Only allow updating certain fields
    const allowed = ['businessRegCert', 'taxIdDoc', 'proofOfAddress'];
    const update: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }
    return this.prisma.vendor.update({ where: { id: vendorId }, data: update });
  }

  async updateStoreDetails(vendorId: string, data: any) {
    // Only allow updating certain fields on the related store
    const allowed = ['name', 'description', 'openHours'];
    const update: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key];
    }
    // Find the vendor's store
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { store: true },
    });
    if (!vendor?.store) throw new Error('Store not found');
    return this.prisma.store.update({
      where: { id: vendor.store.id },
      data: update,
    });
  }

  // ---------------- HELPERS ----------------

  static mapBusinessTypeToStoreType(
    businessType: string,
  ): 'RESTAURANT' | 'GROCERY' | 'PHARMACY' | 'MARKET' {
    switch ((businessType || '').toUpperCase()) {
      case 'RESTAURANT':
        return 'RESTAURANT';
      case 'GROCERY':
        return 'GROCERY';
      case 'PHARMACY':
        return 'PHARMACY';
      case 'MARKET':
        return 'MARKET';
      default:
        return 'RESTAURANT';
    }
  }
}
