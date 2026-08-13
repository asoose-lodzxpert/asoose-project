import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './paystack.service';
import {
  PaymentGateway,
  PaymentMethod,
  PaymentType,
} from './interfaces/payment.interface';
import type { PaymentInitResponse } from './interfaces/payment.interface';
import { InitiatePaymentDto } from './dto/payment.dto';
import { generateReference } from './payment.utils';

/**
 * Handles payment initiation: amount resolution, duplicate detection,
 * Payment record creation, and gateway initialisation.
 */
@Injectable()
export class PaymentInitService {
  private readonly logger = new Logger(PaymentInitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  async initiatePayment(
    dto: InitiatePaymentDto,
    userId: string,
  ): Promise<PaymentInitResponse> {
    if (!userId) {
      throw new BadRequestException(
        'User ID missing for payment initialization',
      );
    }

    // 1. Validate Delivery Specifics
    if ((dto.type as any) === 'DELIVERY' || dto.type === PaymentType.DELIVERY) {
      if (!dto.metadata?.deliveryId) {
        throw new BadRequestException(
          'Delivery ID is required in metadata for delivery payments',
        );
      }
    }

    // 2. Calculate Amount from Source of Truth
    let amount = dto.amount;
    const orderGroupId = dto.orderGroupId;
    const orderId = dto.orderId;
    const rideId = dto.rideId;
    const deliveryId = dto.deliveryId || dto.metadata?.deliveryId;

    if ((dto.type as any) === 'ORDER' || dto.type === PaymentType.ORDER) {
      if (orderGroupId) {
        const group = await this.prisma.orderGroup.findUnique({
          where: { id: orderGroupId },
        });
        if (!group)
          throw new NotFoundException(`Order Group ${orderGroupId} not found`);
        amount = group.totalAmount;
      } else if (orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
        });
        if (!order) throw new NotFoundException(`Order ${orderId} not found`);
        amount = order.total;
      } else {
        throw new BadRequestException(
          'Order payment requires valid orderId or orderGroupId',
        );
      }
    } else if ((dto.type as any) === 'RIDE' || dto.type === PaymentType.RIDE) {
      if (!rideId) throw new BadRequestException('Ride ID required');
      const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
      if (!ride) throw new NotFoundException('Ride not found');
      if (!ride.totalFare) {
        throw new BadRequestException('Ride fare has not been calculated yet');
      }
      amount = ride.totalFare;
    } else if (
      (dto.type as any) === 'DELIVERY' ||
      dto.type === PaymentType.DELIVERY
    ) {
      if (!deliveryId) throw new BadRequestException('Delivery ID is required');
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: deliveryId },
      });
      if (!delivery) throw new NotFoundException('Delivery not found');
      amount = delivery.deliveryFee;
    }

    if (!amount || amount <= 0) {
      this.logger.error(
        `Payment Init Failed: Invalid amount ${amount} for type ${dto.type}`,
      );
      throw new BadRequestException(
        'Invalid payment amount. Could not derive total.',
      );
    }

    const reference = generateReference();
    const customerName = dto.customerName ?? undefined;

    const metadata = {
      ...(dto.metadata || {}),
      ...(dto.callbackUrl ? { callbackUrl: dto.callbackUrl } : {}),
      type: dto.type,
      deliveryId,
      orderGroupId,
      orderId,
      rideId,
    };

    // 3. Check for existing payment and handle duplicates
    let existingPayment: any = null;
    if (orderGroupId) {
      existingPayment = await this.prisma.payment.findUnique({
        where: { orderGroupId },
      });
    } else if (orderId) {
      existingPayment = await this.prisma.payment.findUnique({
        where: { orderId },
      });
    } else if (rideId) {
      existingPayment = await this.prisma.payment.findUnique({
        where: { rideId },
      });
    } else if (deliveryId) {
      existingPayment = await this.prisma.payment.findUnique({
        where: { deliveryId },
      });
    }

    // If payment already completed, prevent duplicate payment
    if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Payment already completed for this transaction',
      );
    }

    // If payment exists but is PENDING or FAILED, delete it to allow retry
    if (
      existingPayment &&
      (existingPayment.status === PaymentStatus.PENDING ||
        existingPayment.status === PaymentStatus.FAILED)
    ) {
      await this.prisma.payment.delete({ where: { id: existingPayment.id } });
      this.logger.log(
        `Deleted existing ${existingPayment.status} payment ${existingPayment.id} to allow retry`,
      );
    }

    // 4. Create Payment Record (Pending)
    await this.prisma.payment.create({
      data: {
        reference,
        amount,
        gateway: dto.gateway,
        method: dto.method as any,
        status: PaymentStatus.PENDING,
        userId,
        orderId,
        orderGroupId,
        rideId,
        deliveryId,
        customerEmail: dto.email,
        customerName,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    let response: PaymentInitResponse;

    try {
      switch (dto.gateway) {
        case PaymentGateway.PAYSTACK: {
          // Do not send callback_url here. Paystack will use the callback URL
          // configured for the active test/live mode in the dashboard.
          response = await this.paystackService.initializePayment(
            amount,
            dto.email,
            reference,
            metadata,
          );
          break;
        }
        default:
          throw new BadRequestException('Invalid payment gateway');
      }

      await this.prisma.payment.update({
        where: { reference },
        data: {
          authorizationUrl: response.authorizationUrl,
          accessCode: response.accessCode,
          accountNumber: response.accountNumber,
          bankName: response.bankName,
          accountName: response.accountName,
          expiresAt: response.expiresAt,
        },
      });

      return response;
    } catch (error) {
      await this.prisma.payment.update({
        where: { reference },
        data: { status: PaymentStatus.FAILED },
      });
      throw error;
    }
  }
}
