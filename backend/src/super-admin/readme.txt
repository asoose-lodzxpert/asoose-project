Financial System & Transaction Ledger Integration Guide
1. System Overview
We have implemented a Unified Transaction Ledger (Transaction model in Prisma) to act as the single source of truth for all financial movements in the platform.

Core Philosophy:

Immutability: Once a transaction is created, it is never deleted. Status changes (e.g., PENDING -> COMPLETED) are allowed, but records persist.

Atomicity: All wallet balance updates must occur within a prisma.$transaction block alongside the creation of the Transaction record.

Traceability: Every wallet movement (Vendor Earning, Rider Payout, etc.) must link back to a source entity (OrderId, RideId, PayoutId).

2. The Core Tool: TransactionsService
Location: src/super-admin/transactions/transaction.service.ts

You will primarily use the createTransaction method (or call prisma.transaction.create directly within atomic blocks).

The Interface:

TypeScript

interface TransactionInput {
  type: TransactionType;       // e.g., 'VENDOR_EARNING', 'COMMISSION_DEDUCTED'
  amount: number;              // Always positive for the record itself
  description: string;         // Human-readable summary
  entityType?: WalletEntityType; // 'STORE', 'RIDER', 'PLATFORM'
  entityId?: string;           // The User ID or Store ID whose wallet changed
  balanceBefore: number;       // Snapshot before update
  balanceAfter: number;        // Snapshot after update
  
  // References (At least one required usually)
  orderId?: string;
  rideId?: string;
  paymentId?: string;
  vendorPayoutId?: string;
  riderPayoutId?: string;
}
3. Implementation Guide by Module
A. Orders Module (Vendor Earnings)
Trigger: When an Order status changes to DELIVERED. Location: src/users/orders.service.ts (or vendor-orders.service.ts)

Logic to Implement:

Calculate Platform Commission (e.g., 10% of Order Total).

Calculate Net Vendor Earning (Total - Commission).

Atomic Transaction:

Update Store.walletBalance (increment by Net Earning).

Update Store.totalRevenue.

Create Transaction (Type: VENDOR_EARNING).

Create Transaction (Type: COMMISSION_DEDUCTED) - Optional, depending on if you want to track the deduction explicitly or just log the net.

Code Snippet Example:

TypeScript

await this.prisma.$transaction(async (tx) => {
  // 1. Update Order Status
  const order = await tx.order.update({ 
    where: { id }, 
    data: { status: 'DELIVERED', deliveredAt: new Date() },
    include: { store: true }
  });

  // 2. Financial Calcs
  const commission = order.total * (order.store.commissionRate / 100);
  const vendorNet = order.total - commission;
  const oldBalance = order.store.walletBalance;
  const newBalance = oldBalance + vendorNet;

  // 3. Update Wallet
  await tx.store.update({
    where: { id: order.storeId },
    data: { walletBalance: newBalance }
  });

  // 4. Ledger Entry
  await tx.transaction.create({
    data: {
      type: 'VENDOR_EARNING',
      amount: vendorNet,
      description: `Earnings for Order #${order.id}`,
      entityType: 'STORE',
      entityId: order.storeId,
      orderId: order.id,
      balanceBefore: oldBalance,
      balanceAfter: newBalance,
      status: 'COMPLETED'
    }
  });
});
B. Rides Module (Rider Earnings)
Trigger: When Ride status changes to COMPLETED. Location: src/super-admin/ride/ride.service.ts or src/riders/rides.service.ts

Logic to Implement:

Verify Payment was successful.

Calculate Rider Fee (Total Fare - Platform Fee).

Atomic Transaction:

Update RiderProfile.walletBalance (increment).

Create Transaction (Type: RIDER_EARNING).

C. Payouts Module (Withdrawals)
Trigger: When Vendor/Rider requests payout AND when Admin processes it. Location: src/riders/riders.service.ts & src/super-admin/vendors/vendors.service.ts

Phase 1: Request (Already partially in riders.service.ts)

Action: Debit Wallet immediately (Lock funds).

Ledger: Create Transaction PAYOUT_REQUESTED.

Status: PENDING.

Phase 2: Processing (Admin approves/Bank callback)

Action: Mark Payout as PAID.

Ledger: Create Transaction PAYOUT_COMPLETED.

Note: If failed, must create PAYOUT_FAILED transaction and Refund the wallet balance atomically.

D. Refunds (Disputes)
Trigger: Admin resolves a dispute with refundAmount > 0. Location: src/super-admin/dispute/dispute.service.ts

Logic:

Identify source (Vendor or Rider).

Atomic Transaction:

Decrement User/Store Wallet (if they are at fault) OR Decrement Platform Wallet (if platform absorbs cost).

Create Transaction (Type: REFUND_ISSUED).

Trigger Payment Gateway Refund (Stripe/Paystack API call).

4. Developer Task List (Checklist)
Phase 1: Order & Ride Integration
[ ] Refactor orders.service.ts: Locate the updateStatus method. Inject PrismaService. Wrap the status update and wallet increment in a $transaction.

[ ] Refactor ride.service.ts: Locate the completeRide method. Ensure riderProfile.walletBalance is updated and a Transaction record is created.

[ ] Verify Pricing: Ensure pricing.service.ts is used to calculate the exact commission split before creating the ledger entry.

Phase 2: Payouts & Wallets
[ ] Update riders.service.ts:

Modify requestPayout: Ensure it creates a Transaction row linked to the RiderPayout.

Modify processPayout: If status is FAILED, ensure the refund to wallet also creates a Transaction (Type: ADJUSTMENT or REVERSED).

[ ] Implement vendors.service.ts Payouts:

Mirror the logic from Riders. Create requestPayout and processPayout for Vendors if not already present.

Phase 3: Admin & Adjustments
[ ] Manual Wallet Adjustments:

Create an endpoint in AdminsController to manually credit/debit a user.

This must create a Transaction with type ADJUSTMENT and processedBy: adminId.

[ ] Testing:

Run an Order flow. Check Transaction table. Does balanceBefore + amount == balanceAfter?

Run a Payout flow. Ensure funds are deducted upon request, not upon completion.

Phase 4: Frontend Connection
[ ] Wallet Screens: Ensure the Mobile App/Web Dashboard fetches history from transactions table, not just orders. This gives users a "Bank Statement" view (showing deductions, payouts, and earnings in one list).

5. Critical Schema Validations
Ensure the developer strictly follows these field mappings in schema.prisma:

Context,entityType,entityId,paymentId,orderId,vendorPayoutId
Customer pays for Order,PLATFORM,NULL,Required,Required,NULL
Vendor receives money,STORE,Store.id,NULL,Required,NULL
Rider receives money,RIDER,RiderProfile.id,NULL,NULL (Use rideId),NULL
Vendor Withdraws,STORE,Store.id,NULL,NULL,Required