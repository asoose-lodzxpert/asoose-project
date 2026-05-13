import { IncomingJobOffer } from "@/types/job";
import { useCallback, useEffect, useRef } from "react";
import {
  JobEventsService,
  ConnectionStatus,
} from "../services/job-events.service";
import { locationStreamService } from "@/services/location-stream.service";
import { AppState, AppStateStatus } from "react-native";

interface UseJobEventsOptions {
  onJobAssigned?: (job: IncomingJobOffer) => void;
  onJobUpdated?: (jobId: string, status: string) => void;
  onJobCancelled?: (jobId: string) => void;
  /** Fired specifically when the customer cancels a ride — shows a tailored toast */
  onRideCancelledByCustomer?: (rideId: string, reason?: string) => void;
  /** Fired when a job reaches COMPLETED — use to do a full state reset */
  onJobCompleted?: (jobId: string) => void;
  onError?: (error: Error) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  onForceLogout?: (reason?: string) => void;
  /** Legacy pre-ride upfront payment confirmed — driver may now start. */
  onPaymentConfirmed?: (rideId: string) => void;
  /** Post-ride payment confirmed — driver earnings have been credited. */
  onRidePaymentCompleted?: (rideId: string) => void;
  onNewChatMessage?: (message: any) => void;
  enabled?: boolean;
}

export function useJobEvents(options: UseJobEventsOptions) {
  const {
    onJobAssigned,
    onJobUpdated,
    onJobCancelled,
    onRideCancelledByCustomer,
    onJobCompleted,
    onError,
    onConnectionStatusChange,
    onForceLogout,
    onPaymentConfirmed,
    onRidePaymentCompleted,
    onNewChatMessage,
    enabled = true,
  } = options;
  const serviceRef = useRef<JobEventsService | null>(null);

  // Initialize service once
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new JobEventsService();
      // Wire the socket service to location stream
      locationStreamService.setJobEventsService(serviceRef.current);
    }
  }, []);

  // Update callbacks when they change (without reconnecting)
  useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.updateCallbacks({
        onJobAssigned,
        onJobUpdated,
        onJobCancelled,
        onRideCancelledByCustomer,
        onJobCompleted,
        onError,
        onConnectionStatusChange,
        onForceLogout,
        onPaymentConfirmed,
        onRidePaymentCompleted,
        onNewChatMessage,
      });
    }
  }, [
    onJobAssigned,
    onJobUpdated,
    onJobCancelled,
    onRideCancelledByCustomer,
    onJobCompleted,
    onError,
    onConnectionStatusChange,
    onForceLogout,
    onPaymentConfirmed,
    onRidePaymentCompleted,
    onNewChatMessage,
  ]);

  const connect = useCallback(() => {
    if (!enabled || !serviceRef.current) return;
    try {
      // Callbacks are already set via updateCallbacks effect
      // Don't pass callbacks here to avoid overwriting them
      serviceRef.current.connect();
    } catch (error) {
      // ...existing code...
    }
  }, [enabled]); // Only reconnect when 'enabled' changes

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
  }, []);

  // Connect/disconnect based on 'enabled' state
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

  // Reconnect socket when app comes back to the foreground (handles silent TCP drops)
  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active" && serviceRef.current) {
          const socket = serviceRef.current.getSocket();
          if (socket && !socket.connected) {
            serviceRef.current.connect();
          }
        }
      },
    );
    return () => subscription.remove();
  }, [enabled]);

  // Expose joinOrderRoom for consumers
  const joinOrderRoom = (orderId: string) => {
    if (serviceRef.current) {
      serviceRef.current.joinOrderRoom(orderId);
    }
  };

  return { disconnect, reconnect: connect, joinOrderRoom };
}
