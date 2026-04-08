import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCityDto) {
    const exists = await this.prisma.city.findUnique({
      where: { name: dto.name },
    });
    if (exists) {
      throw new ConflictException(`City "${dto.name}" already exists.`);
    }
    return this.prisma.city.create({
      data: {
        name: dto.name,
        state: dto.state,
        isActive: dto.isActive ?? false,
      },
    });
  }

  async findAll() {
    const cities = await this.prisma.city.findMany({
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { stores: true } },
      },
    });
    return cities.map((c) => ({
      id: c.id,
      name: c.name,
      state: c.state,
      isActive: c.isActive,
      storeCount: c._count.stores,
      createdAt: c.createdAt,
    }));
  }

  async toggle(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException(`City ${id} not found.`);
    return this.prisma.city.update({
      where: { id },
      data: { isActive: !city.isActive },
    });
  }

  async remove(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException(`City ${id} not found.`);
    return this.prisma.city.delete({ where: { id } });
  }

  async findActive() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, state: true },
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    });
  }
}
