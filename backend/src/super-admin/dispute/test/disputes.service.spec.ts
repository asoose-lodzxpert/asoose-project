import { Test, TestingModule } from '@nestjs/testing';
import { DisputesService } from '../dispute.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { TransactionLedgerService } from 'src/super-admin/transactions/transaction-ledger.service';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const mockPrisma = {
  dispute: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
  transaction: { create: jest.fn() },
  store: { findUnique: jest.fn(), update: jest.fn() },
  payment: { update: jest.fn() },
};

const mockPaymentService = {
  processRefund: jest.fn(),
};

const mockLedger = {};

describe('DisputesService', () => {
  let service: DisputesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: TransactionLedgerService, useValue: mockLedger },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
    jest.clearAllMocks();
  });

  describe('resolve', () => {
    const adminId = 'admin-123';
    const disputeId = 'dispute-001';
    
    const mockOpenDispute = {
      id: disputeId,
      status: 'OPEN',
      paymentId: 'pay-123',
      orderId: 'order-123',
      openedByUserId: 'user-1',
      createdAt: new Date(),
      payment: { id: 'pay-123', amount: 1000, reference: 'ref_123' },
      order: { id: 'order-123', total: 1000, storeId: 'store-1' },
    };

    it('should successfully fully refund a buyer via Payment Gateway', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue(mockOpenDispute);
      mockPaymentService.processRefund.mockResolvedValue({ status: 'success' });
      mockPrisma.dispute.update.mockResolvedValue({ ...mockOpenDispute, status: 'RESOLVED' });

      const dto = {
        action: 'REFUND_FULL',
        resolutionNotes: 'Item missing',
        refundSource: 'PAYMENT_GATEWAY',
      };

      await service.resolve(disputeId, dto as any, adminId);

      // Assert Transaction Log Created (Wrapped in data)
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'REFUND_ISSUED',
            amount: 1000,
            entityType: 'PLATFORM', 
          }),
        }),
      );
    });

    it('should deduct from vendor wallet if source is VENDOR_WALLET', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue(mockOpenDispute);
      mockPrisma.store.findUnique.mockResolvedValue({ walletBalance: 2000 });

      const dto = {
        action: 'REFUND_FULL',
        refundAmount: 1000,
        resolutionNotes: 'Vendor fault',
        refundSource: 'VENDOR_WALLET',
      };

      await service.resolve(disputeId, dto as any, adminId);

      // Assert Adjustment Transaction (Wrapped in data)
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'ADJUSTMENT',
            amount: -1000,
            entityType: 'STORE',
          }),
        }),
      );
    });

    it('should fail if attempting to refund more than the transaction amount', async () => {
        mockPrisma.dispute.findUnique.mockResolvedValue(mockOpenDispute);
  
        const dto = {
          action: 'REFUND_PARTIAL',
          refundAmount: 5000, // Exceeds 1000
          resolutionNotes: 'Too much',
          refundSource: 'PAYMENT_GATEWAY',
        };
  
        await expect(service.resolve(disputeId, dto as any, adminId)).rejects.toThrow(
          BadRequestException,
        );
      });
  
      it('should prevent resolving an already closed dispute', async () => {
        mockPrisma.dispute.findUnique.mockResolvedValue({ ...mockOpenDispute, status: 'RESOLVED' });
  
        await expect(
          service.resolve(disputeId, { action: 'NO_ACTION', resolutionNotes: 'test' } as any, adminId),
        ).rejects.toThrow(BadRequestException);
      });

    it('should fail if vendor has insufficient funds for wallet refund', async () => {
        mockPrisma.dispute.findUnique.mockResolvedValue(mockOpenDispute);
        mockPrisma.store.findUnique.mockResolvedValue({ walletBalance: 500 }); // Insufficient
  
        const dto = {
          action: 'REFUND_FULL',
          refundAmount: 1000,
          refundSource: 'VENDOR_WALLET',
          resolutionNotes: 'Vendor fault',
        };
  
        await expect(service.resolve(disputeId, dto as any, adminId)).rejects.toThrow(
          BadRequestException,
        );
      });
  });

  describe('SLA Breach Calculation', () => {
    it('should flag URGENT disputes older than 4 hours', async () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      mockPrisma.dispute.findMany.mockResolvedValue([{ 
        id: 'd1', 
        priority: 'URGENT', 
        createdAt: fiveHoursAgo, 
        _count: { messages: 0 } 
      }]);
      mockPrisma.dispute.count.mockResolvedValue(1);

      const result = await service.findAll({ role: UserRole.SUPER_ADMIN });
      expect(result.data[0].breachedSLA).toBe(true);
    });
  });
});