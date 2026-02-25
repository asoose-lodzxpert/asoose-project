import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { TripsService } from '../users/trips/trips.service';
import { TransactionLedgerService } from '../super-admin/transactions/transaction-ledger.service';
import { PaymentGateway } from './interfaces/payment.interface';
import type { VerifyPaymentResponse } from './interfaces/payment.interface';

/**
 * Core status update logic — runs inside an atomic Prisma transaction,
 * then fires matching / notification side-effects after commit.
 */
@Injectable()
export class PaymentStatusService {
  private readonly logger = new Logger(PaymentStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly ledger: TransactionLedgerService,
    @InjectQueue('email') private readonly emailQueue: Queue,
    @Optional()
    @Inject(forwardRef(() => TripsService))
    private readonly tripsService?: TripsService,
  ) {}

  // =================================================================
  //  GATEWAY STATUS TRANSLATION
  // =================================================================
  normalizeGatewayStatus(gatewayStatus: string): PaymentStatus {
    const normalized = gatewayStatus.toLowerCase();

    if (['success', 'successful', 'completed', 'paid'].includes(normalized)) {
      return PaymentStatus.COMPLETED;
    }

    if (['failed', 'abandoned', 'cancelled', 'rejected'].includes(normalized)) {
      return PaymentStatus.FAILED;
    }

    this.logger.warn(`Unknown gateway status received: ${gatewayStatus}`);
    return PaymentStatus.PENDING;
  }

