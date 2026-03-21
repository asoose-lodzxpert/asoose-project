import { Test, TestingModule } from '@nestjs/testing';
import { PayoutsService } from '../payouts.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { BadRequestException } from '@nestjs/common';
import { PayoutStatus } from '@prisma/client';
import { TransactionLedgerService } from 'src/super-admin/transactions/transaction-ledger.service';
import { ActivityLogService } from 'src/common/services/activity-log.services';
import { AdminNotificationsService } from 'src/admin/notifications/admin-notifications.service';
const mockPrisma = {
  $transaction: jest.fn((callback) => callback(mockPrisma)), // Mock automatic transaction execution
  vendorPayout: { findUnique: jest.fn(), update: jest.fn() },
  riderPayout: { findUnique: jest.fn(), update: jest.fn() },
  bankAccount: {
    findUnique: jest.fn().mockResolvedValue({
      accountNumber: '0123456789',
      bankCode: '058',
      accountName: 'Test Vendor',
    }),
  },
};

const mockPaymentService = {
  disbursePayment: jest.fn(),
};

const mockLedger = {
  recordVendorPayout: jest.fn(),
  recordRiderPayout: jest.fn(),
  finalizePayout: jest.fn(),
};

describe('PayoutsService', () => {
  let service: PayoutsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: TransactionLedgerService, useValue: mockLedger },
        {
          provide: ActivityLogService,
          useValue: { log: jest.fn(), record: jest.fn() },
        },
        {
          provide: AdminNotificationsService,
          useValue: { notify: jest.fn(), sendPayoutNotification: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
    jest.clearAllMocks();
  });

  describe('approvePayout', () => {
    const adminId = 'admin-1';
    const payoutId = 'payout-123';

    const mockVendorPayout = {
      id: payoutId,
      amount: 5000,
      status: PayoutStatus.PENDING,
      store: { vendorId: 'vendor-1' },
      bankAccountId: 'bank-acc-1',
    };

    it('should successfully approve a pending payout', async () => {
      mockPrisma.vendorPayout.findUnique.mockResolvedValue(mockVendorPayout);
      mockPaymentService.disbursePayment.mockResolvedValue({
        success: true,
        reference: 'REF-BANK-1',
      });
      mockPrisma.vendorPayout.update.mockResolvedValue({
        ...mockVendorPayout,
        status: PayoutStatus.PAID,
      });

      await service.approvePayout(payoutId, 'VENDOR', adminId);

      // 1. Assert Bank Transfer Initiated
      expect(mockPaymentService.disbursePayment).toHaveBeenCalled();

      // 2. Assert DB Status Update
      expect(mockPrisma.vendorPayout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: payoutId },
          data: expect.objectContaining({ status: PayoutStatus.PAID }),
        }),
      );

      // 3. Assert Ledger Record
      expect(mockLedger.finalizePayout).toHaveBeenCalledWith(
        payoutId,
        'COMPLETED',
      );
    });

    it('should fail idempotency check if payout is not PENDING', async () => {
      mockPrisma.vendorPayout.findUnique.mockResolvedValue({
        ...mockVendorPayout,
        status: PayoutStatus.PAID, // Already Paid
      });

      await expect(
        service.approvePayout(payoutId, 'VENDOR', adminId),
      ).rejects.toThrow(
        BadRequestException, // "Action denied: Payout is already PAID"
      );

      expect(mockPaymentService.disbursePayment).not.toHaveBeenCalled();
    });

    it('should handle bank failure safely without double-updating ledger', async () => {
      mockPrisma.vendorPayout.findUnique.mockResolvedValue(mockVendorPayout);
      // Simulate Bank Failure
      mockPaymentService.disbursePayment.mockResolvedValue({
        success: false,
        status: 'Insufficient Funds',
      });

      // Service marks as FAILED and returns gracefully (does not throw)
      const result = await service.approvePayout(payoutId, 'VENDOR', adminId);
      expect(result).toMatchObject({ status: 'FAILED' });

      // Ensure we NEVER updated the status to PAID
      expect(mockPrisma.vendorPayout.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PayoutStatus.PAID }),
        }),
      );
      expect(mockLedger.recordVendorPayout).not.toHaveBeenCalled();
    });
  });
});
