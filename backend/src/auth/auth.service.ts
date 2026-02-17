import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly emailProducer: EmailProducer,
  ) {}
  // User
  async loginUser(body: { email: string; password: string }) {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if user is active
      if (user.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          `Account is ${user.status.toLowerCase()}`,
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        body.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate JWT access and refresh tokens
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };
      const access_token = this.jwtService.sign(payload);
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

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

      // Hash password
      const hashedPassword = await bcrypt.hash(dto.password, 10);

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
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

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
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Registration failed');
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
          // Email exists but no googleId - this is a password-based account
          // Don't auto-link for security - require email verification first
          throw new ConflictException(
            'An account with this email already exists. Please sign in with your password or reset it.',
          );
        }

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
      } else {
        // User found by googleId - update profile picture if needed
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
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

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
      const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

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
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);
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

      // Hash new password
      const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

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

      // Update password if provided
      if (dto.password) {
        updateData.password = await bcrypt.hash(dto.password, 10);
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
      // Update user with push token
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          expoPushToken: token,
        },
      });

      return { success: true, message: 'Push token saved' };
    } catch (error) {
      throw new ConflictException('Failed to save push token');
    }
  }

  async removePushToken(userId: string) {
    try {
      // Clear push token
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          expoPushToken: null,
        },
      });

      return { success: true, message: 'Push token removed' };
    } catch (error) {
      throw new ConflictException('Failed to remove push token');
    }
  }
}
