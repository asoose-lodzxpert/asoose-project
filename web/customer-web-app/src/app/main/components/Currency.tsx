import React from "react";

interface CurrencyProps {
  amount: number | string | undefined | null;
  currency?: "NGN" | "USD" | "GBP"; // Extensible for future
  className?: string;
  minimumFractionDigits?: number;
}

export const Currency = ({
  amount,
  currency = "NGN",
  className = "",
  minimumFractionDigits = 2,
}: CurrencyProps) => {
  // Safe Fallback: Handle null/undefined/NaN by defaulting to 0
  const safeAmount = Number(amount) || 0;

  // Format using Intl.NumberFormat
  const formattedValue = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: minimumFractionDigits,
  }).format(safeAmount);

  return (
    <span className={`font-mono font-bold tracking-tight ${className}`}>
      {formattedValue}
    </span>
  );
};
