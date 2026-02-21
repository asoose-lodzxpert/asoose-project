import { Injectable, Logger } from '@nestjs/common';

/**
 * Handles Paystack customer identification webhook events:
 * - `customeridentification.success`
 * - `customeridentification.failed`
 *
 * These events confirm whether Paystack was able to verify the identity of a
 * customer (required for some business categories / higher transaction limits).
 */
@Injectable()
export class CustomerIdHandler {
  private readonly logger = new Logger(CustomerIdHandler.name);

  handleSuccess(data: any): void {
    this.logger.log(
      `Customer identity validated: ${data?.customer_code ?? data?.email}`,
    );
    // Future: update a verified flag on the user record if needed
  }

  handleFailed(data: any): void {
    this.logger.warn(
      `Customer identity validation failed for ${data?.customer_code ?? data?.email}: ${data?.reason}`,
    );
    // Future: notify user or flag account for review
  }
}