  // =================================================================
  //  CORE STATUS UPDATE (FIXED: Increased Timeout & Enum Safety)
  // =================================================================
  async updatePaymentStatus(
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
    if ((payment.status as any).toUpperCase() === PaymentStatus.COMPLETED) {
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
    const targetStatus =
      typeof verification.status === 'string'
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
    const result = await this.prisma.$transaction(
      async (tx) => {
        // 1. Update Payment Record
        const updatedPayment = await tx.payment.update({
          where: { reference: verification.reference },
          data: {
            status: finalStatus,
            paidAt,
            verifiedAt: new Date(),
          },
          include: {
            order: { include: { user: true, store: true, delivery: true } },
            orderGroup: {
              include: { orders: { include: { store: true, user: true } } },
            },
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
            await this.ledger.recordPayment(
              {
                id: payment.id,
                amount: payment.amount,
                userId: payment.orderGroup!.userId,
                method: payment.gateway,
                status: 'COMPLETED',
                orderGroupId: payment.orderGroupId,
                description: `Payment for Order Group #${payment.orderGroupId}`,
              },
              tx,
            );

            // Ledger: Record Commissions
            if (payment.orderGroup?.orders) {
              for (const order of payment.orderGroup.orders) {
                await this.ledger.recordOrderCommission(
                  {
                    id: order.id,
                    storeId: order.storeId,
                    total: order.total,
                    commissionRate: 10,
                  },
                  tx,
                );
              }
            }
          } else if (payment.orderId) {
            // B. Single Order
            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: OrderStatus.CONFIRMED },
            });

            if (payment.order) {
              await this.ledger.recordPayment(
                {
                  id: payment.id,
                  amount: payment.amount,
                  userId: payment.order.userId,
                  orderId: payment.orderId,
                  method: payment.gateway,
                  status: 'COMPLETED',
                },
                tx,
              );

              await this.ledger.recordOrderCommission(
                {
                  id: payment.orderId,
                  storeId: payment.order.storeId,
                  total: payment.amount,
                  commissionRate: 10,
                },
                tx,
              );
            }
          } else if (payment.rideId && payment.ride) {
            // C. Ride — re-fetch current status inside the transaction to guard
            // against delayed webhooks arriving after the ride was cancelled.
            const currentRide = await tx.ride.findUnique({
              where: { id: payment.rideId },
              select: { status: true, riderId: true, customerId: true },
            });

            if (currentRide?.status === 'CANCELLED') {
              this.logger.warn(
                `Webhook payment ${verification.reference} arrived for CANCELLED ride ${payment.rideId} — skipping earnings credit`,
              );
            } else if (currentRide?.riderId) {
              const ride = payment.ride;
              const platformFeeRate = 0.2;

              await this.ledger.recordPayment(
                {
                  id: payment.id,
                  amount: payment.amount,
                  userId: ride.customerId,
                  rideId: payment.rideId,
                  method: payment.gateway,
                  status: 'COMPLETED',
                },
                tx,
              );

              await this.ledger.recordRideEarnings(
                {
                  id: payment.rideId,
                  riderId: currentRide.riderId,
                  totalFare: payment.amount,
                  platformFee: payment.amount * platformFeeRate,
                  driverFee: payment.amount,
                },
                tx,
              );
            }
          }
        } else if (finalStatus === PaymentStatus.FAILED) {
          // Handle Failures
          if (payment.orderGroupId) {
            await tx.orderGroup.update({
              where: { id: payment.orderGroupId },
              data: { paymentStatus: PaymentStatus.FAILED },
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

          // Cancel orphaned rides on payment failure
          if (payment.rideId) {
            await tx.ride.updateMany({
              where: {
                id: payment.rideId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] as any },
              },
              data: {
                status: 'CANCELLED' as any,
                cancelledBy: 'SYSTEM',
                cancelledAt: new Date(),
              },
            });
          }

          // Cancel orphaned deliveries on payment failure
          if (payment.deliveryId) {
            await tx.delivery.updateMany({
              where: {
                id: payment.deliveryId,
                status: { notIn: ['DELIVERED', 'CANCELLED'] as any },
              },
              data: { status: 'CANCELLED' as any },
            });
          }
        }

        return updatedPayment;
      },
      {
        // FIX: Increase timeout to 30s to allow complex ledger updates
        timeout: 30000,
        maxWait: 5000,
      },
    );
    // === ATOMIC TRANSACTION END ===

    // =========================================================
    // 👇 MATCHING & NOTIFICATION LOGIC — only runs on confirmed payment
    // =========================================================
    if (finalStatus !== PaymentStatus.COMPLETED) {
      this.logger.log(
        `Payment ${verification.reference} status is ${finalStatus} — skipping notifications and matching`,
      );
      return;
    }

    const meta = payment.metadata as any;
    const metaType = meta?.type?.toUpperCase?.();
    if (metaType) {
      if (metaType === 'RIDE') {
        if (meta.rideId) {
          // Transition ride from PENDING → REQUESTED so matching can proceed
          await this.prisma.ride.updateMany({
            where: { id: meta.rideId, status: 'PENDING' as any },
            data: { status: 'REQUESTED' as any },
          });

          await this.startRideMatching(meta.rideId);
          await this.sendMatchingNotifications({
            type: 'ride',
            rideId: meta.rideId,
            customerId: result.ride?.customer?.id,
            riderId: result.ride?.riderId ?? undefined,
          });
        }
      } else if (metaType === 'ORDER') {
        // Multi-vendor order group
        if (payment.orderGroupId && result.orderGroup?.orders) {
          for (const order of result.orderGroup.orders) {
            const orderUser = (order as any).user;
            // Notify vendor of new confirmed order
            if (order.store?.vendorId) {
              await this.notificationsService.createForVendor({
                vendorId: order.store.vendorId,
                title: 'New Order Received',
                message: `Order #${order.id.slice(-6)} has been confirmed. Please start preparing.`,
                type: 'ORDER',
                category: 'ORDER_CREATED',
                metadata: { orderId: order.id },
              });
            }
            // Broadcast to admin dashboard
            this.notificationsGateway.sendToAdminRoom({
              id: order.id,
              type: 'ORDER',
              category: 'ORDER_CREATED',
              title: 'New Order Placed',
              message: `₦${order.total} order from ${orderUser?.name || 'Customer'} at ${order.store?.name}`,
              isRead: false,
              createdAt: new Date().toISOString(),
              metadata: {
                orderId: order.id,
                orderGroupId: payment.orderGroupId,
              },
              recipientName: orderUser?.name || '—',
            });
          }
          // Notify customer once for the whole group
          await this.notificationsService.create({
            userId: result.orderGroup.userId,
            title: 'Orders Confirmed',
            message: `Your ${result.orderGroup.orders.length} orders have been confirmed and stores are being notified.`,
            type: 'ORDER',
            category: 'ORDER_CREATED',
            metadata: { orderGroupId: payment.orderGroupId },
          });

          // Send delivery OTP email to customer now that payment is confirmed.
          // Rider matching is deferred: it fires via the 'order.ready' event
          // once ALL vendors in this group have marked their orders as READY.
          try {
            const groupDelivery = await this.prisma.delivery.findFirst({
              where: { orderGroupId: payment.orderGroupId },
              include: {
                customer: { select: { email: true, name: true } },
                dropoffAddress: { select: { street: true, city: true } },
              },
            });
            if (groupDelivery) {
              // Send OTP email to customer
              if (groupDelivery.customer?.email && groupDelivery.deliveryOtp) {
                await this.sendDeliveryOtpEmail({
                  email: groupDelivery.customer.email,
                  name: groupDelivery.customer.name ?? 'Customer',
                  otp: groupDelivery.deliveryOtp,
                  address: groupDelivery.dropoffAddress
                    ? `${groupDelivery.dropoffAddress.street}, ${groupDelivery.dropoffAddress.city}`
                    : undefined,
                });
              }
            }
          } catch (err) {
            this.logger.error('Group delivery OTP email failed', err);
          }
        } else if (result.order?.delivery?.id) {
          // Single order — notify vendor
          if (result.order.store?.vendorId) {
            await this.notificationsService.createForVendor({
              vendorId: result.order.store.vendorId,
              title: 'New Order Received',
              message: `Order #${result.order.id.slice(-6)} has been confirmed. Please start preparing.`,
              type: 'ORDER',
              category: 'ORDER_CREATED',
              metadata: { orderId: result.order.id },
            });
          }
          // Notify customer
          await this.notificationsService.create({
            userId: result.order.userId,
            title: 'Order Confirmed',
            message: `Your order from ${result.order.store?.name} has been confirmed.`,
            type: 'ORDER',
            category: 'ORDER_CREATED',
            metadata: { orderId: result.order.id },
          });
          // Broadcast to admin dashboard
          this.notificationsGateway.sendToAdminRoom({
            id: result.order.id,
            type: 'ORDER',
            category: 'ORDER_CREATED',
            title: 'New Order Placed',
            message: `₦${result.order.total} order from ${result.order.user?.name || 'Customer'} at ${result.order.store?.name}`,
            isRead: false,
            createdAt: new Date().toISOString(),
            metadata: { orderId: result.order.id },
            recipientName: result.order.user?.name || '—',
          });
          // Rider matching is deferred: it fires via the 'order.ready' event
          // once the vendor marks this order as READY (PATCH /orders/:id/ready).

          // Send OTP email to customer now that payment is confirmed
          try {
            const delivery = await this.prisma.delivery.findUnique({
              where: { id: result.order.delivery.id },
              include: {
                customer: { select: { email: true, name: true } },
                dropoffAddress: { select: { street: true, city: true } },
              },
            });
            if (delivery?.customer?.email && delivery.deliveryOtp) {
              await this.sendDeliveryOtpEmail({
                email: delivery.customer.email,
                name: delivery.customer.name ?? 'Customer',
                otp: delivery.deliveryOtp,
                storeName: result.order.store?.name,
                address: delivery.dropoffAddress
                  ? `${delivery.dropoffAddress.street}, ${delivery.dropoffAddress.city}`
                  : undefined,
              });
            }
          } catch (err) {
            this.logger.error('Single-order OTP email failed', err);
          }
        }
      } else if (metaType === 'DELIVERY') {
        // Direct delivery: admin manually assigns riders — no auto-matching
        await this.sendAdminAssignmentNotification(
          meta.deliveryId,
          payment.userId,
        );
        await this.sendMatchingNotifications({
          type: 'delivery',
          deliveryId: meta.deliveryId,
          customerId: payment.userId,
        });
      }
    }

    await this.sendPaymentNotifications(result);
  }

