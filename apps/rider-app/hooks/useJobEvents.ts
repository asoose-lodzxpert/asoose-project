import { IncomingJobOffer } from "@/types/job";
import { useCallback, useEffect, useRef } from "react";
import {
  JobEventsService,
  ConnectionStatus,
} from "../services/job-events.service";

interface UseJobEventsOptions {
  onJobAssigned?: (job: IncomingJobOffer) => void;
  onJobUpdated?: (jobId: string, status: string) => void;
  onJobCancelled?: (jobId: string) => void;
  onError?: (error: Error) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  enabled?: boolean;
}

export function useJobEvents(options: UseJobEventsOptions) {
  const {
    onJobAssigned,
    onJobUpdated,
    onJobCancelled,
    onError,
    onConnectionStatusChange,
    enabled = true,
  } = options;
  const serviceRef = useRef<JobEventsService | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;
    try {
      if (!serviceRef.current) {
        serviceRef.current = new JobEventsService();
      }
      serviceRef.current.connect({
        onJobAssigned,
        onJobUpdated,
        onJobCancelled,
        onError,
        onConnectionStatusChange,
      });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [
    enabled,
    onJobAssigned,
    onJobUpdated,
    onJobCancelled,
    onError,
    onConnectionStatusChange,
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

  return { disconnect, reconnect: connect };
}
