import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderFilterDto } from './dto/order-filter.dto';
import { Prisma, StoreType, OrderStatus } from '@prisma/client'; // Added OrderStatus
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';

// Helper to map friendly frontend names to DB Enums
const SERVICE_TYPE_MAP: Record<string, StoreType> = {
  'Food': 'RESTAURANT',
  'Grocery': 'GROCERY',
  'Pharmacy': 'PHARMACY',
  'Logistics': 'MARKET'
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: TransactionLedgerService
  ) {}

  // 📋 1. List All Orders
  async findAll(query: OrderFilterDto) {
    const { search, status, type, from, to, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const storeType = type && type !== 'All' ? SERVICE_TYPE_MAP[type] : undefined;

    const where: Prisma.OrderWhereInput = {
      ...(search && {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { store: { name: { contains: search, mode: 'insensitive' } } },
        ]
      }),
      ...(status && status !== 'All' && {
        status: status as Prisma.EnumOrderStatusFilter
      }),
      ...(storeType && {
        store: { type: storeType }
      }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(new Date(from).setHours(0, 0, 0, 0)) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) })
        }
      })
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          store: { select: { name: true, type: true } },
          payment: { select: { status: true, amount: true } },
          delivery: { 
            include: { rider: { include: { user: { select: { name: true } } } } } 
          }
        }
      }),
      this.prisma.order.count({ where })
    ]);

    return {
      data: orders.map(order => ({
        id: order.id,
        status: order.status,
        customer: order.user.name,
        vendor: order.store.name,
        rider: order.delivery?.rider?.user.name ?? 'Unassigned',
        amount: order.payment?.amount ?? order.total,
        paymentStatus: order.payment?.status ?? 'UNPAID',
        type: this.mapStoreTypeToService(order.store.type),
        placedAt: order.createdAt.toISOString(),
      })),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    };
  }

  // 🔍 2. Get Single Order Details
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        store: { 
          include: { 
            // Line 98
vendor: { select: { name: true, phone: true, email: true } }
          } 
        },
        items: { include: { product: true } },
        payment: true,
        delivery: {
          include: {
            rider: { include: { user: true, vehicle: true } },
            pickupAddress: true,
            dropoffAddress: true
          }
        },
      }
    });

    if (!order) throw new NotFoundException(`Order #${id} not found`);

    const logs = await this.prisma.activityLog.findMany({
      where: { target: { contains: id } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } }
    });

    const dispute = await this.prisma.dispute.findFirst({
      where: { orderId: id, status: 'OPEN' },
      select: { id: true, reason: true }
    });

    return this.transformForDetail(order, logs, dispute);
  }

  // ✅ 3. Complete Order (Triggers Ledger Recording)
  async completeOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        store: { select: { id: true, commissionRate: true } },
        user: { select: { id: true } }
      }
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'DELIVERED') {
      throw new BadRequestException('Order already completed');
    }

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // 1. Update order status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { 
          status: 'DELIVERED',
          deliveredAt: new Date()
        }
      });

      // 2. Record payment in ledger (if payment exists and is completed)
      if (order.payment && order.payment.status === 'COMPLETED') {
        await this.ledgerService.recordPayment({
          id: order.payment.id,
          amount: order.payment.amount,
          userId: order.user.id,
          orderId: order.id,
          method: order.payment.method,
          status: order.payment.status
        });

        // 3. Record commission and vendor earnings
        await this.ledgerService.recordOrderCommission({
          id: order.id,
          storeId: order.store.id,
          total: order.total,
          commissionRate: order.store.commissionRate || 20 // Default 20%
        });
      }

      // 4. Log activity
      await tx.activityLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'ORDER_COMPLETED',
          target: id,
          metadata: { 
            completedAt: new Date().toISOString(),
            totalAmount: order.total
          }
        }
      });

      return updatedOrder;
    });
  }

  // ❌ 4. Cancel Order (With Refund Handling)
  async remove(id: string, adminUserId?: string) {
    const order = await this.prisma.order.findUnique({ 
      where: { id },
      include: {
        payment: true,
        user: { select: { id: true } }
      }
    });

    if (!order) throw new NotFoundException('Order not found');
    
    if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order that is ${order.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Cancel the order
      await tx.order.update({
        where: { id },
        data: { 
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      // 2. Process refund if payment was completed
      if (order.payment && order.payment.status === 'COMPLETED') {
        // Update payment status to refunded
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: 'REFUNDED' }
        });

        // Record refund in ledger
        await this.ledgerService.recordRefund({
          id: order.payment.id,
          amount: order.payment.amount,
          userId: order.user.id,
          orderId: order.id
        });
      }

      // 3. Log activity
      await tx.activityLog.create({
        data: {
          userId: adminUserId || 'SUPER_ADMIN',
          action: 'ORDER_CANCELLED',
          target: id,
          metadata: { 
            reason: 'Admin Force Cancel',
            refunded: order.payment?.status === 'COMPLETED'
          }
        }
      });
    });
  }

  // 💰 5. Process Order Refund (Partial or Full)
  async refundOrder(id: string, refundAmount?: number, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        user: { select: { id: true } }
      }
    });

    if (!order) throw new NotFoundException('Order not found');
    if (!order.payment) throw new BadRequestException('No payment found for this order');
    if (order.payment.status !== 'COMPLETED') {
      throw new BadRequestException('Can only refund completed payments');
    }

    const payment = order.payment;
    const amountToRefund = refundAmount || payment.amount;

    if (amountToRefund > payment.amount) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: { 
          status: amountToRefund === payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
        }
      });

      // Record refund in ledger
      await this.ledgerService.recordRefund({
        id: payment.id,
        amount: amountToRefund,
        userId: order.user.id,
        orderId: order.id
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: 'ADMIN',
          action: 'REFUND_ISSUED',
          target: id,
          metadata: { 
            amount: amountToRefund,
            reason: reason || 'Refund processed',
            isPartial: amountToRefund < payment.amount
          }
        }
      });
    });
  }

  // ⚠️ 6. Force Status Override ("God Mode")
  // Allows moving an order to ANY status without standard validation.
  async forceStatusChange(orderId: string, newStatus: OrderStatus, reason: string, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) throw new NotFoundException('Order not found');

    // Perform the Override
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newStatus,
        // Manage timestamps based on status
        cancelledAt: newStatus === 'CANCELLED' ? new Date() : undefined,
        deliveredAt: newStatus === 'DELIVERED' ? new Date() : undefined,
        // If resetting to PENDING/PREPARING, we might want to clear deliveredAt
        ...( ['PENDING', 'PREPARING', 'CONFIRMED'].includes(newStatus) && { deliveredAt: null, cancelledAt: null })
      }
    });

    // Log the System Override
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'ORDER_FORCE_UPDATE',
        details: `Force status change from ${order.status} to ${newStatus}. Reason: ${reason}`,
        target: orderId,
        metadata: {
            oldStatus: order.status,
            newStatus: newStatus,
            reason: reason
        }
      },
    });

    return updatedOrder;
  }

  // --- Transformers ---

  private mapStoreTypeToService(type: string) {
    const entry = Object.entries(SERVICE_TYPE_MAP).find(([k, v]) => v === type);
    return entry ? entry[0] : type;
  }

  private transformForDetail(order: any, logs: any[], dispute: any) {
    return {
      id: order.id,
      serviceType: this.mapStoreTypeToService(order.store.type),
      status: order.status,
      dispute: dispute,
      amount: order.total,
      updatedAt: order.updatedAt,
      isLate: ['PREPARING', 'PENDING'].includes(order.status) && 
              (new Date().getTime() - new Date(order.createdAt).getTime()) > 45 * 60000, 
      
      customer: {
        name: order.user.name,
        phone: order.user.phone,
        email: order.user.email,
        address: order.delivery?.dropoffAddress?.street || 'N/A'
      },

      vendor: {
        name: order.store.name,
        address: order.store.address,
        ownerName: order.store.owner.name,
        ownerPhone: order.store.owner.phone
      },

      rider: order.delivery?.rider ? {
        name: order.delivery.rider.user.name,
        phone: order.delivery.rider.user.phone,
        vehicle: order.delivery.rider.vehicle?.plateNumber
      } : null,

      items: order.items.map((item: any) => ({
        name: item.nameSnap,
        quantity: item.quantity,
        price: item.price,
        options: item.selectedOptions
      })),

      payment: order.payment ? {
        status: order.payment.status,
        method: order.payment.method,
        total: order.payment.amount
      } : null,

      logs: logs.map((log: any) => ({
        date: log.createdAt,
        user: log.user?.name || 'System',
        action: log.action,
        // Include detail/metadata in response so Admin sees reason for override
        details: log.details || (log.metadata ? JSON.stringify(log.metadata) : '') 
      }))
    };
  }
}