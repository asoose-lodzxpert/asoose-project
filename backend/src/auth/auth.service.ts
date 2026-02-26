import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { CreateRiderDto } from './dto/create-rider.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleOAuthDto } from './dto/google-oauth.dto';
import { AppleOAuthDto } from './dto/apple-oauth.dto';
import { OtpService } from './otp.service';
import { EmailProducer } from '../mail/email.producer';
import { TokenRevocationService } from './token-revocation.service';
import {
  hashPassword,
  verifyPassword,
  upgradeNeeded,
} from './password-hash.util';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly emailProducer: EmailProducer,
    private readonly tokenRevocation: TokenRevocationService,
  ) {}

  /** Signs a refresh token embedding a unique JTI for individual revocation. */
  private signRefreshToken(
    payload: Record<string, unknown>,
    expiresIn = '30d',
  ): string {
    return this.jwtService.sign(
      { ...payload, jti: randomUUID() },
      { expiresIn: expiresIn as any },
    );
  }
  // User
  async loginUser(body: { email: string; password: string }) {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        this.logger.warn('Failed login: user not found', { email: body.email });
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        this.logger.warn('Failed login: account inactive', {
          userId: user.id,
          status: user.status,
        });
        throw new UnauthorizedException(
          `Account is ${user.status.toLowerCase()}`,
        );
      }

      // Verify password — handles both legacy bcrypt hashes and Argon2id hashes
      const isPasswordValid = await verifyPassword(
        body.password,
        user.password,
      );
      if (!isPasswordValid) {
        this.logger.warn('Failed login: wrong password', { userId: user.id });
        throw new UnauthorizedException('Invalid email or password');
      }

      // Transparent bcrypt → Argon2id upgrade on first successful login after
      // the migration.  Runs in the background so it never delays the response.
      if (upgradeNeeded(user.password)) {
        hashPassword(body.password)
          .then((newHash) =>
            this.prisma.user.update({
              where: { id: user.id },
              data: { password: newHash },
            }),
          )
          .catch(() => {
            // Non-critical: the next login will retry the upgrade
            this.logger.warn(
              `Hash upgrade scheduled for next login (userId=${user.id})`,
            );
          });
      }

      // Generate JWT access and refresh tokens
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.signRefreshToken(payload);

      // Split name into firstName and lastName for response
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        access_token,
        refresh_token,
        user: {
          id: user.id,
          email: user.email,
          firstName,
          lastName,
          name: user.name,
          role: user.role,
          phone: user.phone,
          image: user.image,
          status: user.status,
          verificationStatus: user.verificationStatus,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  async registerUser(dto: CreateUserDto) {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password with Argon2id for all new registrations
      const hashedPassword = await hashPassword(dto.password);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          verificationStatus: 'UNVERIFIED',
        },
      });

      // Generate JWT access and refresh tokens
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.signRefreshToken(payload);

      // Split name back for response
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        access_token,
        refresh_token,
        user: {
          id: user.id,
          email: user.email,
          firstName,
          lastName,
          name: user.name,
          role: user.role,
          phone: user.phone,
          status: user.status,
          verificationStatus: user.verificationStatus,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const field = (error.meta?.target as string[])?.join(', ') ?? 'field';
        throw new ConflictException(
          `An account with this ${field} already exists`,
        );
      }
      this.logger.error('Registration error', error);
      throw new InternalServerErrorException(
        'Registration failed. Please try again.',
      );
    }
  }

  async googleOAuthUser(dto: GoogleOAuthDto) {
    try {
      // Check if user exists by googleId first (primary check for OAuth users)
      let user = await this.prisma.user.findUnique({
        where: { googleId: dto.googleId },
      });

      if (!user) {
        // Check if email exists (user might have registered with password)
        const existingEmailUser = await this.prisma.user.findUnique({
          where: { email: dto.email },
        });

        if (existingEmailUser) {
          // Auto-link: Google has already verified ownership of this email address,
          // so it is safe to link the Google ID to the existing account.
          // This prevents the "Access Denied" wall for users who signed up with
          // email/password and then try "Continue with Google" using the same address.
          if (existingEmailUser.status === 'SUSPENDED') {
            throw new UnauthorizedException('Account is suspended');
          }
          if (existingEmailUser.status === 'BANNED') {
            throw new UnauthorizedException('Account is banned');
          }

          user = await this.prisma.user.update({
            where: { id: existingEmailUser.id },
            data: {
              googleId: dto.googleId,
              // Fill profile picture only if not already set
              image: existingEmailUser.image || dto.profilePicture || undefined,
            },
          });
          this.logger.log(
            `Auto-linked Google ID to existing account: ${dto.email}`,
          );
        } else {
          // Create new user with Google auth
          const fullName =
            [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() ||
            dto.email.split('@')[0];

          user = await this.prisma.user.create({
            data: {
              email: dto.email,
              googleId: dto.googleId,
              password: '', // Empty password for OAuth-only users
              name: fullName,
              image: dto.profilePicture,
              role: 'CUSTOMER',
              verificationStatus: 'VERIFIED', // OAuth users are pre-verified
              status: 'ACTIVE',
            },
          });
        }
      } else {
        // User found by googleId — enforce status before issuing tokens
        if (user.status === 'SUSPENDED') {
          throw new UnauthorizedException('Account is suspended');
        }
        if (user.status === 'BANNED') {
          throw new UnauthorizedException('Account is banned');
        }

        // Update profile picture if not already set
        if (!user.image && dto.profilePicture) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              image: dto.profilePicture,
            },
          });
        }
      }

      // Generate JWT access and refresh tokens
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.signRefreshToken(payload);

      // Split name into firstName and lastName for response
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        access_token,
        refresh_token,
        user: {
          id: user.id,
          email: user.email,
          firstName,
          lastName,
          role: user.role,
          profilePicture: user.image,
        },
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Google OAuth error', error);
      throw new InternalServerErrorException('OAuth authentication failed');
    }
  }

  async appleOAuthUser(dto: AppleOAuthDto) {
    try {
      // Check if user exists by appleId first (primary check for OAuth users)
      let user = await this.prisma.user.findUnique({
        where: { appleId: dto.appleId },
      });

      if (!user) {
        // Check if email exists (user might have registered with password)
        const existingEmailUser = await this.prisma.user.findUnique({
          where: { email: dto.email },
        });

        if (existingEmailUser) {
          // Email exists but no appleId - this is a password-based account
          // Don't auto-link for security - require email verification first
          throw new ConflictException(
            'An account with this email already exists. Please sign in with your password or reset it.',
          );
        }

        // Create new user with Apple auth
        const fullName =
          [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() ||
          dto.email.split('@')[0];

        user = await this.prisma.user.create({
          data: {
            email: dto.email,
            appleId: dto.appleId,
            password: '', // Empty password for OAuth-only users
            name: fullName,
            role: 'CUSTOMER',
            verificationStatus: 'VERIFIED', // OAuth users are pre-verified
            status: 'ACTIVE',
          },
        });
      }

      // Generate JWT access and refresh tokens
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.signRefreshToken(payload);

      // Split name into firstName and lastName for response
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        access_token,
        refresh_token,
        user: {
          id: user.id,
          email: user.email,
          firstName,
          lastName,
          role: user.role,
          profilePicture: user.image,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('OAuth authentication failed');
    }
  }

  // Universal refresh token logic
  async refresh(refreshToken: string) {
    try {
      // Verify refresh token using the dedicated refresh secret
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      // Reject if the specific JTI has been revoked (user logged out)
      if (payload.jti) {
        const revoked = await this.tokenRevocation.isRefreshTokenRevoked(
          payload.jti,
        );
        if (revoked)
          throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Optionally: check user existence/status
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid user or inactive');
      }
      // Generate new access token
      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };
      const access_token = this.jwtService.sign(newPayload);
      return { access_token };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /** Invalidates the supplied refresh token's JTI so it cannot be used again. */
  async logout(refreshToken: string): Promise<{ message: string }> {
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
      // Ignore decode errors — we still return success to the client
    }
    return { message: 'Logged out successfully' };
  }

  async forgotUserPassword(dto: ForgotPasswordDto) {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        // Don't reveal that user doesn't exist for security
        return {
          message: 'If the email exists, a password reset OTP has been sent',
        };
      }

      const otp = await this.otpService.generateOtp(
        `password-reset:${dto.email}`,
        600,
      );

      await this.emailProducer.sendPasswordResetOtp(user.email, user.name, otp);

      return {
        message: 'Password reset OTP has been sent to your email',
      };
    } catch (error) {
      throw new ConflictException('Failed to send password reset OTP');
    }
  }

  async resetUserPassword(dto: ResetPasswordDto) {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        throw new BadRequestException('Invalid email or OTP');
      }

      // Verify OTP if provided
      if (dto.token) {
        const isValidOtp = await this.otpService.verifyOtp(
          `password-reset:${dto.email}`,
          dto.token,
        );

        if (!isValidOtp) {
          throw new BadRequestException('Invalid or expired OTP');
        }

        // Clear OTP after successful verification
        await this.otpService.clearOtp(`password-reset:${dto.email}`);
      }

      // Hash new password with Argon2id
      const hashedPassword = await hashPassword(dto.newPassword);

      // Update password
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      });

      return {
        message: 'Password has been reset successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new ConflictException('Password reset failed');
    }
  }

  async updateUserProfile(userId: string, dto: UpdateProfileDto) {
    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Prepare update data
      const updateData: any = {};

      // Update name if provided
      if (dto.name !== undefined) {
        updateData.name = dto.name;
      }

      if (dto.phone !== undefined) {
        updateData.phone = dto.phone;
      }

      if (dto.image !== undefined) {
        updateData.image = dto.image;
      }

      // Update password if provided — always use Argon2id for new hashes
      if (dto.password) {
        updateData.password = await hashPassword(dto.password);
      }

      // Update user
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Split name for response
      const nameParts = updatedUser.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName,
          lastName,
          name: updatedUser.name,
          phone: updatedUser.phone,
          image: updatedUser.image,
          role: updatedUser.role,
          status: updatedUser.status,
          verificationStatus: updatedUser.verificationStatus,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new ConflictException('Profile update failed');
    }
  }

  async savePushToken(userId: string, token: string, platform: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          fcmToken: token,
        },
      });

      return { success: true, message: 'Push token saved' };
    } catch (error) {
      throw new ConflictException('Failed to save push token');
    }
  }

  async removePushToken(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          fcmToken: null,
        },
      });

      return { success: true, message: 'Push token removed' };
    } catch (error) {
      throw new ConflictException('Failed to remove push token');
    }
  }

  // ─── Account Linking ────────────────────────────────────────────────────────

  async getLinkedAccounts(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleId: true, appleId: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      google: !!user.googleId,
      apple: !!user.appleId,
    };
  }

  async linkGoogleAccount(userId: string, dto: GoogleOAuthDto) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (user.googleId) {
        throw new ConflictException('Google account is already linked');
      }

      // Make sure the googleId isn't taken by another account
      const existing = await this.prisma.user.findUnique({
        where: { googleId: dto.googleId },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          'This Google account is linked to a different user',
        );
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleId: dto.googleId,
          image: user.image || dto.profilePicture || undefined,
        },
      });

      return { success: true, message: 'Google account linked successfully' };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Link Google account error', error);
      throw new InternalServerErrorException('Failed to link Google account');
    }
  }

  async unlinkGoogleAccount(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (!user.googleId) {
        throw new ConflictException('No Google account is linked');
      }
      // Ensure the user has another way to sign in
      if (!user.appleId && (!user.password || user.password === '')) {
        throw new BadRequestException(
          'Cannot unlink: no other sign-in method available. Set a password first.',
        );
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { googleId: null },
      });

      return { success: true, message: 'Google account unlinked' };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to unlink Google account');
    }
  }

  async linkAppleAccount(userId: string, dto: AppleOAuthDto) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (user.appleId) {
        throw new ConflictException('Apple account is already linked');
      }

      const existing = await this.prisma.user.findUnique({
        where: { appleId: dto.appleId },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          'This Apple account is linked to a different user',
        );
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { appleId: dto.appleId },
      });

      return { success: true, message: 'Apple account linked successfully' };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Link Apple account error', error);
      throw new InternalServerErrorException('Failed to link Apple account');
    }
  }

  async unlinkAppleAccount(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (!user.appleId) {
        throw new ConflictException('No Apple account is linked');
      }
      if (!user.googleId && (!user.password || user.password === '')) {
        throw new BadRequestException(
          'Cannot unlink: no other sign-in method available. Set a password first.',
        );
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { appleId: null },
      });

      return { success: true, message: 'Apple account unlinked' };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to unlink Apple account');
    }
  }
}
