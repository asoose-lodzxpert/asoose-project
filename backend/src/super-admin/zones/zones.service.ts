import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path to your Prisma Service
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateZoneDto) {
    // 1. Ensure polygon is closed (first point must equal last point)
    const coords = [...dto.coordinates];
    const first = coords[0];
    const last = coords[coords.length - 1];

    if (first.lat !== last.lat || first.lng !== last.lng) {
      coords.push(first);
    }

    // 2. Save to DB
    return this.prisma.serviceZone.create({
      data: {
        name: dto.name,
        state: dto.state,
        description: dto.description,
        coordinates: coords as any, // Cast to any for Prisma Json compatibility
        isActive: dto.isActive ?? true,
        basePriceMultiplier: dto.basePriceMultiplier ?? 1.0,
      },
    });
  }

  async findAll() {
    return this.prisma.serviceZone.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const zone = await this.prisma.serviceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`Zone ${id} not found`);
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto) {
    await this.findOne(id);
    return this.prisma.serviceZone.update({
      where: { id },
      data: {
        ...dto,
        coordinates: dto.coordinates as any,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.serviceZone.delete({ where: { id } });
  }

  // --- THE MATH: Point in Polygon (Ray-Casting) ---
  // Returns TRUE if lat/lng is inside the zoneCoords polygon
  checkLocation(lat: number, lng: number, zoneCoords: any[]) {
    let inside = false;
    for (let i = 0, j = zoneCoords.length - 1; i < zoneCoords.length; j = i++) {
      const xi = zoneCoords[i].lat,
        yi = zoneCoords[i].lng;
      const xj = zoneCoords[j].lat,
        yj = zoneCoords[j].lng;

      const intersect =
        yi > lng !== yj > lng &&
        lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
