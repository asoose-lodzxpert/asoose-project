import type { PackageSize } from "@/types/delivery";

export type PaymentMethod = "transfer" | "paystack" | "monnify" | "flutterwave";

export async function initiatePayment(method: PaymentMethod, payload: any) {
  // Placeholder: integrate with payment providers here.
  // For now, simulate network call and return a success object.
  await new Promise((res) => setTimeout(res, 1000));

  return {
    success: true,
    method,
    transactionId: `txn_${Date.now()}`,
    payload,
  };
}

// ------------------------------
// Mock bank-transfer & in-app checkout services
// ------------------------------

type BankAccount = {
  accountNumber: string;
  bankName: string;
  accountName: string;
  reference: string;
  amount: number;
  expiresAt: number;
  status: "pending" | "paid" | "failed";
};

type InAppTx = {
  transactionId: string;
  checkoutUrl: string;
  amount: number;
  method: PaymentMethod;
  status: "pending" | "paid" | "failed";
};

const bankStore = new Map<string, BankAccount>();
const inAppStore = new Map<string, InAppTx>();

function randomAccountNumber() {
  return Math.floor(1000000000 + Math.random() * 8999999999).toString();
}

export async function createBankTransfer(amount: number, payload: any) {
  const reference = `BTX-${Date.now()}`;
  const acct: BankAccount = {
    accountNumber: randomAccountNumber(),
    bankName: "Mock Bank",
    accountName: "Asoose Payments",
    reference,
    amount,
    expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour
    status: "pending",
  };
  bankStore.set(reference, acct);

  // Simulate the user paying after a short delay (for demo only)
  setTimeout(() => {
    const existing = bankStore.get(reference);
    if (existing) {
      existing.status = "paid";
      bankStore.set(reference, existing);
    }
  }, 8_000);

  return acct;
}

export async function checkBankTransferStatus(reference: string) {
  // simulate network latency
  await new Promise((r) => setTimeout(r, 300));
  const entry = bankStore.get(reference);
  if (!entry) return { status: "failed" as const };
  return { status: entry.status };
}

export async function openInAppCheckout(
  method: PaymentMethod,
  amount: number,
  payload: any
) {
  const transactionId = `ia_${Date.now()}`;
  const checkoutUrl = `https://mock-payments.example.com/checkout/${transactionId}`;
  const tx: InAppTx = {
    transactionId,
    checkoutUrl,
    amount,
    method,
    status: "pending",
  };
  inAppStore.set(transactionId, tx);

  // Simulate provider completing payment after a short delay
  setTimeout(() => {
    const existing = inAppStore.get(transactionId);
    if (existing) {
      existing.status = "paid";
      inAppStore.set(transactionId, existing);
    }
  }, 6_000);

  return { transactionId, checkoutUrl };
}

export async function checkInAppPaymentStatus(transactionId: string) {
  await new Promise((r) => setTimeout(r, 300));
  const entry = inAppStore.get(transactionId);
  if (!entry) return { status: "failed" as const };
  return { status: entry.status };
}
