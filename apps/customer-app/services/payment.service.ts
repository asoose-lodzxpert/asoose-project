import { request } from "@/lib/authFetch";
import type { PaymentMethod, BankAccount, InAppTx } from "@/types/payment";

// Map frontend payment method to backend enums
const gatewayMap: Record<PaymentMethod, string> = {
  transfer: "MONNIFY",
  paystack: "PAYSTACK",
  monnify: "MONNIFY",
  flutterwave: "FLUTTERWAVE",
};

const methodMap: Record<PaymentMethod, string> = {
  transfer: "BANK_TRANSFER",
  paystack: "CARD",
  monnify: "BANK_TRANSFER",
  flutterwave: "CARD",
};

// All payment functions now require a user object for identity fields
type UserIdentity = { email: string; name: string; phone?: string };

export async function initiatePayment(
  method: PaymentMethod,
  payload: any,
  user: UserIdentity,
) {
  const gateway = gatewayMap[method];
  const mappedMethod = methodMap[method];
  const email = user.email;
  const customerName = user.name;
  const phoneNumber = user.phone;
  const amount =
    payload.amount ||
    payload.price ||
    payload.estimatedPrice ||
    payload.quote?.amount ||
    payload.quote?.price ||
    0;
  const type = payload.type || "DELIVERY";
  const orderId = payload.orderId;
  const rideId = payload.rideId;
  const deliveryId = payload.deliveryId;
  const callbackUrl = payload.callbackUrl;
  const metadata = { ...payload };

  const body = {
    amount,
    email,
    customerName,
    phoneNumber,
    gateway,
    method: mappedMethod,
    type,
    orderId,
    rideId,
    deliveryId,
    callbackUrl,
    metadata,
  };
  const { parsed } = await request("payment/initialize", {
    method: "POST",
    body: JSON.stringify(body),
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
  user: UserIdentity,
): Promise<BankAccount> {
  // Always use MONNIFY for bank transfer
  const gateway = "MONNIFY";
  const method = "BANK_TRANSFER";
  const email = user.email;
  const customerName = user.name;
  const phoneNumber = user.phone;
  const type = payload.type || "DELIVERY";
  const orderId = payload.orderId;
  const rideId = payload.rideId;
  const deliveryId = payload.deliveryId;
  const callbackUrl = payload.callbackUrl;
  const metadata = { ...payload };

  const body = {
    amount,
    email,
    customerName,
    phoneNumber,
    gateway,
    method,
    type,
    orderId,
    rideId,
    deliveryId,
    callbackUrl,
    metadata,
  };
  const { parsed } = await request("payment/initialize", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parsed;
}

export async function checkBankTransferStatus(reference: string) {
  return checkPaymentStatus(reference);
}

// In-app checkout (Paystack, Flutterwave, Monnify)
export async function openInAppCheckout(
  method: PaymentMethod,
  amount: number,
  payload: any,
  user: UserIdentity,
): Promise<InAppTx> {
  const gateway = gatewayMap[method];
  const mappedMethod = methodMap[method];
  const email = user.email;
  const customerName = user.name;
  const phoneNumber = user.phone;
  const type = payload.type || "DELIVERY";
  const orderId = payload.orderId;
  const rideId = payload.rideId;
  const deliveryId = payload.deliveryId;
  const callbackUrl = payload.callbackUrl;
  const metadata = { ...payload };

  const body = {
    amount,
    email,
    customerName,
    phoneNumber,
    gateway,
    method: mappedMethod,
    type,
    orderId,
    rideId,
    deliveryId,
    callbackUrl,
    metadata,
  };
  const { parsed } = await request("payment/initialize", {
    method: "POST",
    body: JSON.stringify(body),
  });
  // The backend should return authorizationUrl or checkoutUrl and reference/transactionId
  return {
    transactionId: parsed.reference || parsed.transactionId,
    checkoutUrl: parsed.authorizationUrl || parsed.checkoutUrl,
    amount: parsed.amount,
    method,
    status: "pending",
  };
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
