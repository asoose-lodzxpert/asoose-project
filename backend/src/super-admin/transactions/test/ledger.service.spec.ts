import { Test, TestingModule } from '@nestjs/testing';
import { TransactionLedgerService } from '../transaction-ledger.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  $transaction: jest.fn((cb) => cb(mockPrisma)),
  store: { findUnique: jest.fn(), update: jest.fn() },
  transaction: { create: jest.fn(), updateMany: jest.fn() },
};

describe('TransactionLedgerService', () => {
  let service: TransactionLedgerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionLedgerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TransactionLedgerService>(TransactionLedgerService);
    jest.clearAllMocks();
  });

  it('should correctly calculate commission deduction upon payout completion', async () => {
    mockPrisma.store.findUnique.mockResolvedValue({
      walletBalance: 10000,
      commissionRate: 10,
    });

    const payoutData = {
      id: 'payout-1',
      storeId: 'store-1',
      amount: 5000,
      status: 'PAID' as const,
      reference: 'REF-1',
    };

    await service.recordVendorPayout(payoutData);

    // 1. Check Commission Transaction (Wrapped in data)
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'COMMISSION_DEDUCTED',
          amount: 500,
          entityType: 'PLATFORM',
        }),
      }),
    );

    // 2. Check Net Payout Transaction (Wrapped in data)
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'PAYOUT_COMPLETED',
          amount: 4500,
          entityType: 'STORE',
        }),
      }),
    );

    // 3. Check Wallet Decrement
    expect(mockPrisma.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'store-1' },
        data: { walletBalance: { decrement: 5000 } },
      }),
    );
  });
});
