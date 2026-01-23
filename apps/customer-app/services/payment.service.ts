import { request } from "@/lib/authFetch";
import type { PaymentMethod, BankAccount, InAppTx } from "@/types/payment";

export async function initiatePayment(method: PaymentMethod, payload: any) {
  const { parsed } = await request("payment/initialize", {
    method: "POST",
    body: JSON.stringify({ ...payload, method }),
  });
  return parsed;
}

export async function checkPaymentStatus(reference: string) {
  const { parsed } = await request(
    `payment/verify?reference=${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
  return parsed;
}

// Bank transfer support (real backend)
export async function createBankTransfer(
  amount: number,
  payload: any,
): Promise<BankAccount> {
  const { parsed } = await request("payment/initialize", {
    method: "POST",
    body: JSON.stringify({ ...payload, method: "transfer", amount }),
  });
  return parsed;
}

export async function checkBankTransferStatus(reference: string) {
  return checkPaymentStatus(reference);
}

// In-app checkout (if supported by backend, otherwise remove)
export async function openInAppCheckout(
  method: PaymentMethod,
  amount: number,
  payload: any,
): Promise<InAppTx> {
  // If backend supports, implement here. Otherwise, remove this function.
  throw new Error("In-app checkout is not implemented on backend");
}

// Checks the payment status for a given transactionId using the backend
export async function checkInAppPaymentStatus(transactionId: string) {
  // Try all gateways if needed, but default to Paystack for now
  // You may want to pass the gateway if you support multiple
  const gateways = ["PAYSTACK", "FLUTTERWAVE", "MONNIFY"];
  for (const gateway of gateways) {
    try {
      const res = await request(
        "payment/verify?reference=" +
          encodeURIComponent(transactionId) +
          "&gateway=" +
          gateway,
      );
      if (
        res &&
        (res.status === "SUCCESS" || res.status === "PAID" || res.success)
      ) {
        return { status: "paid", ...res };
      }
      if (res && (res.status === "PENDING" || res.status === "pending")) {
        return { status: "pending", ...res };
      }
    } catch (e) {
      // Try next gateway
    }
  }
  return { status: "pending" };
}
