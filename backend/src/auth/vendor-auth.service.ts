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
    // Normalize email to lowercase
    const normalizedEmail = body.email.toLowerCase().trim();

    console.log('=== VENDOR LOGIN ATTEMPT ===');
    console.log('Email:', normalizedEmail);

    const vendor = await this.prisma.vendor.findUnique({
      where: { email: normalizedEmail },
      include: { store: true },
    });

    if (!vendor) {
      console.log('❌ Vendor not found in database');
      throw new UnauthorizedException(
        'No account found with this email address. Please check your email or register for a new account.',
      );
    }

    console.log('✓ Vendor found:', vendor.id);

    const isPasswordValid = await bcrypt.compare(
      body.password,
      vendor.password,
    );

    if (!isPasswordValid) {
      console.log('❌ Password validation failed');
      throw new UnauthorizedException(
        'Incorrect password. Please try again or reset your password.',
      );
    }

    console.log('✓ Password validated');

    const payload = { sub: vendor.id, role: 'VENDOR', email: vendor.email };
    console.log('Creating JWT with payload:', JSON.stringify(payload));

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    console.log('✓ Tokens generated');
    console.log(
      'Access Token (first 50 chars):',
      accessToken.substring(0, 50) + '...',
    );

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
    // Normalize email to lowercase
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if vendor already exists
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingVendor) {
      throw new UnauthorizedException(
        'An account with this email already exists. Please login or use a different email.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const vendor = await this.prisma.vendor.create({
      data: {
        name: dto.name,
        email: normalizedEmail,
        countryCode: dto.countryCode,
        phone: dto.phone,
        businessType: dto.businessType,
        employees: dto.employees,
        password: hashedPassword,
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

    // Create vendor documents separately
    const documents = [
      { name: 'businessRegCert', url: dto.businessRegCert },
      { name: 'taxIdDoc', url: dto.taxIdDoc },
      { name: 'proofOfAddress', url: dto.proofOfAddress },
    ];

    for (const doc of documents) {
      if (doc.url) {
        await this.prisma.vendorDocument.create({
          data: {
            vendorId: vendor.id,
            name: doc.name,
            url: doc.url,
            fileName: `${doc.name}-${Date.now()}`,
            status: 'PENDING',
          },
        });
      }
    }

    return vendor;
  }

  // ---------------- OTP PASSWORD RESET ----------------

  async sendOtpForPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const vendor = await this.prisma.vendor.findUnique({
      where: { email: normalizedEmail },
    });

    if (!vendor) {
      throw new NotFoundException(
        'No account found with this email address. Please check your email or register for a new account.',
      );
    }

    const otp = await this.otpService.generateOtp(normalizedEmail);

    await this.emailProducer.sendVendorMessage(
      normalizedEmail,
      'Password Reset OTP',
      `Your OTP code for password reset is: ${otp}`,
    );
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.otpService.verifyOtp(normalizedEmail, otp);
  }

  async resetVendorPassword(dto: ResetPasswordDto & { otp: string }) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const valid = await this.otpService.verifyOtp(normalizedEmail, dto.otp);
    if (!valid) {
      throw new UnauthorizedException(
        'Invalid or expired OTP. Please request a new OTP.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.otpService.clearOtp(normalizedEmail);

    return this.prisma.vendor.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword },
    });
  }

  // ---------------- AUTHENTICATED CHANGE PASSWORD ----------------

  async changePassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const valid = await this.otpService.verifyOtp(normalizedEmail, otp);
    if (!valid) {
      throw new UnauthorizedException(
        'Invalid or expired OTP. Please request a new OTP.',
      );
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { email: normalizedEmail },
    });

    if (!vendor) {
      throw new NotFoundException('No account found with this email address.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.otpService.clearOtp(normalizedEmail);

    await this.prisma.vendor.update({
      where: { email: normalizedEmail },
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
    const normalizedIdOrEmail = idOrEmail.toLowerCase().trim();

    let vendor = await this.prisma.vendor.findUnique({
      where: { id: normalizedIdOrEmail },
      include: { store: true },
    });

    if (!vendor) {
      vendor = await this.prisma.vendor.findUnique({
        where: { email: normalizedIdOrEmail },
        include: { store: true },
      });
    }

    if (!vendor) {
      throw new NotFoundException(
        'Vendor profile not found. Please check your credentials.',
      );
    }

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
      include: {
        store: true,
        documents: true,
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    // Get document URLs from VendorDocument table
    const businessRegCert =
      vendor.documents.find((d) => d.name === 'businessRegCert')?.url || '';
    const taxIdDoc =
      vendor.documents.find((d) => d.name === 'taxIdDoc')?.url || '';
    const proofOfAddress =
      vendor.documents.find((d) => d.name === 'proofOfAddress')?.url || '';

    // Get bank account if exists
    let bankAccountData: {
      bankName: string;
      bankCode: string;
      accountNumber: string;
      accountName: string;
    } | null = null;

    if (vendor.store) {
      const bankAccount = await this.prisma.bankAccount.findUnique({
        where: { storeId: vendor.store.id },
        select: {
          bankName: true,
          bankCode: true,
          accountNumber: true,
          accountName: true,
        },
      });

      if (bankAccount) {
        bankAccountData = {
          bankName: bankAccount.bankName,
          bankCode: bankAccount.bankCode,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
        };
      }
    }

    return {
      step1: {
        businessName: vendor.name,
        businessEmail: vendor.email,
        phoneNumber: vendor.phone,
        businessType: vendor.businessType,
        employees: vendor.employees,
      },
      step2: {
        businessRegCert,
        taxIdDoc,
        proofOfAddress,
      },
      step3: {
        storeName: vendor.store?.name || '',
        storeDescription: vendor.store?.description || '',
        openHours: vendor.store?.openHours || '',
      },
      step4: bankAccountData,
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
    const allowed = ['businessRegCert', 'taxIdDoc', 'proofOfAddress'];

    for (const key of allowed) {
      if (data[key] !== undefined && data[key]) {
        // Check if document already exists
        const existing = await this.prisma.vendorDocument.findFirst({
          where: {
            vendorId,
            name: key,
          },
        });

        if (existing) {
          // Update existing document
          await this.prisma.vendorDocument.update({
            where: { id: existing.id },
            data: {
              url: data[key],
              fileName: `${key}-${Date.now()}`,
              uploadedDate: new Date(),
              status: 'PENDING', // Reset to pending for re-verification
            },
          });
        } else {
          // Create new document
          await this.prisma.vendorDocument.create({
            data: {
              vendorId,
              name: key,
              url: data[key],
              fileName: `${key}-${Date.now()}`,
              status: 'PENDING',
            },
          });
        }
      }
    }

    // Return updated vendor with documents
    return this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { documents: true },
    });
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
