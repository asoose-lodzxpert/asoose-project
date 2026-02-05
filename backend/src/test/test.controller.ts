import { Controller, Post, Param, BadRequestException } from '@nestjs/common';
import { TripsService } from '../users/trips/trips.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '@prisma/client'; // Import Enum for type safety

@Controller({
  path: 'test',
  version: '1',
})
export class TestController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly prisma: PrismaService,
  ) {}

  // Force a driver to accept a delivery
  // Force a driver to accept a delivery
  @Post('delivery/:id/accept')
  async forceAcceptDelivery(@Param('id') deliveryId: string) {
    // 1. Create a dummy rider if not exists (Same as before)
    let rider = await this.prisma.rider.findFirst();
    if (!rider) {
      // ... (Keep your existing rider creation logic here) ...
      // If you need the full code block again, let me know,
      // but you probably only need to copy the new part below 👇
      rider = await this.prisma.rider.create({
        data: {
          name: 'Test Rider',
          email: 'test-rider@example.com',
          countryCode: '+234',
          phone: '08012345678',
          password: 'password123',
          status: UserStatus.ACTIVE,
          isOnline: true,
          vehicle: {
            create: {
              brand: 'Honda',
              model: 'Ace',
              color: 'Red',
              plateNumber: 'TEST-123',
              type: 'BIKE',
              year: 2024,
            },
          },
        },
      });
    }

    // 👇 NEW: Force-reset the status to ensure the acceptance works
    // This fixes the 409 Conflict error
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'REQUESTED' },
    });

    // 2. Now force accept (It will work now because we reset the status)
    return this.tripsService.acceptDelivery(deliveryId, rider.id);
  }

  // Force pickup
  @Post('delivery/:id/pickup')
  async forcePickup(@Param('id') deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery?.riderId) throw new BadRequestException('No rider assigned');

    return this.tripsService.confirmPickup(
      deliveryId,
      delivery.riderId,
      'test-proof.jpg',
    );
  }
  // Force complete (Self-Healing)
  // Force complete (Self-Healing & TypeScript Safe)
  @Post('delivery/:id/complete')
  async forceComplete(@Param('id') deliveryId: string) {
    // 1. Fetch current state
    let delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { dropoffAddress: true },
    });

    if (!delivery) throw new BadRequestException('Delivery not found');

    let validRiderId = delivery.riderId;

    // 2. Auto-Assign Rider if missing
    if (!validRiderId) {
      let rider = await this.prisma.rider.findFirst();

      // Create dummy rider if DB is empty
      if (!rider) {
        rider = await this.prisma.rider.create({
          data: {
            name: 'Test Rider',
            email: 'test-rider@example.com',
            countryCode: '+234',
            phone: '08012345678',
            password: 'password123',
            status: 'ACTIVE',
            isOnline: true,
            vehicle: {
              create: {
                brand: 'Honda',
                model: 'Ace',
                color: 'Red',
                plateNumber: 'TEST-123',
                type: 'BIKE',
                year: 2024,
              },
            },
          },
        });
      }
      validRiderId = rider.id;

      // Force update the delivery record
      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          riderId: validRiderId,
          status: 'PICKED_UP',
          assignedAt: new Date(),
        },
      });
    } else {
      // Ensure status is correct
      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: { status: 'PICKED_UP' },
      });
    }

    // 3. Refresh data to get the OTP and Address
    delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { dropoffAddress: true },
    });

    // 4. TS Validations
    if (!delivery)
      throw new BadRequestException('Delivery not found after update');
    if (!delivery.deliveryOtp)
      throw new BadRequestException('Delivery OTP is missing');
    if (!delivery.dropoffAddress)
      throw new BadRequestException('Dropoff address is missing');

    // 5. Complete
    return this.tripsService.completeDelivery(
      deliveryId,
      validRiderId,
      delivery.deliveryOtp, // TypeScript now knows this is a string
      'test-delivery-proof.jpg',
      delivery.dropoffAddress.lat,
      delivery.dropoffAddress.lng,
    );
  }
}
