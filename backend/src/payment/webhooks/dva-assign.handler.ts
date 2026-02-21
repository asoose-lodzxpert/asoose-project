import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Handles DVA (Dedicated Virtual Account) assignment webhook events:
 * - `dedicatedaccount.assign.success`
 * - `dedicatedaccount.assign.failed`
 */
@Injectable()
export class DvaAssignHandler {
  private readonly logger = new Logger(DvaAssignHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Persists the DVA account number and bank received via the async
   * `dedicatedaccount.assign.success` webhook.
   */
  async handleDVAAssignSuccess(data: any): Promise<void> {
    // Payload structure differs slightly between event versions
    const accountNumber: string =
      data?.account?.account_number ??
      data?.dedicated_account?.account_number ??
      data?.account_number;

    const bankName: string =
      data?.account?.bank?.name ??
      data?.dedicated_account?.bank?.name ??
      data?.bank?.name ??
      '';

    const customerEmail: string = data?.customer?.email ?? data?.email ?? '';

    const customerCode: string = data?.customer?.customer_code ?? '';

    if (!accountNumber) {
      this.logger.warn(
        `dedicatedaccount.assign.success: no account_number in payload: ${JSON.stringify(data)}`,
      );
      return;
    }

    // Find the user by email (most reliable identifier in the webhook)
    let user: { id: string } | null = null;
    if (customerEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: customerEmail },
        select: { id: true },
      });
    }

    if (!user) {
      this.logger.warn(
        `dedicatedaccount.assign.success: no user found for email=${customerEmail} code=${customerCode}`,
      );
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        dedicatedVirtualAccountNumber: accountNumber,
        dedicatedVirtualAccountBank: bankName,
        ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
      },
    });

    this.logger.log(
      `DVA provisioned for user ${user.id}: ${accountNumber} @ ${bankName}`,
    );

    // Notify user
    try {
      await this.notificationsService.create({
        userId: user.id,
        title: 'Wallet Ready',
        message: `Your Asoose wallet is ready! Account: ${accountNumber} (${bankName})`,
        type: 'WALLET',
        metadata: { accountNumber, bankName },
      });
    } catch (err) {
      this.logger.warn(`Could not send DVA ready notification: ${err.message}`);
    }
  }

  async handleDVAAssignFailed(data: any): Promise<void> {
    const customerEmail: string = data?.customer?.email ?? data?.email ?? '';
    if (!customerEmail) return;

    const user = await this.prisma.user.findUnique({
      where: { email: customerEmail },
      select: { id: true },
    });
    if (!user) return;

    try {
      await this.notificationsService.create({
        userId: user.id,
        title: 'Wallet Setup Failed',
        message:
          'We could not set up your wallet account. Please try again or contact support.',
        type: 'WALLET',
        metadata: { reason: data?.reason },
      });
    } catch (err) {
      this.logger.warn(
        `Could not send DVA failed notification: ${err.message}`,
      );
    }
  }
}
