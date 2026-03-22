import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('order-reminders')
export class OrderRemindersProcessor extends WorkerHost {
    private readonly logger = new Logger(OrderRemindersProcessor.name);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private eventEmitter: EventEmitter2,
    ) {
        super();
    }

    async process(job: Job<{ orderId: string }>) {
        const { orderId } = job.data;
        this.logger.debug(`Processing order reminder for order ${orderId}`);

        try {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    id: true,
                    status: true,
                    paymentStatus: true,
                    userId: true,
                    createdAt: true,
                },
            });

            if (!order) return;

            // Only remind if still PENDING and NOT PAID
            if (
                order.status === 'PENDING' &&
                order.paymentStatus !== 'PAID' &&
                order.paymentStatus !== 'COMPLETED'
            ) {
                const title = '⚠️ Unpaid Order Reminder';
                const message =
                    'You have an unpaid order waiting. Complete your payment within 30 minutes to secure your items before it is automatically cancelled!';

                await this.notificationsService.create({
                    userId: order.userId,
                    title,
                    message,
                    type: 'ORDER',
                    category: 'PAYMENT_REMINDER',
                    metadata: { orderId: order.id },
                });

                // Emit event for Admin Audit & Push notification
                this.eventEmitter.emit('system.action', {
                    action: 'UNPAID_ORDER_REMINDER',
                    severity: 'NORMAL',
                    title: '⚠️ Unpaid Order Reminder',
                    message: `Order #${order.id.split('-')[0]} is sitting unpaid for 30 minutes. It will auto-cancel soon.`,
                    metadata: { orderId: order.id, userId: order.userId },
                });

                this.logger.log(`Reminder push sent for unpaid order ${orderId} (User & Admin)`);
            }
        } catch (error) {
            this.logger.error(
                `Failed to process order reminder for ${orderId}:`,
                error,
            );
        }
    }
}
