import { CreditCard } from "lucide-react";

export const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Paystack",
    icon: CreditCard,
    gateway: "PAYSTACK",
    type: "CARD" as const,
  },
] as const;

export const DEFAULT_PAYMENT_METHOD = PAYMENT_METHODS[0];
