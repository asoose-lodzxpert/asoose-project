import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RiderStateService } from '../../matching/rider-state';
import { DriverStateService } from '../../matching/driver-state/driver-state.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateRiderStatusDto } from '../dto/update-status.dto';

@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riderStateService: RiderStateService,
    private readonly driverStateService: DriverStateService,
  ) {}

  async goOnline(
    id: string,
    role: UserRole,
    coords: { latitude: number; longitude: number },
  ) {
    if (role === UserRole.RIDER) {
      await this.riderStateService.setOnline(
        id,
        coords.latitude,
        coords.longitude,
      );
      return {
        status: 'online',
        lat: coords.latitude,
        lng: coords.longitude,
        type: 'rider',
      };
    } else if (role === UserRole.DRIVER) {
      await this.driverStateService.setOnline(
        id,
        coords.latitude,
        coords.longitude,
      );
      return {
        status: 'online',
        lat: coords.latitude,
        lng: coords.longitude,
        type: 'driver',
      };
    } else {
      throw new BadRequestException('Invalid user role for goOnline');
    }
  }

  async goOffline(id: string, role: UserRole) {
    if (role === UserRole.RIDER) {
      await this.riderStateService.setOffline(id);
      return { status: 'offline', type: 'rider' };
    } else if (role === UserRole.DRIVER) {
      await this.driverStateService.setOffline(id);
      return { status: 'offline', type: 'driver' };
    } else {
      throw new BadRequestException('Invalid user role for goOffline');
    }
  }

  async updateRiderStatus(riderId: string, dto: UpdateRiderStatusDto) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });
    if (!rider) {
      throw new NotFoundException('Rider not found');
    }
    const updated = await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        isOnline: dto.isOnline,
        currentLat: dto.currentLat,
        currentLng: dto.currentLng,
      },
    });
    return {
      success: true,
      isOnline: updated.isOnline,
      message: updated.isOnline
        ? 'You are now online and available for deliveries'
        : 'You are now offline',
    };
  }
}
