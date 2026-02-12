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
import { Prisma, PaymentStatus, OrderStatus } from '@prisma/client';
import {
  PaymentGateway,
  PaymentMethod,
  PaymentType,
  TransactionType,
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

  // =================================================================
  //  1. GATEWAY STATUS TRANSLATION LAYER (Safety Feature)
  // =================================================================
  private normalizeGatewayStatus(gatewayStatus: string): PaymentStatus {
    const normalized = gatewayStatus.toLowerCase();
    
    // Map 'success'/'paid' to Prisma's 'COMPLETED'
    if (['success', 'successful', 'completed', 'paid'].includes(normalized)) {
      return PaymentStatus.COMPLETED; 
    }
    
    // Map failure strings
    if (['failed', 'abandoned', 'cancelled', 'rejected'].includes(normalized)) {
      return PaymentStatus.FAILED;
    }

    // Default fallback
    this.logger.warn(`Unknown gateway status received: ${gatewayStatus}`);
    return PaymentStatus.PENDING;
  }

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
    let orderGroupId = dto.orderGroupId;
    let orderId = dto.orderId;
    let rideId = dto.rideId;
    let deliveryId = dto.deliveryId || dto.metadata?.deliveryId;

    if ((dto.type as any) === 'ORDER' || dto.type === PaymentType.ORDER) {
      if (orderGroupId) {
        const group = await this.prisma.orderGroup.findUnique({
          where: { id: orderGroupId },
        });
        if (!group)
          throw new NotFoundException(
            `Order Group ${orderGroupId} not found`,
          );
        amount = group.totalAmount;
      } else if (orderId) {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
        });
        if (!order)
          throw new NotFoundException(`Order ${orderId} not found`);
        amount = order.total;
      } else {
        throw new BadRequestException(
          'Order payment requires valid orderId or orderGroupId',
        );
      }
    } else if ((dto.type as any) === 'RIDE' || dto.type === PaymentType.RIDE) {
      if (!rideId) throw new BadRequestException('Ride ID required');
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideId },
      });
      if (!ride) throw new NotFoundException('Ride not found');
      if (!ride.totalFare) {
         throw new BadRequestException('Ride fare has not been calculated yet');
      }
      amount = ride.totalFare;
    } else if ((dto.type as any) === 'DELIVERY' || dto.type === PaymentType.DELIVERY) {
      if (!deliveryId)
        throw new BadRequestException('Delivery ID is required');
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

    const reference = this.generateReference();
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

    // 3. Create Payment Record (Pending)
    await this.prisma.payment.create({
      data: {
        reference,
        amount: amount,
        gateway: dto.gateway,
        method: dto.method as any,
        status: PaymentStatus.PENDING,
        userId,
        orderId,
        orderGroupId,
        rideId,
        deliveryId,
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
            amount,
            dto.email,
            reference,
            metadata,
            paystackCallbackUrl,
          );
          break;

        case PaymentGateway.FLUTTERWAVE:
          response = await this.flutterwaveService.initializePayment(
            amount,
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
            amount,
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
        data: { status: PaymentStatus.FAILED },
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
    let status: string; // Gateway raw status
    let amount: number;
    let paidAt: Date;

    switch (gateway) {
      case PaymentGateway.PAYSTACK:
        if (payload.event !== 'charge.success') return;
        reference = payload.data.reference;
        status = payload.data.status; 
        amount = payload.data.amount / 100;
        paidAt = new Date(payload.data.paid_at);
        break;

      case PaymentGateway.FLUTTERWAVE:
        if (payload.event !== 'charge.completed') return;
        reference = payload.data.tx_ref;
        status = payload.data.status;
        amount = payload.data.amount;
        paidAt = new Date(payload.data.created_at);
        break;

      case PaymentGateway.MONNIFY:
        if (payload.eventType !== 'SUCCESSFUL_TRANSACTION') return;
        reference = payload.eventData.paymentReference;
        status = 'SUCCESS';
        amount = payload.eventData.amountPaid;
        paidAt = new Date(payload.eventData.paidOn);
        break;
    }

    await this.updatePaymentStatus({
      success: ['success', 'successful'].includes(status?.toLowerCase()),
      reference,
      amount,
      status: status as any,
      gateway,
      paidAt,
    });
  }

  // =================================================================
  //  CORE STATUS UPDATE LOGIC (FIXED: Increased Timeout & Enum Safety)
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
        orderGroup: {
          include: { orders: { include: { store: true, user: true } } },
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
    if ((payment.status as any).toUpperCase() === PaymentStatus.SUCCESS) {
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
          status: PaymentStatus.FAILED,
          metadata: {
            ...(payment.metadata as object),
            failReason: 'AMOUNT_MISMATCH',
            receivedAmount: verification.amount,
          },
        },
      });
      return;
    }

    // 1. Normalize Status
    const targetStatus = typeof verification.status === 'string'
      ? this.normalizeGatewayStatus(verification.status)
      : (verification.status as unknown as PaymentStatus); 

    const finalStatus = Object.values(PaymentStatus).includes(targetStatus)
      ? targetStatus
      : PaymentStatus.PENDING;

    const paidAt = verification.paidAt
      ? new Date(verification.paidAt)
      : new Date();

    // === ATOMIC TRANSACTION START ===
    // FIX: Added timeout configuration to handle long-running ledger updates
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update Payment Record
      const updatedPayment = await tx.payment.update({
        where: { reference: verification.reference },
        data: {
          status: finalStatus,
          paidAt: paidAt,
          verifiedAt: new Date(),
        },
        include: {
          order: { include: { user: true, store: true, delivery: true } },
          orderGroup: { include: { orders: { include: { store: true } } } },
          ride: { include: { customer: true } },
        },
      });

      // 2. Handle Status Updates & Ledger Recording
      if (finalStatus === PaymentStatus.COMPLETED) {
        if (payment.orderGroupId) {
          // A. Multi-Vendor Order Group
          await tx.orderGroup.update({
            where: { id: payment.orderGroupId },
            data: { paymentStatus: PaymentStatus.COMPLETED }, 
          });

          await tx.order.updateMany({
            where: { orderGroupId: payment.orderGroupId },
            data: { status: OrderStatus.CONFIRMED },
          });

          // Ledger: Record Incoming Payment
          await this.ledger.recordPayment({
            id: payment.id,
            amount: payment.amount,
            userId: payment.orderGroup!.userId,
            method: payment.gateway,
            status: 'COMPLETED',
            orderGroupId: payment.orderGroupId,
            description: `Payment for Order Group #${payment.orderGroupId}`,
          }, tx);

          // Ledger: Record Commissions (Can be slow for many orders)
          if (payment.orderGroup?.orders) {
             for (const order of payment.orderGroup.orders) {
                await this.ledger.recordOrderCommission({
                  id: order.id,
                  storeId: order.storeId,
                  total: order.total,
                  commissionRate: 10,
                }, tx);
             }
          }

        } else if (payment.orderId) {
          // B. Single Order
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.CONFIRMED },
          });

          if (payment.order) {
             await this.ledger.recordPayment({
                id: payment.id,
                amount: payment.amount,
                userId: payment.order.userId,
                orderId: payment.orderId,
                method: payment.gateway,
                status: 'COMPLETED',
             }, tx);

             await this.ledger.recordOrderCommission({
                id: payment.orderId,
                storeId: payment.order.storeId,
                total: payment.amount,
                commissionRate: 10,
             }, tx);
          }

        } else if (payment.rideId && payment.ride) {
          // C. Ride
          const ride = payment.ride;
          if (ride.riderId) {
            const platformFeeRate = 0.2; 
            
            await this.ledger.recordPayment({
              id: payment.id,
              amount: payment.amount,
              userId: ride.customerId,
              rideId: payment.rideId,
              method: payment.gateway,
              status: 'COMPLETED',
            }, tx);

            await this.ledger.recordRideEarnings({
              id: payment.rideId,
              riderId: ride.riderId,
              totalFare: payment.amount,
              platformFee: payment.amount * platformFeeRate,
              driverFee: payment.amount, 
            }, tx);
          }
        }
      } else if (finalStatus === PaymentStatus.FAILED) {
        // Handle Failures
        if (payment.orderGroupId) {
          await tx.orderGroup.update({
             where: { id: payment.orderGroupId },
             data: { paymentStatus: PaymentStatus.FAILED }
          });
          await tx.order.updateMany({
            where: { orderGroupId: payment.orderGroupId },
            data: { status: OrderStatus.CANCELLED },
          });
        } else if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.CANCELLED },
          });
        }
      }

      return updatedPayment;
    }, {
      // FIX: Increase timeout to 30s to allow complex ledger updates
      timeout: 30000, 
      maxWait: 5000 
    });
    // === ATOMIC TRANSACTION END ===

      // =========================================================
      // 👇 MATCHING LOGIC FIXED HERE
      // =========================================================
      // New logic: use metadata.type for routing
      const meta = payment.metadata as any;
      if (meta && meta.type) {
        if (meta.type === 'ride') {
          // Ride request
          if (meta.rideId) {
            await this.startRideMatching(meta.rideId);
            // Notify rider and customer
            await this.sendMatchingNotifications({
              type: 'ride',
              rideId: meta.rideId,
              customerId: result.ride?.customer?.id,
              riderId: result.ride?.riderId ?? undefined,
            });
          }
        } else if (meta.type === 'order') {
          // E-commerce order delivery
          if (result.order?.delivery?.id) {
            await this.startDeliveryMatching(result.order.delivery.id);
            // Notify customer and vendor
            await this.sendMatchingNotifications({
              type: 'order',
              orderId: result.order.id,
              deliveryId: result.order.delivery.id,
              customerId: result.order.userId,
              vendorId: result.order.store?.vendorId,
            });
          }
        } else if (meta.type === 'delivery') {
          // Direct delivery request: notify admin for manual assignment
          await this.sendAdminAssignmentNotification(
            meta.deliveryId,
            payment.userId,
          );
          // Notify customer
          await this.sendMatchingNotifications({
            type: 'delivery',
            deliveryId: meta.deliveryId,
            customerId: payment.userId,
          });
          // DO NOT start delivery matching for direct delivery
        }
      }

      await this.sendPaymentNotifications(result);
    }
  }

  // Send notifications to involved parties after matching
  private async sendMatchingNotifications(params: {
    type: 'ride' | 'order' | 'delivery';
    rideId?: string;
    orderId?: string;
    deliveryId?: string;
    customerId?: string;
    riderId?: string;
    vendorId?: string;
  }): Promise<void> {
    try {
      if (params.type === 'ride') {
        if (params.customerId) {
          await this.notificationsService.create({
            userId: params.customerId,
            title: 'Ride Matching Started',
            message: 'We are finding a rider for your trip.',
            type: 'RIDE_MATCHING',
            metadata: { rideId: params.rideId },
          });
        }
        if (params.riderId) {
          await this.notificationsService.create({
            userId: params.riderId,
            title: 'New Ride Request',
            message: 'A new ride request is available for you.',
            type: 'RIDE_REQUEST',
            metadata: { rideId: params.rideId },
          });
        }
      } else if (params.type === 'order') {
        if (params.customerId) {
          await this.notificationsService.create({
            userId: params.customerId,
            title: 'Order Delivery Matching Started',
            message: 'We are finding a courier for your order.',
            type: 'ORDER_DELIVERY_MATCHING',
            metadata: {
              orderId: params.orderId,
              deliveryId: params.deliveryId,
            },
          });
        }
        if (params.vendorId) {
          await this.notificationsService.createForVendor({
            vendorId: params.vendorId,
            title: 'Order Delivery Matching Started',
            message: 'A courier is being assigned for your order.',
            type: 'ORDER_DELIVERY_MATCHING',
            metadata: {
              orderId: params.orderId,
              deliveryId: params.deliveryId,
            },
          });
        }
      } else if (params.type === 'delivery') {
        if (params.customerId) {
          await this.notificationsService.create({
            userId: params.customerId,
            title: 'Delivery Request Received',
            message:
              'Your delivery request is being processed. An admin will assign a rider soon.',
            type: 'DELIVERY_REQUEST',
            metadata: { deliveryId: params.deliveryId },
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to send matching notifications:', error);
    }
  }

  // Notify admin for manual delivery assignment
  private async sendAdminAssignmentNotification(
    deliveryId: string,
    customerId: string,
  ): Promise<void> {
    try {
      // Find admin users (example: all users with role 'ADMIN')
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.notificationsService.create({
          userId: admin.id,
          title: 'Manual Delivery Assignment Needed',
          message: `A new delivery request (${deliveryId}) requires manual rider assignment.`,
          type: 'DELIVERY_MANUAL_ASSIGN',
          metadata: { deliveryId, customerId },
        });
      }
    } catch (error) {
      this.logger.error(
        'Failed to notify admin for manual delivery assignment:',
        error,
      );
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

      // Only send one notification per user
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
      }

      // Multi-Vendor Notifications
      if (payment.orderGroup) {
        for (const order of payment.orderGroup.orders) {
          const vendorId = order.store?.vendorId;
          if (vendorId) {
            await this.notificationsService.createForVendor({
              vendorId: vendorId,
              title: 'New Order Payment',
              message: `Payment received for order #${order.id}.`,
              type: 'ORDER_PAYMENT',
              metadata: {
                orderId: order.id,
                reference: payment.reference,
                amount: order.total,
              },
            });
          }
        }
      } else {
        const vendorId = payment.order?.store?.vendorId;
        if (vendorId) {
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
        refundAmount < payment.amount ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED;

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
          status: PaymentStatus.REFUNDED,
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