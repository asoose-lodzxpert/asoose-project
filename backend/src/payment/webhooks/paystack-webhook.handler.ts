import { Injectable, Logger } from '@nestjs/common';
import { PaymentGateway } from '../interfaces/payment.interface';
import type { VerifyPaymentResponse } from '../interfaces/payment.interface';
import { ChargeSuccessHandler } from './charge-success.handler';
import { DvaAssignHandler } from './dva-assign.handler';
import { CustomerIdHandler } from './customer-id.handler';

/**
 * Routes Paystack webhook payloads to the appropriate handler based on
 * the `event` field.  Signature verification is performed upstream in
 * `PaymentService.handleWebhook()` before this handler is invoked.
 */
@Injectable()
export class PaystackWebhookHandler {
  private readonly logger = new Logger(PaystackWebhookHandler.name);

  constructor(
    private readonly chargeSuccess: ChargeSuccessHandler,
    private readonly dvaAssign: DvaAssignHandler,
    private readonly customerId: CustomerIdHandler,
  ) {}

  /**
   * Entry point called by `PaymentService.processWebhookPayload()`.
   *
   * @param payload     The parsed JSON body from Paystack.
   * @param updateStatus Callback to `PaymentStatusService.updatePaymentStatus()`
   *                     — injected to avoid a circular service dependency.
   */
  async process(
    payload: any,
    updateStatus: (v: VerifyPaymentResponse) => Promise<void>,
  ): Promise<void> {
    const event: string = payload.event;
    const data = payload.data;

    this.logger.log(`Paystack webhook event: ${event}`);

    switch (event) {
      // ── Standard card / bank payment completed ────────────────────────────
      case 'charge.success': {
        const channel: string = data?.authorization?.channel ?? '';

        if (channel === 'dedicated_nuban') {
          // DVA bank transfer — credit customer wallet
          await this.chargeSuccess.handleDVATopup(data);
        } else {
          // Regular card / pay-with-transfer (non-DVA) — update Payment record
          const reference: string = data.reference;
          const status: string = data.status;
          const amount: number = data.amount / 100;
          const paidAt = new Date(data.paid_at);

          await updateStatus({
            success: ['success', 'successful'].includes(status?.toLowerCase()),
            reference,
            amount,
            status: status as any,
            gateway: PaymentGateway.PAYSTACK,
            paidAt,
          });
        }
        break;
      }

      // ── DVA assignment outcomes ───────────────────────────────────────────
      case 'dedicatedaccount.assign.success':
      // Older event name still emitted by some Paystack accounts
      case 'assigndedicatedaccount.success': {
        await this.dvaAssign.handleDVAAssignSuccess(data);
        break;
      }

      case 'dedicatedaccount.assign.failed':
      case 'assigndedicatedaccount.failed': {
        this.logger.warn(
          `DVA assignment failed for customer ${data?.customer?.customer_code ?? 'unknown'}: ${JSON.stringify(data)}`,
        );
        await this.dvaAssign.handleDVAAssignFailed(data);
        break;
      }

      // ── Customer identity validation ──────────────────────────────────────
      case 'customeridentification.success': {
        this.customerId.handleSuccess(data);
        break;
      }

      case 'customeridentification.failed': {
        this.customerId.handleFailed(data);
        break;
      }

      default:
        this.logger.debug(`Unhandled Paystack webhook event: ${event}`);
        break;
    }
  }
}
