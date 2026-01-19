import { useEffect, useRef, useState, useCallback } from "react";
import EventSource from "react-native-sse";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000; // 3 seconds

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(async () => {
    const authToken = await getToken();

    if (!authToken || !enabled) {
      return;
    }

    if (eventSourceRef.current) {
      return;
    }

    const url = `${API_URL}/vendor/orders/stream`;

    try {
      const es = new EventSource(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        pollingInterval: 0, // Disable polling, use pure SSE
      });

      // Connection opened
      es.addEventListener("open", () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      });

      // New order created (use 'message' event with type checking)
      es.addEventListener("message", (event: any) => {
        try {
          // Check if this is an order.created or order.updated event
          const eventType = event.type || "order.created";
          const orderData: OrderStreamEvent = JSON.parse(event.data);

          if (eventType === "order.created" || !event.type) {
            onNewOrder?.(orderData);
          } else if (eventType === "order.updated") {
            onOrderUpdate?.(orderData);
          }
        } catch (err) {
          // Silent fail
        }
      });

      // Connection error
      es.addEventListener("error", (event: any) => {
        setIsConnected(false);
        setError("Connection lost");

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay =
            RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);

          reconnectTimeoutRef.current = setTimeout(() => {
            cleanup();
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          setError("Failed to connect. Using fallback polling.");
          cleanup();
        }
      });

      // Connection closed
      es.addEventListener("close", () => {
        setIsConnected(false);
      });

      eventSourceRef.current = es;
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      setIsConnected(false);
    }
  }, [getToken, enabled, onNewOrder, onOrderUpdate, cleanup]);

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
