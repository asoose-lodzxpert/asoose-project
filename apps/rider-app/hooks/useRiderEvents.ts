import { useCallback, useEffect, useRef } from "react";
import {
  RiderEventsService,
  type RiderEventHandlers,
} from "../services/rider-events.service";

interface UseRiderEventsOptions extends RiderEventHandlers {
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

  const serviceRef = useRef<RiderEventsService | null>(null);

  const connect = useCallback(async () => {
    if (!enabled) return;

    try {
      if (!serviceRef.current) {
        serviceRef.current = new RiderEventsService();
      }

      await serviceRef.current.connect({
        onDeliveryAssigned,
        onDeliveryUpdated,
        onDeliveryCancelled,
        onRideAssigned,
        onRideUpdated,
        onRideCancelled,
        onError,
      });
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
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
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
