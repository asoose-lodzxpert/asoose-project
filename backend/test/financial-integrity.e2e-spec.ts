import { Test, TestingModule } from '@nestjs/testing';
import { RidersService } from '../src/riders/riders.service';
import { PaymentService } from '../src/payment/payment.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TransactionLedgerService } from '../src/super-admin/transactions/transaction-ledger.service';
import { CreateWithdrawalDto } from '../src/riders/dto/create-withdrawal.dto';
import { StoreType } from '@prisma/client';

describe('Financial Integrity & Critical Paths', () => {
  let ridersService: RidersService;
  let paymentService: PaymentService;
  let prisma: PrismaService;
  let ledgerService: TransactionLedgerService;

  // Track created record IDs for guaranteed cleanup
  const createdRiderIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdVendorIds: string[] = [];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        RidersService,
        PaymentService,
        PrismaService,
        TransactionLedgerService,
        {
          provide: 'RidersStreamService',
          useValue: { emitDeliveryUpdate: jest.fn() },
        },
        { provide: 'NotificationsService', useValue: { create: jest.fn() } },
        { provide: 'PaystackService', useValue: { verifyPayment: jest.fn() } },
        { provide: 'FlutterwaveService', useValue: {} },
        { provide: 'MonnifyService', useValue: {} },
        {
          provide: 'TripsService',
          useValue: { startDeliveryMatching: jest.fn() },
        },
      ],
    }).compile();

    ridersService = module.get<RidersService>(RidersService);
    paymentService = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
    ledgerService = module.get<TransactionLedgerService>(
      TransactionLedgerService,
    );
  });

  describe('Race Condition: Concurrent Withdrawals', () => {
    it('should prevent double-spending when multiple withdrawals happen simultaneously', async () => {
      // 1. Setup: Create a rider with correct fields
      const rider = await prisma.rider.create({
        // tracked for afterAll cleanup
        data: {
          name: 'Race Condition Tester',
          email: `race-${Date.now()}@test.com`,
          phone: `+234${Date.now()}`,
          password: 'securePassword123',
          countryCode: '+234',
          walletBalance: 5000,
          status: 'ACTIVE',
          bankAccount: {
            create: {
              bankName: 'Test Bank',
              accountNumber: '1234567890',
              accountName: 'Tester',
              bankCode: '000',
            },
          },
        },
        include: { bankAccount: true },
      });
      createdRiderIds.push(rider.id);

      const withdrawalDto: CreateWithdrawalDto = {
        amount: 5000,
        bankAccountId: rider.bankAccount!.id,
      };

      // 2. Execute: Fire 10 withdrawal requests simultaneously
      const requests = Array(10)
        .fill(null)
        .map(() =>
          ridersService
            .requestWithdrawal(rider.id, withdrawalDto)
            .catch((e) => e),
        );

      await Promise.all(requests);

      // 3. Assert
      const finalRiderState = await prisma.rider.findUnique({
        where: { id: rider.id },
      });
      const successfulWithdrawals = await prisma.riderPayout.count({
        where: { riderId: rider.id },
      });

      console.log(`Final Balance: ${finalRiderState?.walletBalance}`);
      console.log(`Successful Withdrawals: ${successfulWithdrawals}`);

      expect(finalRiderState?.walletBalance).toBeGreaterThanOrEqual(0);
      expect(successfulWithdrawals).toBe(1);
    });
  });

  describe('Data Integrity: Ledger Desync', () => {
    it('should fail or rollback if Ledger recording fails after Payment commit', async () => {
      // 1. Setup: Mock Ledger to throw error
      jest
        .spyOn(ledgerService, 'recordPayment')
        .mockRejectedValue(new Error('Ledger Down'));

      // 1a. Create Prerequisites
      const user = await prisma.user.create({
        data: {
          email: `ledger-test-${Date.now()}@test.com`,
          // tracked for afterAll cleanup
          name: 'Ledger Tester',
          phone: `+23490${Date.now()}`,
          password: 'hashed_password',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
        },
      });
      createdUserIds.push(user.id);

      const vendor = await prisma.vendor.create({
        data: {
          email: `vendor-${Date.now()}@test.com`,
          name: 'Test Vendor',
          phone: `+23480${Date.now()}`,
          countryCode: '+234',
          password: 'pass',
          businessType: 'Retail',
          employees: '1-10',
          store: {
            create: {
              name: 'Test Store',
              slug: `test-store-${Date.now()}`,
              type: StoreType.RESTAURANT,
              // FIX: Combined city/state into address, removed invalid 'deliveryTimeMin'
              address: '123 Test St, Maiduguri, Borno',
              prepTime: 30,
              isOpen: true,
            },
          },
        },
        include: { store: true },
      });
      createdVendorIds.push(vendor.id);

      // Ensure store was created before accessing it
      if (!vendor.store) throw new Error('Store creation failed');

      const order = await prisma.order.create({
        data: {
          userId: user.id,
          storeId: vendor.store.id,
          total: 1000,
          // FIX: Removed 'subtotal', 'deliveryFee', 'serviceFee' (not in schema)
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
      });

      // 1b. Create Payment
      const payment = await prisma.payment.create({
        data: {
          reference: `REF-${Date.now()}`,
          amount: 1000,
          gateway: 'PAYSTACK',
          method: 'CARD',
          status: 'PENDING',
          userId: user.id,
          customerEmail: user.email,
          orderId: order.id,
          metadata: {},
        },
      });

      const verificationResponse = {
        reference: payment.reference,
        amount: 1000,
        status: 'SUCCESS',
        gateway: 'PAYSTACK',
        success: true,
      };

      // 2. Execute
      try {
        await paymentService['updatePaymentStatus'](
          verificationResponse as any,
        );
      } catch (e) {
        // Expected error from Ledger mock
      }

      // 3. Assert
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      const isConsistent =
        updatedPayment?.status !== 'COMPLETED' ||
        (updatedPayment?.metadata as any)?.ledgerStatus ===
          'FAILED_NEEDS_RECONCILIATION';

      if (!isConsistent) {
        throw new Error(
          'SYSTEM FAILURE: Payment marked COMPLETED despite Ledger failure.',
        );
      }
    });
  });

  afterAll(async () => {
    // Clean up all records created during tests in dependency order
    await prisma.payment.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: createdUserIds } } },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.riderPayout.deleteMany({
      where: { riderId: { in: createdRiderIds } },
    });
    await prisma.rider.deleteMany({ where: { id: { in: createdRiderIds } } });
    await prisma.store.deleteMany({
      where: { vendorId: { in: createdVendorIds } },
    });
    await prisma.vendor.deleteMany({ where: { id: { in: createdVendorIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });
});
