import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface PaystackCustomerResult {
  customerCode: string;
  customerId: number;
  email: string;
}

export interface CustomerVirtualAccountResult {
  customerCode: string;
  dedicatedAccountId: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankSlug: string;
  currency: string;
  active: boolean;
}

export interface VendorSubaccountResult {
  subaccountCode: string;
  businessName: string;
  settlementBank: string;
  accountNumber: string;
  percentageCharge: number;
  isVerified: boolean;
}

export interface TransferRecipientResult {
  recipientCode: string;
  recipientId: number;
  name: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  currency: string;
}

export interface CreateCustomerParams {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CreateVirtualAccountParams {
  /** Paystack customer code (e.g. CUS_xxx) from createCustomer() */
  customerCode: string;
  /**
   * Bank slug for the DVA provider.
   * Use 'test-bank' in test mode.
   * Production options: 'wema-bank', 'titan-paystack', 'access-bank', etc.
   */
  preferredBank?: string;
}

export interface CreateSubaccountParams {
  businessName: string;
  /** Bank code e.g. '057' for Zenith */
  bankCode: string;
  accountNumber: string;
  /**
   * Percentage of each transaction kept by the subaccount.
   * Platform retains (100 - percentageCharge)%.
   */
  percentageCharge: number;
  description?: string;
  /** Optional primary contact email for the subaccount */
  primaryContactEmail?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
}

export interface CreateTransferRecipientParams {
  name: string;
  accountNumber: string;
  bankCode: string;
  /** Defaults to NGN */
  currency?: string;
  /** Optional description / narration */
  description?: string;
}

/**
 * PaystackAccountService
 *
 * Handles account-level Paystack operations:
 *  - Customer creation (customers that fund wallets via DVAs)
 *  - Dedicated Virtual Account provisioning (for customers wallet top-up)
 *  - Subaccount creation (for vendor split-payment settlements)
 *  - Transfer recipient creation (for rider / driver payout disbursements)
 *
 * NOTE: This service is intentionally decoupled from the domain models.
 * Callers are responsible for persisting the returned codes to the DB.
 * It is not wired to any controller yet.
 */
@Injectable()
export class PaystackAccountService {
  private readonly logger = new Logger(PaystackAccountService.name);
  private readonly http: AxiosInstance;
  private readonly dvaBank: string;

  constructor() {
    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    if (!secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY is not set');
    }

    this.http = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Resolve the preferred DVA bank:
    //   1. PAYSTACK_DVA_BANK env var (explicit override)
    //   2. 'test-bank' when using a test secret key
    //   3. 'wema-bank' as the production default
    const isTestKey = secretKey.startsWith('sk_test_');
    this.dvaBank =
      process.env.PAYSTACK_DVA_BANK ?? (isTestKey ? 'test-bank' : 'wema-bank');

    this.logger.log(`DVA preferred bank: ${this.dvaBank}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  CUSTOMER (used by: User/Customer accounts)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates a Paystack customer profile.
   * Must be called before provisioning a Dedicated Virtual Account.
   *
   * @returns customerCode  – persist to User.paystackCustomerCode
   */
  async createCustomer(
    params: CreateCustomerParams,
  ): Promise<PaystackCustomerResult> {
    try {
      const res = await this.http.post('/customer', {
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        phone: params.phone,
      });

      const data = res.data.data as any;

      this.logger.log(
        `Paystack customer created: ${data.customer_code} for ${params.email}`,
      );

      return {
        customerCode: data.customer_code,
        customerId: data.id,
        email: data.email,
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to create Paystack customer: ${msg}`);
      throw new BadRequestException(
        `Could not create Paystack customer: ${msg}`,
      );
    }
  }

