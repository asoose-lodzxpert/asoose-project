import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdatePersonalInfoDto } from '../dto/update-personal-info.dto';

@Injectable()
export class ProfileService {
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
        role: true,
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
    let totalRides = 0;
    if (rider.role === 'DRIVER') {
      totalRides = await this.prisma.ride.count({ where: { riderId } });
    } else if (rider.role === 'RIDER') {
      totalRides = await this.prisma.delivery.count({ where: { riderId } });
    }
    return {
      ...rider,
      totalRides,
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
    const personalInfo = {
      id: rider.id,
      fullName: rider.name,
      address: '',
      phoneCode: rider.countryCode,
      phoneNumber: rider.phone,
      dob: '',
      state: null,
      city: null,
      email: {
        value: rider.email,
        isVerified: true,
      },
      phone: {
        value: rider.phone,
        isVerified: true,
      },
      image: rider.image,
    };
    return { personalInfo };
  }

  async updatePersonalInfo(riderId: string, updateData: UpdatePersonalInfoDto) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });
    if (!rider) {
      throw new NotFoundException('Rider not found');
    }
    const updatedRider = await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        ...(updateData.fullName && { name: updateData.fullName }),
        ...(updateData.phoneCode && { countryCode: updateData.phoneCode }),
        ...(updateData.phoneNumber && { phone: updateData.phoneNumber }),
        ...(updateData.image !== undefined && { image: updateData.image }),
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

  async updateRiderImage(riderId: string, imageUrl: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });
    if (!rider) {
      throw new NotFoundException('Rider not found');
    }
    await this.prisma.rider.update({
      where: { id: riderId },
      data: { image: imageUrl },
    });
    return {
      message: 'Profile image updated successfully',
      imageUrl,
    };
  }
}
