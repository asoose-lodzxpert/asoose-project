
import { PrismaClient, DeliveryStatus, TransactionType, WalletEntityType, TransactionStatus } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const deliveryId = 'c5710e0e-e3ec-4afc-aba4-6fa6dc22b59a';
  const riderId = '378e57fa-227c-4aa0-8e69-93f62b490e35';

  console.log(`Starting completion for delivery ${deliveryId}...`);

  const result = await prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({
      where: { id: deliveryId },
      include: { dropoffAddress: true }
    });

    if (!delivery) throw new Error('Delivery not found');
    if (delivery.riderId !== riderId) throw new Error('Rider mismatch');
    
    // We don't check status here to allow force completion even if stuck in a weird state,
    // but usually it should be PICKED_UP.
    console.log(`Current status: ${delivery.status}`);

    // 1. Update delivery status
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });

    // 2. Update order if exists
    if (delivery.orderId) {
      console.log(`Updating order ${delivery.orderId}...`);
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
    }

    // 3. Update rider wallet and create transaction
    const rider = await tx.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new Error('Rider not found');

    const fee = Number(delivery.deliveryFee) || 0;
    const earning = Math.round(fee * 0.8 * 100) / 100; // 80% earning, rounded to 2 decimal places
    const balanceBefore = Number(rider.walletBalance);
    const balanceAfter = Math.round((balanceBefore + earning) * 100) / 100;

    console.log(`Fee: ${fee}, Earning: ${earning}, Balance Before: ${balanceBefore}, Balance After: ${balanceAfter}`);

    await tx.rider.update({
      where: { id: riderId },
      data: { walletBalance: balanceAfter },
    });

    await tx.transaction.create({
      data: {
        type: TransactionType.RIDER_EARNING,
        amount: earning,
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
        entityId: riderId,
        entityType: WalletEntityType.RIDER,
        deliveryId: delivery.id,
        status: TransactionStatus.COMPLETED,
        description: `Manual earnings for delivery ${delivery.id}`,
      },
    });

    return { deliveryId, riderId, earning, balanceAfter };
  });

  console.log('Completion successful!');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => {
  console.error('Completion failed:');
  console.error(e);
  process.exit(1);
});
