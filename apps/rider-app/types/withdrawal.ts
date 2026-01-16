export interface BankAccountInfo {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export interface WithdrawalInfo {
  balance: number;
  minWithdrawal: number;
  bankAccount: BankAccountInfo | null;
}

export interface CreateWithdrawalDto {
  amount: number;
  bankAccountId: string;
}

export interface WithdrawalTransaction {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "FAILED";
  bankAccount: BankAccountInfo;
  createdAt: string;
  processedAt?: string;
}

export interface WithdrawalResponse {
  message: string;
  withdrawal: WithdrawalTransaction;
}

export interface SystemSettings {
  minWithdrawal: number;
  maxWithdrawal: number;
  withdrawalFee: number;
  withdrawalFeePercentage: number;
}
