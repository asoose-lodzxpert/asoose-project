import { ApiService } from "./api.service";

export interface WalletSummary {
  balance: number;
}

export interface WalletTopupInitialization {
  reference: string;
  authorizationUrl: string;
  amount: number;
}

export interface WalletTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  channel: string;
  status: string;
  amount: number;
  description: string;
  referenceType: string;
  referenceId: string;
  createdAt: string;
}

export interface WalletTransactionsResult {
  transactions: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class WalletService {
  static async getMyWallet(token?: string): Promise<WalletSummary> {
    const wallet = await ApiService.get<any>("/wallet/me", token);
    return { balance: Number(wallet?.balance ?? 0) };
  }

  static async initializeTopup(
    amount: number,
    token?: string,
  ): Promise<WalletTopupInitialization> {
    return ApiService.post<WalletTopupInitialization>(
      "/wallet/me/topup/initialize",
      { amount },
      token,
    );
  }

  static async getTransactions(
    page = 1,
    limit = 20,
    token?: string,
  ): Promise<WalletTransactionsResult> {
    return ApiService.get<WalletTransactionsResult>(
      `/wallet/me/transactions?page=${page}&limit=${limit}`,
      token,
    );
  }

  static async verifyTopup(reference: string, token?: string): Promise<void> {
    const result = await ApiService.post<any>(
      `/wallet/me/topup/verify/${encodeURIComponent(reference)}`,
      undefined,
      token,
    );

    // Some APIs return a 200 response with success:false for an unsuccessful
    // gateway payment. ApiService deliberately leaves that envelope intact.
    if (result?.success === false) {
      throw new Error(result.message || "Top-up payment was not successful");
    }
  }
}
