import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface RiderEventData {
  type: string;
  data: any;
}

interface UseRiderEventsOptions {
  onDeliveryAssigned?: (data: any) => void;
  onDeliveryUpdated?: (data: any) => void;
  onDeliveryCancelled?: (data: any) => void;
  onRideAssigned?: (data: any) => void;
  onRideUpdated?: (data: any) => void;
  onRideCancelled?: (data: any) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useRiderEvents(options: UseRiderEventsOptions) {
  const {
    onDeliveryAssigned,
    onDeliveryUpdated,
    onDeliveryCancelled,
    onRideAssigned,
    onRideUpdated,
    onRideCancelled,
    onError,
    enabled = true,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000;

  const connect = useCallback(async () => {
    if (!enabled) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        return;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      if (Platform.OS === "web") {
        const EventSource = (await import("eventsource")).default;
        const url = `${API_URL}/riders/stream`;

        eventSourceRef.current = new EventSource(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }) as any;
      } else {
        const RNEventSource = (await import("react-native-sse")).default;
        const url = `${API_URL}/riders/stream`;

        eventSourceRef.current = new RNEventSource(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      eventSourceRef.current.addEventListener(
        "delivery.assigned",
        (event: any) => {
          const data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
          onDeliveryAssigned?.(data);
          reconnectAttemptsRef.current = 0;
        },
      );

      eventSourceRef.current.addEventListener(
        "delivery.updated",
        (event: any) => {
          const data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
          onDeliveryUpdated?.(data);
        },
      );

      eventSourceRef.current.addEventListener(
        "delivery.cancelled",
        (event: any) => {
          const data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
          onDeliveryCancelled?.(data);
        },
      );

      eventSourceRef.current.addEventListener("ride.assigned", (event: any) => {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        onRideAssigned?.(data);
      });

      eventSourceRef.current.addEventListener("ride.updated", (event: any) => {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        onRideUpdated?.(data);
      });

      eventSourceRef.current.addEventListener(
        "ride.cancelled",
        (event: any) => {
          const data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
          onRideCancelled?.(data);
        },
      );

      eventSourceRef.current.onerror = (error: any) => {
        onError?.(new Error("SSE connection error"));

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
            30000,
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      onError?.(error as Error);
    }
  }, [
    enabled,
    onDeliveryAssigned,
    onDeliveryUpdated,
    onDeliveryCancelled,
    onRideAssigned,
    onRideUpdated,
    onRideCancelled,
    onError,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    disconnect,
    reconnect: connect,
  };
}
