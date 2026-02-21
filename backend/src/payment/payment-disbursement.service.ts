import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './paystack.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PaymentGateway,
  PaymentMethod,
  TransactionType,
} from './interfaces/payment.interface';
import type {
  DisbursementResponse,
  RefundResponse,
} from './interfaces/payment.interface';
import {
  DisbursePaymentDto,
  ProcessRefundDto,
  RecipientType,
} from './dto/payment.dto';
import { generateReference } from './payment.utils';

/**
 * Handles admin-initiated disbursements (payouts) and refunds.
 */
@Injectable()
export class PaymentDisbursementService {
  private readonly logger = new Logger(PaymentDisbursementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async disbursePayment(
    dto: DisbursePaymentDto,
    adminId: string,
  ): Promise<DisbursementResponse> {
    const reference = generateReference('DISB');
    let bankAccount: any;
    let recipientName: string;

    if (dto.recipientType === RecipientType.VENDOR) {
      const store = await this.prisma.store.findUnique({
        where: { id: dto.recipientId },
        include: { bankAccount: true },
      });
      if (!store) throw new NotFoundException('Store not found');
      bankAccount = store.bankAccount;
      recipientName = store.name;
    } else if (dto.recipientType === RecipientType.RIDER) {
      const rider = await this.prisma.rider.findUnique({
        where: { id: dto.recipientId },
        include: { bankAccount: true },
      });
      if (!rider) throw new NotFoundException('Rider not found');
      bankAccount = rider.bankAccount;
      recipientName = rider.name || 'Rider';
    } else {
      throw new BadRequestException('Invalid recipient type');
    }

    if (!bankAccount)
      throw new BadRequestException('Recipient has no bank account configured');

    // ─── DEV / TEST MODE BYPASS ──────────────────────────────────────────────
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        `[DEV] Skipping real gateway call for disbursement ${reference}. Returning mock success.`,
      );
      return {
        success: true,
        reference,
        amount: dto.amount,
        recipientId: dto.recipientId,
        gateway: dto.gateway,
        transferCode: `DEV_TRANSFER_${reference}`,
        status: 'success',
      } as DisbursementResponse;
    }
    // ─────────────────────────────────────────────────────────────────────────

    let disbursement: DisbursementResponse;

    try {
      switch (dto.gateway) {
        case PaymentGateway.PAYSTACK: {
          let recipientCode = bankAccount.paystackRecipientCode;
          if (!recipientCode) {
            recipientCode = await this.paystackService.createTransferRecipient(
              bankAccount.accountNumber,
              bankAccount.bankCode,
              bankAccount.accountName,
            );
            await this.prisma.bankAccount.update({
              where: { id: bankAccount.id },
              data: { paystackRecipientCode: recipientCode },
            });
          }
          disbursement = await this.paystackService.initiateTransfer(
            dto.amount,
            recipientCode,
            reference,
            dto.reason,
          );
          break;
        }
        default:
          throw new BadRequestException(
            `Unsupported payment gateway: ${dto.gateway}`,
          );
      }

      await this.prisma.payment.create({
        data: {
          reference,
          amount: dto.amount,
          gateway: dto.gateway,
          method: PaymentMethod.BANK_TRANSFER as any,
          status: PaymentStatus.PENDING,
          userId: dto.recipientId,
          ...(dto.orderId && { orderId: dto.orderId }),
          ...(dto.rideId && { rideId: dto.rideId }),
          metadata: {
            ...dto.metadata,
            transactionType: TransactionType.DISBURSEMENT,
            initiatedBy: adminId,
            reason: dto.reason,
            transferCode: disbursement.transferCode,
          } as any,
        },
      });

      await this.notificationsService.create({
        userId: dto.recipientId,
        title: 'Payment Disbursement',
        message: `₦${dto.amount.toLocaleString()} has been sent to your account ${bankAccount.accountNumber}`,
        type: 'DISBURSEMENT',
        metadata: { reference, amount: dto.amount },
      });

      return disbursement;
    } catch (error) {
      this.logger.error('Disbursement failed:', error);
      throw error;
    }
  }

  async processRefund(
    dto: ProcessRefundDto,
    adminId: string,
  ): Promise<RefundResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: { reference: dto.paymentReference },
      include: {
        order: { include: { user: true } },
        ride: { include: { customer: true } },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (
      payment.status !== PaymentStatus.COMPLETED &&
      (payment.status as any) !== 'SUCCESS'
    ) {
      throw new BadRequestException('Can only refund successful payments');
    }

    const refundAmount = dto.amount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund exceeds original amount');
    }

    let refund: RefundResponse;

    try {
      switch (payment.gateway as PaymentGateway) {
        case PaymentGateway.PAYSTACK:
          refund = await this.paystackService.initiateRefund(
            payment.reference,
            refundAmount,
          );
          break;
        default:
          throw new BadRequestException(
            'Refunds not supported for this gateway',
          );
      }

      const newStatus =
        refundAmount < payment.amount
          ? PaymentStatus.PARTIALLY_REFUNDED
          : PaymentStatus.REFUNDED;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          metadata: {
            ...(payment.metadata as object),
            refund: {
              amount: refundAmount,
              reason: dto.reason,
              refundReference: refund.refundReference,
              processedBy: adminId,
              processedAt: new Date(),
            },
          },
        },
      });

      if (payment.orderId) {
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.CANCELLED },
        });
      }

      const customer = payment.order?.user || payment.ride?.customer;
      if (customer) {
        await this.notificationsService.create({
          userId: customer.id,
          title: 'Refund Processed',
          message: `₦${refundAmount.toLocaleString()} has been refunded. Reason: ${dto.reason}`,
          type: 'REFUND',
          metadata: {
            reference: payment.reference,
            refundReference: refund.refundReference,
            amount: refundAmount,
          },
        });
      }

      return refund;
    } catch (error) {
      this.logger.error('Refund failed:', error);
      throw error;
    }
  }
}
