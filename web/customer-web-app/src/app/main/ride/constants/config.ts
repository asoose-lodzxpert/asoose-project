import { CreditCard, Banknote, Smartphone } from "lucide-react";

export const PAYMENT_METHODS = [
  {
    id: "paystack",
    label: "Paystack",
    type: "CARD",
    gateway: "PAYSTACK",
    icon: CreditCard,
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    type: "CARD",
    gateway: "FLUTTERWAVE",
    icon: Smartphone,
  },
  // FIX: Uncommented Cash to enable the logic in page.tsx
  { id: 'cash', label: 'Cash', type: 'CASH', gateway: null, icon: Banknote },
];

export const RIDE_OPTIONS = ["Standard", "Premium", "XL"] as const;