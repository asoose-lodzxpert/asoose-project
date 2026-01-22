import { useAuth } from "@/context/AuthContext";
import { useCallback, useEffect, useRef, useState } from "react";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface OrderStreamEvent {
  id: string;
  status: string;
  total: number;
  customerName: string;
  customerEmail: string;
  storeName: string;
  itemCount: number;
  createdAt: string;
}

interface UseOrderStreamOptions {
  onNewOrder?: (order: OrderStreamEvent) => void;
  onOrderUpdate?: (order: OrderStreamEvent) => void;
  enabled?: boolean; // Allow disabling SSE (e.g., on history tab)
}

export function useOrderStream(options: UseOrderStreamOptions = {}) {
  const { onNewOrder, onOrderUpdate, enabled = true } = options;
  const { getToken } = useAuth();
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const lastOrderIdRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const POLL_INTERVAL = 3000; // Poll every 3 seconds

  const cleanup = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const fetchLatestOrders = useCallback(async () => {
    try {
      const authToken = await getToken();
      if (!authToken || !enabled) {
        return;
      }

      const response = await fetch(
        `${EXPO_PUBLIC_API_URL}/vendor/orders?limit=1&status=pending`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();

      if (data.orders && data.orders.length > 0) {
        const latestOrder = data.orders[0];

        // Check if this is a new order
        if (lastOrderIdRef.current !== latestOrder.id) {
          // First time or new order detected
          if (lastOrderIdRef.current !== null) {
            onNewOrder?.(latestOrder);
          }
          lastOrderIdRef.current = latestOrder.id;
        }
      }

      setIsConnected(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch orders");
      setIsConnected(false);
    }
  }, [getToken, enabled, onNewOrder]);

  const connect = useCallback(async () => {
    if (!enabled) {
      return;
    }

    // Initial fetch
    await fetchLatestOrders();

    // Set up polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(fetchLatestOrders, POLL_INTERVAL);
  }, [enabled, fetchLatestOrders]);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return {
    isConnected,
    error,
    reconnect: connect,
  };
}
