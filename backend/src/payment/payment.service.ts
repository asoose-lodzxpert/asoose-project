import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './paystack.service';
import { FlutterwaveService } from './flutterwave.service';
import { MonnifyService } from './monnify.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TripsService } from '../users/trips/trips.service';
import { TransactionLedgerService } from '../super-admin/transactions/transaction-ledger.service';
import {
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  TransactionType,
  PaymentType,
} from './interfaces/payment.interface';
import type {
  PaymentInitResponse,
  VerifyPaymentResponse,
  DisbursementResponse,
  RefundResponse,
} from './interfaces/payment.interface';
import {
  InitiatePaymentDto,
  DisbursePaymentDto,
  ProcessRefundDto,
  RecipientType,
} from './dto/payment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private flutterwaveService: FlutterwaveService,
    private monnifyService: MonnifyService,
    private notificationsService: NotificationsService,
    private ledger: TransactionLedgerService,
    @Optional()
    @Inject(forwardRef(() => TripsService))
    private tripsService?: TripsService,
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
    // Check if type is DELIVERY (using 'as any' to avoid TS error if Enum isn't updated yet)
    if ((dto.type as any) === 'DELIVERY' || dto.type === PaymentType.DELIVERY) {
      if (!dto.metadata?.deliveryId) {
        throw new BadRequestException(
          'Delivery ID is required in metadata for delivery payments',
        );
      }
    }

    const reference = this.generateReference();
    const customerName = dto.customerName ?? undefined;

    // 2. Prepare Metadata
    // Crucial: Persist 'type' and 'deliveryId' so we know what this payment is for later
    const metadata = {
      ...(dto.metadata || {}),
      ...(dto.callbackUrl ? { callbackUrl: dto.callbackUrl } : {}),
      type: dto.type, // Save the payment type (RIDE/DELIVERY/ORDER)
      deliveryId: dto.metadata?.deliveryId, // Ensure deliveryId is saved
    };

    // 3. Create Payment Record
    // Note: We store delivery info in metadata because Payment schema lacks deliveryId field
    await this.prisma.payment.create({
      data: {
        reference,
        amount: dto.amount,
        gateway: dto.gateway,
        method: dto.method as any,
        status: 'PENDING',
        userId,
        orderId: dto.orderId,
        rideId: dto.rideId,
        customerEmail: dto.email,
        customerName: customerName,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    let response: PaymentInitResponse;

    try {
      switch (dto.gateway) {
        case PaymentGateway.PAYSTACK:
          const paystackCallbackUrl = `${process.env.BACKEND_URL}/payment/callback/paystack`;
          response = await this.paystackService.initializePayment(
            dto.amount,
            dto.email,
            reference,
            metadata,
            paystackCallbackUrl,
          );
          break;

        case PaymentGateway.FLUTTERWAVE:
          response = await this.flutterwaveService.initializePayment(
            dto.amount,
            dto.email,
            reference,
            dto.customerName || 'Customer',
            dto.phoneNumber ?? undefined,
            metadata,
          );
          break;

        case PaymentGateway.MONNIFY:
          if (dto.method !== PaymentMethod.BANK_TRANSFER) {
            throw new BadRequestException(
              'Monnify only supports bank transfer',
            );
          }
          response = await this.monnifyService.initializeBankTransfer(
            dto.amount,
            dto.email,
            reference,
            dto.customerName || 'Customer',
            dto.metadata,
          );
          break;

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
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  async verifyPayment(
    reference: string,
    gateway: PaymentGateway,
  ): Promise<VerifyPaymentResponse & { meta?: { callbackUrl?: string } }> {
    let verification: VerifyPaymentResponse;

    try {
      switch (gateway) {
        case PaymentGateway.PAYSTACK:
          verification = await this.paystackService.verifyPayment(reference);
          break;
        case PaymentGateway.FLUTTERWAVE:
          verification = await this.flutterwaveService.verifyPayment(reference);
          break;
        case PaymentGateway.MONNIFY:
          verification = await this.monnifyService.verifyPayment(reference);
          break;
        default:
          throw new BadRequestException('Invalid payment gateway');
      }
    } catch (err) {
      this.logger.error(
        `Verification failed at gateway level for ${reference}`,
        err,
      );
      throw err;
    }

    await this.updatePaymentStatus(verification);

    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      select: { metadata: true },
    });

    let callbackUrl: string | undefined = undefined;
    if (
      payment?.metadata &&
      typeof payment.metadata === 'object' &&
      !Array.isArray(payment.metadata)
    ) {
      const meta = payment.metadata as Record<string, any>;
      callbackUrl = meta.callbackUrl;
    }

    return { ...verification, meta: { callbackUrl } };
  }

  async handleWebhook(
    gateway: PaymentGateway,
    payload: any,
    signature: string,
  ): Promise<void> {
    let isValid = false;

    switch (gateway) {
      case PaymentGateway.PAYSTACK:
        isValid = this.paystackService.verifyWebhookSignature(
          JSON.stringify(payload),
          signature,
        );
        break;
      case PaymentGateway.FLUTTERWAVE:
        isValid = this.flutterwaveService.verifyWebhookSignature(
          payload,
          signature,
        );
        break;
      case PaymentGateway.MONNIFY:
        isValid = this.monnifyService.verifyWebhookSignature(
          payload,
          signature,
        );
        break;
    }

    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for ${gateway}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.processWebhookPayload(gateway, payload);
  }

  private async processWebhookPayload(
    gateway: PaymentGateway,
    payload: any,
  ): Promise<void> {
    let reference: string;
    let status: PaymentStatus;
    let amount: number;
    let paidAt: Date;

    switch (gateway) {
      case PaymentGateway.PAYSTACK:
        if (payload.event !== 'charge.success') return;
        reference = payload.data.reference;
        status =
          payload.data.status === 'success'
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED;
        amount = payload.data.amount / 100;
        paidAt = new Date(payload.data.paid_at);
        break;

      case PaymentGateway.FLUTTERWAVE:
        if (payload.event !== 'charge.completed') return;
        reference = payload.data.tx_ref;
        status =
          payload.data.status === 'successful'
            ? PaymentStatus.SUCCESS
            : PaymentStatus.FAILED;
        amount = payload.data.amount;
        paidAt = new Date(payload.data.created_at);
        break;

      case PaymentGateway.MONNIFY:
        if (payload.eventType !== 'SUCCESSFUL_TRANSACTION') return;
        reference = payload.eventData.paymentReference;
        status = PaymentStatus.SUCCESS;
        amount = payload.eventData.amountPaid;
        paidAt = new Date(payload.eventData.paidOn);
        break;
    }

    await this.updatePaymentStatus({
      success: status === PaymentStatus.SUCCESS,
      reference,
      amount,
      status,
      gateway,
      paidAt,
    });
  }

  // =================================================================
  //  CORE STATUS UPDATE LOGIC (FIXED TYPES)
  // =================================================================
  private async updatePaymentStatus(
    verification: VerifyPaymentResponse,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference: verification.reference },
      include: {
        order: {
          include: { user: true, store: true, delivery: true },
        },
        ride: {
          include: { customer: true },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found: ${verification.reference}`);
      return;
    }

    // Cast to any to compare Prisma Enum (generated) vs App Enum (interface)
    if ((payment.status as any) === PaymentStatus.SUCCESS) {
      this.logger.log(`Payment ${verification.reference} already processed.`);
      return;
    }

    const tolerance = 0.5;
    if (Math.abs(payment.amount - verification.amount) > tolerance) {
      this.logger.error(
        `FRAUD ALERT: Amount Mismatch! Expected: ${payment.amount}, Received: ${verification.amount}. Ref: ${payment.reference}`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...(payment.metadata as object),
            failReason: 'AMOUNT_MISMATCH',
            receivedAmount: verification.amount,
          },
        },
      });
      return;
    }

    const paidAt = verification.paidAt
      ? new Date(verification.paidAt)
      : new Date();

    // Map Interface Enum to Prisma String/Enum
    let targetStatus = 'PENDING';
    if ((verification.status as any) === PaymentStatus.SUCCESS) {
      targetStatus = 'COMPLETED'; // Prisma often uses COMPLETED for success
    } else if ((verification.status as any) === PaymentStatus.FAILED) {
      targetStatus = 'FAILED';
    }

    // Perform atomic update
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { reference: verification.reference },
        data: {
          status: targetStatus as any,
          paidAt: paidAt,
          verifiedAt: new Date(),
        },
        include: {
          order: { include: { user: true, store: true, delivery: true } },
          ride: { include: { customer: true } },
        },
      });

      if (targetStatus === 'COMPLETED') {
        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'CONFIRMED' as any },
          });
        }
      } else if (targetStatus === 'FAILED') {
        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'FAILED' as any },
          });
        }
      }

      return updatedPayment;
    });

    // Post-Processing (Ledger & Notifications)
    if (
      (result.status as any) === 'COMPLETED' ||
      (result.status as any) === PaymentStatus.SUCCESS
    ) {
      try {
        if (result.order) {
          await this.ledger.recordPayment({
            id: payment.id,
            amount: payment.amount,
            userId: result.order.userId,
            orderId: payment.orderId ?? undefined,
            method: payment.gateway,
            status: 'COMPLETED',
          });

          await this.ledger.recordOrderCommission({
            id: payment.orderId!,
            storeId: result.order.storeId,
            total: payment.amount,
            commissionRate: 10,
          });
        } else if (result.ride) {
          const ride = result.ride;
          if (ride.riderId) {
            const platformFeeRate = 0.2;
            const platformFee = payment.amount * platformFeeRate;
            const driverFee = payment.amount;

            await this.ledger.recordPayment({
              id: payment.id,
              amount: payment.amount,
              userId: ride.customer.id,
              rideId: payment.rideId ?? undefined,
              method: payment.gateway,
              status: 'COMPLETED',
            });

            await this.ledger.recordRideEarnings({
              id: payment.rideId!,
              riderId: ride.riderId,
              totalFare: payment.amount,
              platformFee,
              driverFee,
            });
          }
        }
      } catch (ledgerError) {
        this.logger.error(
          `Ledger recording failed for ${payment.reference}`,
          ledgerError,
        );
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            metadata: {
              ...(payment.metadata as object),
              ledgerStatus: 'FAILED',
            },
          },
        });
      }

      // =========================================================
      // 👇 MATCHING LOGIC FIXED HERE
      // =========================================================
      if (result.order?.delivery) {
        // Case A: Delivery linked to an E-commerce Order
        await this.startDeliveryMatching(result.order.delivery.id);
      } else if (payment.metadata && (payment.metadata as any).deliveryId) {
        // Case B: Direct Delivery Request (This fixes the stuck "Finding Courier" screen)
        await this.startDeliveryMatching((payment.metadata as any).deliveryId);
      } else if (result.rideId) {
        // Case C: Ride Request
        await this.startRideMatching(result.rideId);
      }

      await this.sendPaymentNotifications(result);
    }
  }

  // =================================================================
  //  SAFE HELPERS
  // =================================================================

  private async startRideMatching(rideId: string): Promise<void> {
    try {
      if (!this.tripsService) return;
      await this.tripsService.startRideMatching(rideId);
    } catch (error) {
      this.logger.error(`Failed to start ride matching for ${rideId}:`, error);
    }
  }

  private async startDeliveryMatching(deliveryId: string): Promise<void> {
    try {
      if (!this.tripsService) return;
      await this.tripsService.startDeliveryMatching(deliveryId);
    } catch (error) {
      this.logger.error(
        `Failed to start delivery matching for ${deliveryId}:`,
        error,
      );
    }
  }

  private async sendPaymentNotifications(payment: any): Promise<void> {
    try {
      let customerId: string | undefined;

      if (payment.order?.userId) {
        customerId = payment.order.userId;
      } else if (payment.ride?.customerId) {
        customerId = payment.ride.customerId;
      } else if (payment.userId) {
        customerId = payment.userId;
      }

      if (
        customerId &&
        typeof customerId === 'string' &&
        customerId !== 'undefined'
      ) {
        await this.notificationsService.create({
          userId: customerId,
          title: 'Payment Successful',
          message: `Your payment of ₦${payment.amount.toLocaleString()} was successful.`,
          type: 'PAYMENT_SUCCESS',
          metadata: {
            orderId: payment.orderId,
            rideId: payment.rideId,
            reference: payment.reference,
            amount: payment.amount,
          },
        });
      } else {
        this.logger.warn(
          `Skipping user notification: No valid Customer ID for payment ${payment.reference}`,
        );
      }

      const vendorId = payment.order?.store?.vendorId;
      if (vendorId && typeof vendorId === 'string') {
        await this.notificationsService.createForVendor({
          vendorId: vendorId,
          title: 'New Order Payment',
          message: `Payment received for order #${payment.order.id}. Amount: ₦${payment.amount.toLocaleString()}`,
          type: 'ORDER_PAYMENT',
          metadata: {
            orderId: payment.orderId,
            reference: payment.reference,
            amount: payment.amount,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        'Failed to send payment notifications (non-fatal):',
        error,
      );
    }
  }

  async disbursePayment(
    dto: DisbursePaymentDto,
    adminId: string,
  ): Promise<DisbursementResponse> {
    const reference = this.generateReference('DISB');
    let bankAccount: any;
    let recipientName: string;

    if (dto.recipientType === RecipientType.VENDOR) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: dto.recipientId },
        include: { store: { include: { bankAccount: true } } },
      });
      if (!vendor || !vendor.store)
        throw new NotFoundException('Vendor or store not found');
      bankAccount = vendor.store.bankAccount;
      recipientName = vendor.name;
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

    let disbursement: DisbursementResponse;

    try {
      switch (dto.gateway) {
        case PaymentGateway.PAYSTACK:
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

        case PaymentGateway.FLUTTERWAVE:
          disbursement = await this.flutterwaveService.initiateTransfer(
            dto.amount,
            bankAccount.accountNumber,
            bankAccount.bankCode,
            bankAccount.accountName,
            reference,
            dto.reason,
          );
          break;

        case PaymentGateway.MONNIFY:
          disbursement = await this.monnifyService.initiateTransfer(
            dto.amount,
            bankAccount.accountNumber,
            bankAccount.bankCode,
            bankAccount.accountName,
            reference,
            dto.reason,
          );
          break;

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
          status: 'PENDING',
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
      (payment.status as any) !== 'COMPLETED' &&
      (payment.status as any) !== PaymentStatus.SUCCESS
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
        case PaymentGateway.FLUTTERWAVE:
          if (!payment.authorizationUrl)
            throw new BadRequestException('Transaction ID missing');
          refund = await this.flutterwaveService.initiateRefund(
            payment.accessCode || payment.reference,
            refundAmount,
          );
          break;
        case PaymentGateway.MONNIFY:
          throw new BadRequestException('Monnify API refunds not supported');
        default:
          throw new BadRequestException(
            'Refunds not supported for this gateway',
          );
      }

      const newStatus =
        refundAmount < payment.amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED';

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus as any,
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
          data: { status: 'CANCELLED' as any },
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

  async handleMonnifyRefundWebhook(
    payload: any,
    signature: string,
  ): Promise<void> {
    const isValid = this.monnifyService.verifyWebhookSignature(
      payload,
      signature,
    );
    if (!isValid) throw new BadRequestException('Invalid webhook signature');

    const { eventType, eventData } = payload;
    if (eventType !== 'SUCCESSFUL_REFUND') return;

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { reference: eventData.transactionReference },
        include: { order: { include: { user: true } } },
      });

      if (!payment) return;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED' as any,
          metadata: {
            ...(payment.metadata as object),
            refund: {
              refundReference: eventData.refundReference,
              refundAmount: eventData.refundAmount,
              refundStatus: eventData.refundStatus,
              completedOn: eventData.completedOn,
            },
          },
        },
      });

      if (payment.order?.userId) {
        await this.notificationsService.create({
          userId: payment.order.userId,
          title: 'Refund Processed',
          message: `Refund of ₦${eventData.refundAmount.toLocaleString()} processed successfully.`,
          type: 'REFUND_SUCCESS',
          metadata: {
            orderId: payment.orderId,
            reference: payment.reference,
            refundReference: eventData.refundReference,
            refundAmount: eventData.refundAmount,
          },
        });
      }
    } catch (error) {
      this.logger.error('Error processing Monnify refund webhook:', error);
      throw error;
    }
  }

  private generateReference(prefix = 'PAY'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  }
}
