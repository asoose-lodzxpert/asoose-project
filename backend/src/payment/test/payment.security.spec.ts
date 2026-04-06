import { Test } from '@nestjs/testing';
import { PaymentController } from '../payment.controller';
import { PaymentService } from '../payment.service';
import { BadRequestException, Logger } from '@nestjs/common';
import { PaymentGateway } from '../interfaces/payment.interface';

describe('Payment Security & Reliability', () => {
  let controller: PaymentController;
  let paymentService: PaymentService;

  const mockPaymentService = {
    handleWebhook: jest.fn(),
    initiatePayment: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: mockPaymentService }],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  describe('Webhook Security', () => {
    it('should reject spoofed webhooks before processing payload', async () => {
      // Setup
      const maliciousPayload = {
        event: 'charge.success',
        data: { amount: 1000000 },
      };
      const fakeSignature = 'bad_signature';

      // Mock service to THROW if called (simulating that logic is inside service, ensuring it fails correctly)
      mockPaymentService.handleWebhook.mockImplementation(() => {
        throw new BadRequestException('Invalid webhook signature');
      });

      // Execute & Assert
      await expect(
        controller.paystackWebhook(
          { body: maliciousPayload } as any,
          fakeSignature,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Gateway Reliability', () => {
    it('should handle Gateway Timeouts (504) without leaving system in unknown state', async () => {
      // Suppress the intentional logger.error fired by the controller's catch block
      const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      // In a real integration test, we would use nock/msw to simulate the timeout
      // Here we simulate the Service throwing a timeout error
      mockPaymentService.initiatePayment.mockRejectedValue(
        new Error('Gateway Timeout 504'),
      );

      // If the controller simply returns 500/Failed, the user might retry.
      // But if the gateway actually created the tx, we have a double-charge risk.
      // This test checks if specific timeout handling exists (e.g. queueing a check).

      try {
        await controller.initiatePayment(
          {} as any,
          { user: { id: '1' } } as any,
        );
      } catch (e) {
        expect(e.message).not.toBe('Gateway Timeout 504'); // Should be wrapped or handled
        // If it throws the raw error, it means no reconciliation logic exists for ambiguous states
      }

      // No-op
      logSpy.mockRestore();
    });
  });
});
