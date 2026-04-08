import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { AppLogger } from '../libs/logger/app-logger.service';
import { EmailProducer } from '../mail/email.producer';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { RedisClientType } from 'redis';
import { OtpService } from './otp.service';
import {
  hashPassword,
  verifyPassword,
  upgradeNeeded,
} from './password-hash.util';
import { TokenRevocationService } from './token-revocation.service';
import { randomUUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class VendorAuthService {
  private securityNotificationsService: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
    private readonly emailProducer: EmailProducer,
    private readonly appLogger: AppLogger,
    private readonly tokenRevocation: TokenRevocationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
  ) { }

  private signRefreshToken(
    payload: Record<string, unknown>,
    expiresIn = '7d',
  ): string {
    return this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      { expiresIn: expiresIn as any },
    );
  }

  // Lazy injection to avoid circular dependency
  setSecurityNotificationsService(service: any) {
    this.securityNotificationsService = service;
  }

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
    const normalizedEmail = body.email.toLowerCase().trim();

    const vendor = await this.prisma.vendor.findUnique({
      where: { email: normalizedEmail },
      include: { store: true },
    });

    if (!vendor) {
      this.appLogger.warn('Failed vendor login: not found', {
        email: normalizedEmail,
      });
      throw new UnauthorizedException(
        'No account found with this email address. Please check your email or register for a new account.',
      );
    }

    // Verify password — handles both legacy bcrypt hashes and Argon2id hashes
    const isPasswordValid = await verifyPassword(
      body.password,
      vendor.password,
    );

    if (!isPasswordValid) {
      this.appLogger.warn('Failed vendor login: wrong password', {
        vendorId: vendor.id,
      });
      throw new UnauthorizedException(
        'Incorrect password. Please try again or reset your password.',
      );
    }

    // Transparent bcrypt → Argon2id upgrade on first successful login after migration
    if (upgradeNeeded(vendor.password)) {
      hashPassword(body.password)
        .then((newHash) =>
          this.prisma.vendor.update({
            where: { id: vendor.id },
            data: { password: newHash },
          }),
        )
        .catch(() => {
          // Non-critical: the next login will retry the upgrade
          this.appLogger.warn(
            `Hash upgrade scheduled for next login (vendorId=${vendor.id})`,
          );
        });
    }

    const payload = { sub: vendor.id, role: 'VENDOR', email: vendor.email };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.signRefreshToken(payload);

    // Send login notification
    if (this.securityNotificationsService) {
      try {
        await this.securityNotificationsService.notifyLogin(
          vendor.id,
          vendor.email,
          vendor.name,
          {
            timestamp: new Date(),
            device: 'Web/Mobile',
          },
        );
      } catch (error) {
        this.appLogger.error(
          'Failed to send login notification',
          error?.stack,
          { error },
        );
      }
    }

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
        status: vendor.status,
        storeId: vendor.store?.id || null,
      },
    };
  }

  // ---------------- REGISTER ----------------

  async registerVendor(
    dto: CreateVendorDto,
    files?: {
      businessRegCert?: Express.Multer.File[];
      taxIdDoc?: Express.Multer.File[];
      proofOfAddress?: Express.Multer.File[];
      storeLogo?: Express.Multer.File[];
      storeBanner?: Express.Multer.File[];
    },
  ) {
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

    // 1. Process files if they are present in the request (Multipart)
    // This allows "No Public Uploads" by keeping everything in one transaction
    // Moved here after duplicate check to prevent orphan file uploads
    if (files) {
      if (files.businessRegCert?.[0]) {
        const result = await this.storageService.uploadFile(
          files.businessRegCert[0],
        );
        dto.businessRegCert = result.url;
      }
      if (files.taxIdDoc?.[0]) {
        const result = await this.storageService.uploadFile(files.taxIdDoc[0]);
        dto.taxIdDoc = result.url;
      }
      if (files.proofOfAddress?.[0]) {
        const result = await this.storageService.uploadFile(
          files.proofOfAddress[0],
        );
        dto.proofOfAddress = result.url;
      }
      if (files.storeLogo?.[0]) {
        const result = await this.storageService.uploadFile(files.storeLogo[0]);
        dto.storeLogo = result.url;
        dto.image = result.url; // Use logo as profile image too
      }
      if (files.storeBanner?.[0]) {
        const result = await this.storageService.uploadFile(
          files.storeBanner[0],
        );
        dto.storeBanner = result.url;
      }
    }

    // Hash with Argon2id for all new vendor registrations
    const hashedPassword = await hashPassword(dto.password);

    // Resolve commission rate from global system setting (fallback: 10%)
    let storeCommissionRate = 10;
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'global_commission' },
      });
      if (setting?.value) {
        const parsed = parseFloat(setting.value);
        if (!isNaN(parsed)) storeCommissionRate = parsed;
      }
    } catch {
      // Non-critical: registration can still succeed with the default rate
    }

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
            ) as any,
            logo: dto.storeLogo,
            banner: dto.storeBanner,
            lat: dto.location?.lat,
            lng: dto.location?.lng,
            openHours: dto.openHours,
            status: 'PENDING',
            commissionRate: storeCommissionRate,
            ...(dto.cityId && { cityId: dto.cityId }),
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

    // Send account creation success notification
    if (this.securityNotificationsService) {
      try {
        await this.securityNotificationsService.notifyAccountCreated(
          vendor.id,
          vendor.email,
          vendor.name,
          vendor.store &&
            typeof vendor.store === 'object' &&
            'name' in vendor.store
            ? vendor.store.name
            : 'Your Store',
        );
      } catch (error) {
        this.appLogger.error(
          'Failed to send account creation notification',
          error?.stack,
          { error },
        );
      }
    }

    // Audit Hook
    this.eventEmitter.emit('system.action', {
      action: 'VENDOR_REGISTERED',
      severity: 'NORMAL',
      title: 'New Vendor Registration',
      message: `Vendor ${vendor.name} (${vendor.email}) has registered a new store.`,
      metadata: {
        vendorId: vendor.id,
        email: vendor.email,
        storeName: vendor.store?.name,
        businessType: vendor.businessType,
      },
    });

    return vendor;
  }

  // ---------------- SIGNUP EMAIL VERIFICATION OTP ----------------

  async sendSignupOtp(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    // Use a separate key prefix to avoid collision with password-reset OTPs
    const otp = await this.otpService.generateOtp(`signup:${normalizedEmail}`);

    try {
      await this.emailProducer.sendVendorSignupOtp(
        normalizedEmail,
        'Vendor', // name is unknown at signup
        otp,
      );
      this.appLogger.log(`Signup verification OTP sent to ${normalizedEmail}`);
    } catch (error) {
      this.appLogger.error(
        `Failed to send signup OTP to ${normalizedEmail}`,
        error?.stack,
        { error },
      );
      throw error;
    }
  }

  async verifySignupOtp(
    email: string,
    otp: string,
  ): Promise<{ verified: boolean }> {
    const normalizedEmail = email.toLowerCase().trim();
    const isValid = await this.otpService.verifyOtp(
      `signup:${normalizedEmail}`,
      otp,
    );
    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid or expired OTP. Please request a new code.',
      );
    }
    await this.otpService.clearOtp(`signup:${normalizedEmail}`);
    return { verified: true };
  }

  // ---------------- OTP PASSWORD RESET ----------------

  async sendOtpForPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Generate OTP with password-reset prefix to avoid collision with signup OTPs
    const otp = await this.otpService.generateOtp(`reset:${normalizedEmail}`);

    // Check if vendor exists (optional - email will be sent regardless)
    let vendorName = 'User';
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { email: normalizedEmail },
      });
      if (vendor) {
        vendorName = vendor.name;
      }
    } catch (error) {
      // Vendor may not exist, but we still send email
      this.appLogger.warn(
        `Vendor not found for email: ${normalizedEmail}`,
        error?.stack,
      );
    }

    try {
      // Send password reset email with OTP
      await this.emailProducer.sendVendorPasswordReset(
        normalizedEmail,
        vendorName,
        otp, // Pass OTP as resetCode
      );
      this.appLogger.log(`Password reset OTP sent to ${normalizedEmail}`);
    } catch (error) {
      this.appLogger.error(
        `Failed to queue password reset email to ${normalizedEmail}`,
        error?.stack,
        { error },
      );
      throw new InternalServerErrorException(
        'Failed to send password reset email. Please try again.',
      );
    }
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.otpService.verifyOtp(`reset:${normalizedEmail}`, otp);
  }

  async resetVendorPassword(dto: ResetPasswordDto & { otp: string }) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const valid = await this.otpService.verifyOtp(
      `reset:${normalizedEmail}`,
      dto.otp,
    );
    if (!valid) {
      throw new UnauthorizedException(
        'Invalid or expired OTP. Please request a new OTP.',
      );
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await this.otpService.clearOtp(`reset:${normalizedEmail}`);

    const updatedVendor = await this.prisma.vendor.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword },
    });

    // Send password reset notification
    if (this.securityNotificationsService) {
      try {
        await this.securityNotificationsService.notifyPasswordReset(
          updatedVendor.id,
          updatedVendor.email,
          updatedVendor.name,
          { timestamp: new Date() },
        );
      } catch (error) {
        this.appLogger.error(
          'Failed to send password reset notification',
          error?.stack,
          { error },
        );
      }
    }

    return updatedVendor;
  }

  // ---------------- AUTHENTICATED CHANGE PASSWORD ----------------

  async changePassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const valid = await this.otpService.verifyOtp(
      `reset:${normalizedEmail}`,
      otp,
    );
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

    const hashedPassword = await hashPassword(newPassword);

    await this.otpService.clearOtp(`reset:${normalizedEmail}`);

    await this.prisma.vendor.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword },
    });

    // Send password change notification
    if (this.securityNotificationsService) {
      try {
        await this.securityNotificationsService.notifyPasswordChanged(
          vendor.id,
          vendor.email,
          vendor.name,
          { timestamp: new Date() },
        );
      } catch (error) {
        this.appLogger.error(
          'Failed to send password change notification',
          error?.stack,
          { error },
        );
      }
    }

    return { message: 'Password changed successfully' };
  }

  // ---------------- PUSH TOKENS ----------------
  async savePushToken(vendorId: string, token: string, platform: string) {
    try {
      await this.prisma.pushToken.upsert({
        where: { token },
        update: { vendorId, platform },
        create: { token, vendorId, platform },
      });
      return { message: 'Push token saved successfully' };
    } catch (error) {
      this.appLogger.error(`Failed to save push token for vendor ${vendorId}:`, error?.stack);
      throw new InternalServerErrorException('Failed to save push token');
    }
  }

  async removePushToken(vendorId: string, token?: string) {
    try {
      if (token) {
        await this.prisma.pushToken.deleteMany({
          where: { token, vendorId },
        });
      } else {
        await this.prisma.pushToken.deleteMany({
          where: { vendorId },
        });
      }
      return { message: 'Push token removed successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to remove push token');
    }
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

      if (payload.jti) {
        const revoked = await this.tokenRevocation.isRefreshTokenRevoked(
          payload.jti,
        );
        if (revoked)
          throw new UnauthorizedException('Refresh token has been revoked');
      }

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

  /** Invalidates the supplied refresh token JTI on vendor logout. */
  async logoutVendor(refreshToken: string): Promise<{ message: string }> {
    try {
      const decoded = this.jwtService.decode(refreshToken) as Record<
        string,
        any
      > | null;
      if (decoded?.jti) {
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp ? decoded.exp - now : 7 * 24 * 60 * 60;
        await this.tokenRevocation.revokeRefreshToken(decoded.jti, ttl);
      }
    } catch {
      /* ignore */
    }
    return { message: 'Logged out successfully' };
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
      status,
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
      status,
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
  ):
    | 'RESTAURANT'
    | 'GROCERY'
    | 'PHARMACY'
    | 'MARKET'
    | 'FASHION'
    | 'ELECTRONICS'
    | 'FURNITURE'
    | 'BEAUTY'
    | 'HEALTH'
    | 'EDUCATION'
    | 'SERVICES'
    | 'AUTOMOTIVE'
    | 'TRAVEL'
    | 'ENTERTAINMENT'
    | 'RETAIL'
    | 'ONLINE'
    | 'MANUFACTURING'
    | 'LOGISTICS'
    | 'OTHER' {
    switch ((businessType || '').toUpperCase()) {
      case 'RESTAURANT':
      case 'RESTAURANT & CAFE':
      case 'FAST FOOD':
      case 'FOOD DELIVERY':
        return 'RESTAURANT';
      case 'GROCERY':
      case 'GROCERY & SUPERMARKET':
        return 'GROCERY';
      case 'PHARMACY':
        return 'PHARMACY';
      case 'FASHION':
      case 'FASHION & CLOTHING':
        return 'FASHION';
      case 'ELECTRONICS':
      case 'ELECTRONICS & GADGETS':
        return 'ELECTRONICS';
      case 'HOME & FURNITURE':
      case 'FURNITURE':
        return 'FURNITURE';
      case 'BEAUTY':
      case 'BEAUTY & PERSONAL CARE':
        return 'BEAUTY';
      case 'HEALTH':
      case 'HEALTH & FITNESS':
        return 'HEALTH';
      case 'EDUCATION':
      case 'EDUCATION & TUTORING':
        return 'EDUCATION';
      case 'PROFESSIONAL SERVICES':
      case 'SERVICES':
        return 'SERVICES';
      case 'AUTOMOTIVE':
        return 'AUTOMOTIVE';
      case 'TRAVEL':
      case 'TRAVEL & TOURISM':
        return 'TRAVEL';
      case 'ENTERTAINMENT':
        return 'ENTERTAINMENT';
      case 'RETAIL SHOP':
      case 'RETAIL':
        return 'RETAIL';
      case 'ONLINE STORE':
      case 'ONLINE':
        return 'ONLINE';
      case 'MANUFACTURING':
        return 'MANUFACTURING';
      case 'LOGISTICS':
      case 'LOGISTICS & SHIPPING':
        return 'LOGISTICS';
      case 'MARKET':
        return 'MARKET';
      case 'OTHER':
        return 'OTHER';
      default:
        return 'OTHER';
    }
  }
}
