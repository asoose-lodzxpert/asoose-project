"use client";
import { useEffect, useState } from "react";
import {
  DeliveryService,
  type ParcelLocation,
  type ParcelSize,
  type ParcelEstimate,
} from "@/services/delivery.service";

export function useParcelQuote(
  pickup: ParcelLocation | null,
  dropoff: ParcelLocation | null,
  size: ParcelSize,
  token?: string,
) {
  const key = JSON.stringify({ pickup, dropoff, size, token });
  const [result, setResult] = useState<{
    key: string;
    quote?: ParcelEstimate;
    error?: string;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ready = Boolean(pickup && dropoff && token);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    const input = JSON.parse(key);
    const timer = setTimeout(() => {
      DeliveryService.estimateParcel(
        input.pickup,
        input.dropoff,
        input.size,
        input.token,
      )
        .then((quote) => {
          if (
            ![
              quote.fare,
              quote.distanceKm,
              quote.estimatedDurationMinutes,
            ].every(
              (value) =>
                typeof value === "number" &&
                Number.isFinite(value) &&
                value >= 0,
            )
          )
            throw new Error(
              "Pricing is unavailable for this route. Please retry.",
            );
          if (active) setResult({ key, quote });
        })
        .catch((cause) => {
          if (active)
            setResult({
              key,
              error:
                cause?.message ||
                "Couldn’t load your estimate. Check your connection and retry.",
            });
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key, ready, attempt]);
  const current = ready && result?.key === key ? result : null;
  return {
    quote: current?.quote,
    error: current?.error,
    loading: ready && !current,
    retry: () => {
      setResult(null);
      setAttempt((value) => value + 1);
    },
  };
}
