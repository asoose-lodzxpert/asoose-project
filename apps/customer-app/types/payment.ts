export type PaymentMethod = "transfer" | "paystack" | "monnify" | "flutterwave";

export type BankAccount = {
  accountNumber: string;
  bankName: string;
  accountName: string;
  reference: string;
  amount: number;
  expiresAt: number;
  status: "pending" | "paid" | "failed";
};

export type InAppTx = {
  transactionId: string;
  checkoutUrl: string;
  amount: number;
  method: PaymentMethod;
  status: "pending" | "paid" | "failed";
};