  // =================================================================
  //  PRIVATE HELPERS
  // =================================================================

  private async sendDeliveryOtpEmail(params: {
    email: string;
    name: string;
    otp: string;
    orderId?: string;
    storeName?: string;
    address?: string;
  }) {
    try {
      await this.emailQueue.add(
        'send-email',
        {
          to: params.email,
          subject: 'Your Delivery OTP – Share with your rider',
          template: 'delivery-otp',
          context: {
            name: params.name,
            otp: params.otp,
            orderId: params.orderId,
            storeName: params.storeName,
            address: params.address,
          },
        },
        { attempts: 3, removeOnComplete: true },
      );
      this.logger.log(`Delivery OTP email queued for ${params.email}`);
    } catch (err) {
      this.logger.error('Failed to queue delivery OTP email', err);
    }
  }

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
            type: 'RIDE',
            category: 'RIDE_REQUESTED',
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
            type: 'ORDER',
            category: 'ORDER_DELIVERY_MATCHING',
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
            type: 'ORDER',
            category: 'ORDER_DELIVERY_MATCHING',
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
            type: 'DELIVERY',
            category: 'DELIVERY_CREATED',
            metadata: { deliveryId: params.deliveryId },
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to send matching notifications:', error);
    }
  }

  private async sendAdminAssignmentNotification(
    deliveryId: string,
    customerId: string,
  ): Promise<void> {
    try {
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
      }

      // Multi-Vendor Notifications
      if (payment.orderGroup) {
        for (const order of payment.orderGroup.orders) {
          const vendorId = order.store?.vendorId;
          if (vendorId) {
            await this.notificationsService.createForVendor({
              vendorId,
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
            vendorId,
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
}
