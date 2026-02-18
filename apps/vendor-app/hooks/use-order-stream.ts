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
  const failedAttemptsRef = useRef(0);

  // FIXED: Increased polling interval from 3 seconds to 15 seconds
  // This prevents 429 rate limit errors by reducing request frequency
  const POLL_INTERVAL = 15000; // Poll every 15 seconds now instead of 3 seconds
  const MAX_FAILED_ATTEMPTS = 5;

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
        `${EXPO_PUBLIC_API_URL}/vendor/orders?limit=10&status=pending,active`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 429) {
        // Rate limited - back off gracefully
        console.warn("[OrderStream] Rate limited (429), backing off");
        failedAttemptsRef.current += 1;
        if (failedAttemptsRef.current > MAX_FAILED_ATTEMPTS) {
          setError(
            "Server overloaded. Polling paused. Will retry when conditions improve.",
          );
          setIsConnected(false);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();

      // Reset failure counter on success
      failedAttemptsRef.current = 0;

      if (data.data && data.data.length > 0) {
        // Check for new orders compared to last check
        const latestOrderId = data.data[0]?.id;

        if (latestOrderId && lastOrderIdRef.current !== latestOrderId) {
          // If we had previous orders, this is a new order notification
          if (lastOrderIdRef.current !== null) {
            onNewOrder?.(data.data[0]);
          }
          lastOrderIdRef.current = latestOrderId;

          // Also check for updates to existing orders
          for (const order of data.data) {
            onOrderUpdate?.(order);
          }
        } else if (lastOrderIdRef.current === null) {
          // First connection - initialize without firing notifications
          lastOrderIdRef.current = latestOrderId;
        }
      }

      setIsConnected(true);
      setError(null);
    } catch (err: any) {
      console.error("[OrderStream] Fetch error:", err);
      failedAttemptsRef.current += 1;

      if (failedAttemptsRef.current > MAX_FAILED_ATTEMPTS) {
        setError("Failed to connect to order stream");
        setIsConnected(false);
      }
    }
  }, [getToken, enabled, onNewOrder, onOrderUpdate]);

  const connect = useCallback(async () => {
    if (!enabled) {
      cleanup();
      return;
    }

    // Initial fetch
    await fetchLatestOrders();

    // Set up polling with increased interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(fetchLatestOrders, POLL_INTERVAL);
  }, [enabled, fetchLatestOrders, cleanup]);

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
