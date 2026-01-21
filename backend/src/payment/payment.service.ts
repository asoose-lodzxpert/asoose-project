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
  PaymentInitResponse,
  VerifyPaymentResponse,
  DisbursementResponse,
  RefundResponse,
  TransactionType,
} from './interfaces/payment.interface';
import {
  InitiatePaymentDto,
  DisbursePaymentDto,
  ProcessRefundDto,
  PaymentType,
  RecipientType,
} from './dto/payment.dto';

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
    // Generate unique reference
    const reference = this.generateReference();

    // Create payment record
    await this.prisma.payment.create({
      data: {
        reference,
        amount: dto.amount,
        gateway: dto.gateway,
        method: dto.method as any,
        status: PaymentStatus.PENDING,
        userId,
        ...(dto.orderId && { orderId: dto.orderId }),
        ...(dto.rideId && { rideId: dto.rideId }),
        customerEmail: dto.email,
        customerName: dto.customerName,
        metadata: dto.metadata as any,
      },
    });

    let response: PaymentInitResponse;

    try {
      switch (dto.gateway) {
        case PaymentGateway.PAYSTACK:
          response = await this.paystackService.initializePayment(
            dto.amount,
            dto.email,
            reference,
            dto.metadata,
          );
          break;

        case PaymentGateway.FLUTTERWAVE:
          response = await this.flutterwaveService.initializePayment(
            dto.amount,
            dto.email,
            reference,
            dto.customerName || 'Customer',
            dto.phoneNumber,
            dto.metadata,
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

      // Update payment with gateway response
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
      // Update payment status to failed
      await this.prisma.payment.update({
        where: { reference },
        data: { status: PaymentStatus.FAILED },
      });
      throw error;
    }
  }

  async verifyPayment(
    reference: string,
    gateway: PaymentGateway,
  ): Promise<VerifyPaymentResponse> {
    let verification: VerifyPaymentResponse;

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

    // Update payment record
    await this.updatePaymentStatus(verification);

    return verification;
  }

  async handleWebhook(
    gateway: PaymentGateway,
    payload: any,
    signature: string,
  ): Promise<void> {
    // Verify webhook signature
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

    // Process webhook based on gateway
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

  private async updatePaymentStatus(
    verification: VerifyPaymentResponse,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference: verification.reference },
      include: {
        order: {
          include: {
            user: true,
            store: true,
            delivery: true,
          },
        },
        ride: true,
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found: ${verification.reference}`);
      return;
    }

    // Idempotency check - skip if already processed successfully
    if ((payment.status as any) === PaymentStatus.SUCCESS) {
      this.logger.log(
        `Payment already processed successfully: ${verification.reference}`,
      );
      return;
    }

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { reference: verification.reference },
      data: {
        status: verification.status as any,
        paidAt: verification.paidAt,
        verifiedAt: new Date(),
      },
      include: {
        order: {
          include: {
            user: true,
            store: true,
            delivery: true,
          },
        },
        ride: true,
      },
    });

    // Update order status if payment successful
    if (verification.status === PaymentStatus.SUCCESS && payment.orderId) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'CONFIRMED' as any,
        },
      });

      // Record payment in ledger
      if (updatedPayment.order) {
        await this.ledger.recordPayment({
          id: payment.id,
          amount: payment.amount,
          userId: updatedPayment.order.userId,
          orderId: payment.orderId,
          method: payment.gateway,
          status: 'COMPLETED',
        });

        // Record order commission and vendor earnings
        await this.ledger.recordOrderCommission({
          id: payment.orderId,
          storeId: updatedPayment.order.storeId,
          total: payment.amount,
          commissionRate: 10, // 10% platform commission (deducted on withdrawal)
        });
      }

      // Send notifications
      await this.sendPaymentNotifications(updatedPayment);

      // Start delivery matching if order has a delivery
      if (updatedPayment.order?.delivery) {
        await this.startDeliveryMatching(updatedPayment.order.delivery.id);
      }
    } else if (
      verification.status === PaymentStatus.FAILED &&
      payment.orderId
    ) {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'FAILED' as any,
        },
      });
    }

    // Start ride matching if payment is for a ride
    if (verification.status === PaymentStatus.SUCCESS && payment.rideId) {
      // Get ride details
      const ride = await this.prisma.ride.findUnique({
        where: { id: payment.rideId },
        include: {
          customer: { select: { id: true } },
        },
      });

      if (ride && ride.riderId) {
        const platformFeeRate = 0.2; // 20% platform fee (deducted on withdrawal)
        const platformFee = payment.amount * platformFeeRate;
        const driverFee = payment.amount; // Driver gets full amount initially

        // Record payment in ledger
        await this.ledger.recordPayment({
          id: payment.id,
          amount: payment.amount,
          userId: ride.customer.id,
          rideId: payment.rideId,
          method: payment.gateway,
          status: 'COMPLETED',
        });

        // Record ride earnings (full amount credited, commission deducted on withdrawal)
        await this.ledger.recordRideEarnings({
          id: payment.rideId,
          riderId: ride.riderId,
          totalFare: payment.amount,
          platformFee, // Stored for reference, deducted on withdrawal
          driverFee, // Full amount
        });
      }

      await this.startRideMatching(payment.rideId);
    }
  }

  /**
   * Start ride matching after payment is successful
   */
  private async startRideMatching(rideId: string): Promise<void> {
    try {
      if (!this.tripsService) {
        this.logger.error(
          `TripsService not available - cannot start ride matching for ${rideId}`,
        );
        return;
      }

      await this.tripsService.startRideMatching(rideId);
      this.logger.log(`Started ride matching for ride ${rideId}`);
    } catch (error) {
      this.logger.error(`Failed to start ride matching for ${rideId}:`, error);
    }
  }

  /**
   * Start delivery matching after payment is successful
   */
  private async startDeliveryMatching(deliveryId: string): Promise<void> {
    try {
      if (!this.tripsService) {
        this.logger.error(
          `TripsService not available - cannot start delivery matching for ${deliveryId}`,
        );
        return;
      }

      await this.tripsService.startDeliveryMatching(deliveryId);
      this.logger.log(`Started delivery matching for delivery ${deliveryId}`);
    } catch (error) {
      this.logger.error(
        `Failed to start delivery matching for ${deliveryId}:`,
        error,
      );
    }
  }

  private async sendPaymentNotifications(payment: any): Promise<void> {
    try {
      // Notify customer
      await this.notificationsService.create({
        userId: payment.order.userId,
        title: 'Payment Successful',
        message: `Your payment of ₦${payment.amount.toLocaleString()} was successful. Your order is being processed.`,
        type: 'PAYMENT_SUCCESS',
        metadata: {
          orderId: payment.orderId,
          reference: payment.reference,
          amount: payment.amount,
        },
      });

      // Notify vendor (store owner)
      if (payment.order?.store) {
        await this.notificationsService.create({
          userId: payment.order.store.vendorId,
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
      this.logger.error('Failed to send payment notifications:', error);
    }
  }

  async disbursePayment(
    dto: DisbursePaymentDto,
    adminId: string,
  ): Promise<DisbursementResponse> {
    // Generate unique reference
    const reference = this.generateReference('DISB');

    // Get recipient details based on type
    let bankAccount: any;
    let recipientName: string;

    if (dto.recipientType === RecipientType.VENDOR) {
      // For vendors, get store and its bank account
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: dto.recipientId },
        include: {
          store: {
            include: {
              bankAccount: true,
            },
          },
        },
      });

      if (!vendor || !vendor.store) {
        throw new NotFoundException('Vendor or store not found');
      }

      bankAccount = vendor.store.bankAccount;
      recipientName = vendor.name;
    } else if (dto.recipientType === RecipientType.RIDER) {
      // For riders, get rider record and its bank account
      const rider = await this.prisma.rider.findUnique({
        where: { id: dto.recipientId },
        include: {
          bankAccount: true,
        },
      });

      if (!rider) {
        throw new NotFoundException('Rider not found');
      }

      bankAccount = rider.bankAccount;
      recipientName = rider.name || 'Rider';
    } else {
      throw new BadRequestException('Invalid recipient type');
    }

    if (!bankAccount) {
      throw new BadRequestException('Recipient has no bank account configured');
    }

    let disbursement: DisbursementResponse;

    try {
      switch (dto.gateway) {
        case PaymentGateway.PAYSTACK:
          // Create or get transfer recipient
          let recipientCode = bankAccount.paystackRecipientCode;
          if (!recipientCode) {
            recipientCode = await this.paystackService.createTransferRecipient(
              bankAccount.accountNumber,
              bankAccount.bankCode,
              bankAccount.accountName,
            );

            // Save recipient code
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

        default:
          throw new BadRequestException(
            'Invalid payment gateway for disbursement',
          );
      }

      // Record disbursement in database
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

      // Send notification to recipient
      await this.notificationsService.create({
        userId: dto.recipientId,
        title: 'Payment Disbursement',
        message: `₦${dto.amount.toLocaleString()} has been sent to your account ${bankAccount.accountNumber}`,
        type: 'DISBURSEMENT',
        metadata: {
          reference,
          amount: dto.amount,
        },
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
    // Get original payment
    const payment = await this.prisma.payment.findFirst({
      where: { reference: dto.paymentReference },
      include: {
        order: {
          include: {
            user: true,
          },
        },
        ride: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if ((payment.status as PaymentStatus) !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Can only refund successful payments');
    }

    const refundAmount = dto.amount || payment.amount;

    if (refundAmount > payment.amount) {
      throw new BadRequestException(
        'Refund amount cannot exceed original payment amount',
      );
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
          if (!payment.transactionId) {
            throw new BadRequestException(
              'Transaction ID not found for Flutterwave refund',
            );
          }
          refund = await this.flutterwaveService.initiateRefund(
            payment.transactionId,
            refundAmount,
          );
          break;

        default:
          throw new BadRequestException(
            'Refunds not supported for this gateway',
          );
      }

      // Update payment status
      const newStatus =
        refundAmount < payment.amount
          ? PaymentStatus.PARTIAL_REFUND
          : PaymentStatus.REFUNDED;

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus as any,
          metadata: {
            ...(payment.metadata as any),
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

      // Update order/ride status if applicable
      if (payment.orderId) {
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'CANCELLED',
          },
        });
      }

      if (payment.rideId) {
        await this.prisma.ride.update({
          where: { id: payment.rideId },
          data: {
            status: 'CANCELLED',
          },
        });
      }

      // Notify customer
      const customer = payment.order?.user || payment.ride?.customer;
      if (customer) {
        await this.notificationsService.create({
          userId: customer.id,
          title: 'Refund Processed',
          message: `₦${refundAmount.toLocaleString()} has been refunded to your account. Reason: ${dto.reason}`,
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

  /**
   * Handle Monnify Refund Webhook
   * Called when a refund is completed on Monnify
   */
  async handleMonnifyRefundWebhook(
    payload: any,
    signature: string,
  ): Promise<void> {
    // Verify webhook signature
    const isValid = this.monnifyService.verifyWebhookSignature(
      payload,
      signature,
    );

    if (!isValid) {
      this.logger.warn('Invalid Monnify refund webhook signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    // Extract refund data from payload
    const {
      eventType,
      eventData,
    }: {
      eventType: string;
      eventData: {
        transactionReference: string;
        refundReference: string;
        refundAmount: number;
        refundStatus: string;
        destinationAccountNumber: string;
        destinationBankCode: string;
        completedOn?: string;
      };
    } = payload;

    this.logger.log(`Monnify refund webhook: ${eventType}`, eventData);

    // Only process successful refund completions
    if (eventType !== 'SUCCESSFUL_REFUND') {
      this.logger.log(`Ignoring refund event type: ${eventType}`);
      return;
    }

    try {
      // Find the original payment by reference
      const payment = await this.prisma.payment.findUnique({
        where: { reference: eventData.transactionReference },
        include: {
          order: {
            include: {
              user: true,
              store: true,
            },
          },
        },
      });

      if (!payment) {
        this.logger.warn(
          `Payment not found for refund: ${eventData.transactionReference}`,
        );
        return;
      }

      // Update payment record with refund info
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED' as any,
          metadata: {
            ...((payment.metadata as Record<string, any>) || {}),
            refund: {
              refundReference: eventData.refundReference,
              refundAmount: eventData.refundAmount,
              refundStatus: eventData.refundStatus,
              completedOn: eventData.completedOn,
            },
          },
        },
      });

      // Send refund notification to customer
      if (payment.order?.userId) {
        await this.notificationsService.create({
          userId: payment.order.userId,
          title: 'Refund Processed',
          message: `Your refund of ₦${eventData.refundAmount.toLocaleString()} has been processed successfully.`,
          type: 'REFUND_SUCCESS',
          metadata: {
            orderId: payment.orderId,
            reference: payment.reference,
            refundReference: eventData.refundReference,
            refundAmount: eventData.refundAmount,
          },
        });
      }

      this.logger.log(
        `Refund processed successfully: ${eventData.refundReference}`,
      );
    } catch (error) {
      this.logger.error('Error processing Monnify refund webhook:', error);
      throw error;
    }
  }

  private generateReference(prefix = 'PAY'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
  }
}
