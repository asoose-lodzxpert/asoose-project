import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    console.log(`[UsersService] Fetching profile for User ID: ${userId}`); // 👈 LOG 1

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' }, // Show default address first
        },
      },
    });

    if (!user) {
      console.error(`[UsersService] User NOT FOUND in database! ID: ${userId}`); // 👈 LOG 2
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    console.log(`[UsersService] Found user: ${user.email}`); // 👈 LOG 3
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    console.log(`[UsersService] Updating profile for ${userId}:`, dto); // 👈 LOG 4
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
      },
    });
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    console.log(`[UsersService] Adding address for ${userId}:`, dto); // 👈 LOG 5

    // 1. If this new address is set to Default, we must unset the old one
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // 2. Create the new address
    return this.prisma.address.create({
      data: {
        userId,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        zipCode: dto.zipCode,
        // If it's the user's FIRST address, force it to be default
        isDefault: dto.isDefault || (await this.prisma.address.count({ where: { userId } })) === 0,
      },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    console.log(`[UsersService] Deleting address ${addressId} for user ${userId}`); // 👈 LOG 6
    // We verify userId to ensure they own the address
    return this.prisma.address.deleteMany({
      where: {
        id: addressId,
        userId: userId, 
      },
    });
  }

  async softDeleteAccount(userId: string) {
    console.log(`[UsersService] Soft deleting account: ${userId}`); // 👈 LOG 7
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        status: 'INACTIVE',
        deletedAt: new Date(),
      },
    });
  }


async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true, // Fetch the items inside the order
      },
      orderBy: {
        createdAt: 'desc', // Show newest orders first
      },
    });
  }


}