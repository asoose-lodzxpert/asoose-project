export interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  riderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateBankAccountDto {
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface BankAccountResponse {
  bankAccount: BankAccount | null;
}