  /**
   * Fetches an existing Paystack customer by email.
   * Returns null if the customer does not exist on Paystack.
   */
  async fetchCustomerByEmail(
    email: string,
  ): Promise<PaystackCustomerResult | null> {
    try {
      const res = await this.http.get(`/customer/${email}`);
      const data = res.data.data as any;

      return {
        customerCode: data.customer_code,
        customerId: data.id,
        email: data.email,
      };
    } catch (error) {
      if (error.response?.status === 404) return null;
      const msg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to fetch Paystack customer: ${msg}`);
      throw new BadRequestException(
        `Could not fetch Paystack customer: ${msg}`,
      );
    }
  }

  /**
   * Idempotent helper: returns existing Paystack customer or creates a new one.
   */
  async getOrCreateCustomer(
    params: CreateCustomerParams,
  ): Promise<PaystackCustomerResult> {
    const existing = await this.fetchCustomerByEmail(params.email);
    if (existing) return existing;
    return this.createCustomer(params);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  DEDICATED VIRTUAL ACCOUNT (used by: Customer wallet top-up)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Provisions a Dedicated Virtual Account (DVA) for a Paystack customer.
   * The customer can transfer funds to this account number to top up their wallet.
   *
   * Steps:
   *  1. Call createCustomer() (or getOrCreateCustomer()) to get customerCode.
   *  2. Call this method with that customerCode.
   *
   * @returns account details – persist accountNumber + bankName to your DB.
   */
  async createCustomerVirtualAccount(
    params: CreateVirtualAccountParams,
  ): Promise<CustomerVirtualAccountResult> {
    try {
      const res = await this.http.post('/dedicated_account', {
        customer: params.customerCode,
        preferred_bank: params.preferredBank ?? this.dvaBank,
      });

      const data = res.data.data as any;

      this.logger.log(
        `DVA provisioned for customer ${params.customerCode}: ${data.dedicated_account?.account_number} (bank: ${params.preferredBank ?? this.dvaBank})`,
      );

      const account = data.dedicated_account ?? data;

      return {
        customerCode: params.customerCode,
        dedicatedAccountId: account.id,
        accountName: account.account_name,
        accountNumber: account.account_number,
        bankName: account.bank?.name ?? '',
        bankSlug: account.bank?.slug ?? '',
        currency: data.currency ?? 'NGN',
        active: account.active ?? true,
      };
    } catch (error) {
      const msg: string = error.response?.data?.message || error.message;
      this.logger.error(`Failed to create Paystack DVA: ${msg}`);

      // Give developers a clear action when DVA is not enabled on the account
      if (msg.toLowerCase().includes('not available')) {
        throw new BadRequestException(
          'Dedicated Virtual Accounts are not enabled on this Paystack account. ' +
            'Go to Paystack Dashboard → Settings → Preferences and enable "Dedicated NUBAN". ' +
            'In test mode use bank slug "test-bank"; set PAYSTACK_DVA_BANK env var for production.',
        );
      }

      throw new BadRequestException(
        `Could not provision dedicated virtual account: ${msg}`,
      );
    }
  }

  /**
   * Full flow convenience method: creates (or fetches) a Paystack customer
   * and then provisions a Dedicated Virtual Account for them.
   *
   * Use this when onboarding a new customer who needs a wallet top-up account.
   */
  async provisionCustomerWalletAccount(params: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    preferredBank?: string;
  }): Promise<{
    customer: PaystackCustomerResult;
    virtualAccount: CustomerVirtualAccountResult;
  }> {
    const customer = await this.getOrCreateCustomer({
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone,
    });

    const virtualAccount = await this.createCustomerVirtualAccount({
      customerCode: customer.customerCode,
      preferredBank: params.preferredBank,
    });

    return { customer, virtualAccount };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  SUBACCOUNT (used by: Vendors / Stores — split payment settlement)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates a Paystack subaccount for a vendor/store.
   * When a customer pays for an order, Paystack automatically splits the
   * settlement and sends `percentageCharge`% to the vendor's bank account.
   *
   * @returns subaccountCode – persist to Store.paystackSubaccountCode
   */
  async createVendorSubaccount(
    params: CreateSubaccountParams,
  ): Promise<VendorSubaccountResult> {
    try {
      const res = await this.http.post('/subaccount', {
        business_name: params.businessName,
        bank_code: params.bankCode,
        account_number: params.accountNumber,
        percentage_charge: params.percentageCharge,
        description: params.description,
        primary_contact_email: params.primaryContactEmail,
        primary_contact_name: params.primaryContactName,
        primary_contact_phone: params.primaryContactPhone,
      });

      const data = res.data.data as any;

      this.logger.log(
        `Paystack subaccount created: ${data.subaccount_code} for ${params.businessName}`,
      );

      return {
        subaccountCode: data.subaccount_code,
        businessName: data.business_name,
        settlementBank: data.settlement_bank,
        accountNumber: data.account_number,
        percentageCharge: data.percentage_charge,
        isVerified: data.is_verified ?? false,
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to create Paystack subaccount: ${msg}`);
      throw new BadRequestException(
        `Could not create vendor subaccount: ${msg}`,
      );
    }
  }

  /**
   * Updates an existing Paystack subaccount (e.g., after bank account change).
   *
   * @param subaccountCode  The CUS_xxx / ACCT_xxx code to update
   */
  async updateVendorSubaccount(
    subaccountCode: string,
    params: Partial<CreateSubaccountParams>,
  ): Promise<VendorSubaccountResult> {
    try {
      const res = await this.http.put(`/subaccount/${subaccountCode}`, {
        ...(params.businessName && { business_name: params.businessName }),
        ...(params.bankCode && { settlement_bank: params.bankCode }),
        ...(params.accountNumber && { account_number: params.accountNumber }),
        ...(params.percentageCharge !== undefined && {
          percentage_charge: params.percentageCharge,
        }),
        ...(params.description && { description: params.description }),
      });

      const data = res.data.data as any;

      return {
        subaccountCode: data.subaccount_code,
        businessName: data.business_name,
        settlementBank: data.settlement_bank,
        accountNumber: data.account_number,
        percentageCharge: data.percentage_charge,
        isVerified: data.is_verified ?? false,
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to update Paystack subaccount: ${msg}`);
      throw new BadRequestException(
        `Could not update vendor subaccount: ${msg}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  TRANSFER RECIPIENT (used by: Riders + Drivers — payout disbursements)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates a Paystack transfer recipient for a rider or driver.
   * The returned recipientCode is used when calling initiateTransfer().
   *
   * @returns recipientCode – persist to BankAccount.paystackRecipientCode
   */
  async createRiderTransferRecipient(
    params: CreateTransferRecipientParams,
  ): Promise<TransferRecipientResult> {
    return this.createTransferRecipient(params);
  }

  /**
   * Alias for driver accounts (role: DRIVER on the Rider model).
   * Identical behaviour — kept separate for semantic clarity.
   */
  async createDriverTransferRecipient(
    params: CreateTransferRecipientParams,
  ): Promise<TransferRecipientResult> {
    return this.createTransferRecipient(params);
  }

  /**
   * Creates a Paystack transfer recipient for a vendor (manual payout path).
   * Use this when a vendor requests a manual withdrawal rather than an
   * automatic split-payment subaccount settlement.
   */
  async createVendorTransferRecipient(
    params: CreateTransferRecipientParams,
  ): Promise<TransferRecipientResult> {
    return this.createTransferRecipient(params);
  }

  /**
   * Validates that a bank account number belongs to the given bank before
   * creating any recipient or subaccount.
   *
   * @returns `{ accountName, accountNumber }` on success
   */
  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string; accountNumber: string }> {
    try {
      const res = await this.http.get('/bank/resolve', {
        params: { account_number: accountNumber, bank_code: bankCode },
      });

      const data = res.data.data as any;

      return {
        accountName: data.account_name,
        accountNumber: data.account_number,
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to resolve bank account: ${msg}`);
      throw new BadRequestException(`Could not resolve account number: ${msg}`);
    }
  }

  /**
   * Fetches the list of supported banks from Paystack.
   * Useful for populating a bank picker in the frontend.
   */
  async listBanks(
    country = 'nigeria',
  ): Promise<Array<{ name: string; code: string; slug: string }>> {
    try {
      const res = await this.http.get('/bank', {
        params: { country, use_cursor: false, perPage: 200 },
      });

      return (res.data.data as any[]).map((b) => ({
        name: b.name,
        code: b.code,
        slug: b.slug,
      }));
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to list Paystack banks: ${msg}`);
      throw new BadRequestException(`Could not fetch bank list: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async createTransferRecipient(
    params: CreateTransferRecipientParams,
  ): Promise<TransferRecipientResult> {
    try {
      const res = await this.http.post('/transferrecipient', {
        type: 'nuban',
        name: params.name,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: params.currency ?? 'NGN',
        description: params.description,
      });

      const data = res.data.data as any;

      this.logger.log(
        `Transfer recipient created: ${data.recipient_code} for ${params.name}`,
      );

      return {
        recipientCode: data.recipient_code,
        recipientId: data.id,
        name: data.details?.account_name ?? params.name,
        accountNumber: data.details?.account_number ?? params.accountNumber,
        bankCode: data.details?.bank_code ?? params.bankCode,
        bankName: data.details?.bank_name ?? '',
        currency: data.currency,
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      this.logger.error(`Failed to create transfer recipient: ${msg}`);
      throw new BadRequestException(
        `Could not create transfer recipient: ${msg}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  TRANSACTION HISTORY  (DVA top-ups for a customer)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lists Paystack transactions for a customer, filtered to DVA top-up credits
   * (channel === 'dedicated_nuban').  Used to build the customer wallet history.
   *
   * @param customerCode  Paystack customer code (CUS_xxx)
   * @param page          1-based page number
   * @param perPage       Results per page (max 100)
   */
  async listCustomerDVATopups(
    customerCode: string,
    page = 1,
    perPage = 50,
  ): Promise<
    Array<{
      id: number;
      reference: string;
      amount: number; // in kobo — divide by 100
      status: string;
      channel: string;
      paidAt: string;
      createdAt: string;
    }>
  > {
    try {
      const res = await this.http.get('/transaction', {
        params: { customer: customerCode, perPage, page },
      });

      if (!res.data.status) return [];

      const all: any[] = res.data.data ?? [];

      // Only return DVA credits (wallet top-ups)
      return all
        .filter((tx) => tx.channel === 'dedicated_nuban')
        .map((tx) => ({
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount, // kobo
          status: tx.status,
          channel: tx.channel,
          paidAt: tx.paid_at,
          createdAt: tx.created_at,
        }));
    } catch (error) {
      this.logger.warn(
        `listCustomerDVATopups failed for ${customerCode}: ${error.message}`,
      );
      return [];
    }
  }
}
