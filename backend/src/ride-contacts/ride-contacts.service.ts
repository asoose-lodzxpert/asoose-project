import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideContactDto, UpdateRideContactDto } from './dto/ride-contact.dto';

@Injectable()
export class RideContactsService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all saved contacts for the authenticated customer. */
  async list(customerId: string) {
    return this.prisma.rideContact.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Create a new saved contact for the authenticated customer. */
  async create(customerId: string, dto: CreateRideContactDto) {
    return this.prisma.rideContact.create({
      data: {
        customerId,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        label: dto.label?.trim() ?? null,
      },
    });
  }

  /** Update an existing contact — owner-guarded. */
  async update(customerId: string, contactId: string, dto: UpdateRideContactDto) {
    const contact = await this.prisma.rideContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) throw new NotFoundException('Contact not found.');
    if (contact.customerId !== customerId) {
      throw new ForbiddenException('You do not own this contact.');
    }

    return this.prisma.rideContact.update({
      where: { id: contactId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.label !== undefined && { label: dto.label?.trim() ?? null }),
      },
    });
  }

  /** Delete a saved contact — owner-guarded. */
  async remove(customerId: string, contactId: string) {
    const contact = await this.prisma.rideContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) throw new NotFoundException('Contact not found.');
    if (contact.customerId !== customerId) {
      throw new ForbiddenException('You do not own this contact.');
    }

    await this.prisma.rideContact.delete({ where: { id: contactId } });
    return { message: 'Contact deleted.' };
  }
}
