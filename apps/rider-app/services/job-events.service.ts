import { IncomingJobOffer } from "@/types/job";
import { getAccessToken } from "./auth";
import { io, Socket } from "socket.io-client";

/**
 * Maps a backend JobStatus string (from job.updated events) to a frontend JobStatus.
 * Backend values: 'requested' | 'assignment_requested' | 'assigned' | 'accepted' |
 *                 'declined' | 'timeout' | 'started' | 'completed' | 'no_driver_found'
 * Frontend values: 'incoming-job' | 'en-route-pickup' | 'at-pickup' |
 *                  'en-route-dropoff' | 'confirm-job' | 'online-waiting'
 */
function mapJobUpdatedStatus(status: string): string {
  const map: Record<string, string> = {
    requested: "incoming-job",
    assignment_requested: "incoming-job",
    assigned: "incoming-job",
    accepted: "en-route-pickup",
    started: "en-route-dropoff",
    completed: "online-waiting",
    declined: "online-waiting",
    timeout: "online-waiting",
    no_driver_found: "online-waiting",
    // Pass-through for already-mapped frontend statuses
    "incoming-job": "incoming-job",
    "en-route-pickup": "en-route-pickup",
    "at-pickup": "at-pickup",
    "en-route-dropoff": "en-route-dropoff",
    "confirm-job": "confirm-job",
    "online-waiting": "online-waiting",
  };
  return map[status] ?? "online-waiting";
}

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "failed";

export type JobEventCallbacks = {
  onJobAssigned?: (job: IncomingJobOffer) => void;
  onJobUpdated?: (jobId: string, status: string) => void;
  onJobCancelled?: (jobId: string) => void;
  /** Called when a job reaches the COMPLETED terminal state — clears all state */
  onJobCompleted?: (jobId: string) => void;
  onError?: (error: Error) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  /** Called when the server forces a logout (e.g. account banned/suspended) */
  onForceLogout?: (reason?: string) => void;
  /** Called when the customer confirms payment — driver may now start the trip */
  onPaymentConfirmed?: (rideId: string) => void;
};

export class JobEventsService {
  private socket: Socket | null = null;
  private reconnectTimeout: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private callbacks: JobEventCallbacks = {};
  private connectionStatus: ConnectionStatus = "disconnected";

  private setConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    if (this.callbacks && this.callbacks.onConnectionStatusChange) {
      this.callbacks.onConnectionStatusChange(status);
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  async connect(callbacks?: JobEventCallbacks): Promise<void> {
    // Only update callbacks if provided
    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }

    // If already connected, just update callbacks and return
    if (this.socket?.connected) {
      // ...existing code...
      return;
    }

    try {
      // Ensure callbacks object exists
      if (!this.callbacks) {
        this.callbacks = {};
      }

      const token = await getAccessToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Close existing connection
      if (this.socket) {
        this.socket.disconnect();
      }

      let apiUrl = process.env.EXPO_PUBLIC_API_URL || "";
      // Remove /api/v1 or /v1/api for socket connection
      apiUrl = apiUrl.replace(/\/api\/v1$/, "").replace(/\/v1\/api$/, "");

      this.socket = io(apiUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: Infinity,
      });

      this.setupEventListeners();
      // Don't set status to "connected" here - let the socket event handle it
    } catch (error) {
      this.setConnectionStatus("disconnected");
      if (this.callbacks?.onError) {
        this.callbacks.onError(error as Error);
      }
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      // ...existing code...
      this.setConnectionStatus("connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      // ...existing code...
      this.setConnectionStatus("disconnected");
    });

    this.socket.on("connect_error", (error) => {
      // ...existing code...
      this.setConnectionStatus("reconnecting");
      if (this.callbacks?.onError) {
        this.callbacks.onError(new Error("Connection error"));
      }
    });

    // Listen for job.assigned event
    this.socket.on("job.assigned", (data: any) => {
      if (__DEV__)
        console.log(
          "Received job.assigned event:",
          JSON.stringify(data, null, 2),
        );
      try {
        const job: IncomingJobOffer = {
          id: data.id,
          jobType: data.jobType,
          customerName: data.customerName || "Customer",
          customerPhone: data.customerPhone,
          pickupAddress: data.pickupAddress || "",
          dropoffAddress: data.dropoffAddress || "",
          earnings: data.earnings || data.estimatedEarnings || 0,
          distanceKm: data.distanceKm || data.distance,
          durationMin: data.durationMin,
          startOtp: data.startOtp,
          deliveryOtp: data.deliveryOtp,
          packageDetails: data.packageDetails,
          pickupContactPhone: data.pickupContactPhone,
          dropoffContactPhone: data.dropoffContactPhone,
          recipientName: data.recipientName,
          orderItems: data.orderItems,
          isFragile: data.isFragile,
          isPerishable: data.isPerishable,
          containsLiquid: data.containsLiquid,
          weightKg: data.weightKg,
          stops: data.stops,
          storeCount: data.storeCount,
          currentStopIndex: data.currentStopIndex,
        };

        if (this.callbacks?.onJobAssigned) {
          this.callbacks.onJobAssigned(job);
        }
        this.reconnectAttempts = 0;
      } catch (error) {
        // ...existing code...
        if (this.callbacks?.onError) {
          this.callbacks.onError(new Error("Failed to process job assignment"));
        }
      }
    });

    // Listen for job.updated event
    this.socket.on("job.updated", (data: any) => {
      try {
        // ...existing code...
        if (data.status === "completed") {
          // Fire the dedicated completed callback so the context can do a full reset
          if (this.callbacks?.onJobCompleted) {
            this.callbacks.onJobCompleted(data.id);
          }
          return;
        }
        const mappedStatus = mapJobUpdatedStatus(data.status);
        if (this.callbacks?.onJobUpdated) {
          this.callbacks.onJobUpdated(data.id, mappedStatus);
        }
      } catch (error) {
        // ...existing code...
        if (this.callbacks?.onError) {
          this.callbacks.onError(new Error("Failed to process job update"));
        }
      }
    });

    // Listen for job.cancelled event
    this.socket.on("job.cancelled", (data: any) => {
      try {
        // ...existing code...
        if (this.callbacks?.onJobCancelled) {
          this.callbacks.onJobCancelled(data.id);
        }
      } catch (error) {
        // ...existing code...
        if (this.callbacks?.onError) {
          this.callbacks.onError(
            new Error("Failed to process job cancellation"),
          );
        }
      }
    });

    // Handle forced logout (account banned / suspended by admin)
    this.socket.on("force_logout", (data: any) => {
      const reason = data?.reason as string | undefined;
      if (this.callbacks?.onForceLogout) {
        this.callbacks.onForceLogout(reason);
      }
      // Disconnect socket immediately
      this.disconnect();
    });

    // Customer confirmed payment — driver may start the trip
    this.socket.on("PAYMENT_CONFIRMED", (data: any) => {
      const rideId = data?.rideId as string | undefined;
      if (rideId && this.callbacks?.onPaymentConfirmed) {
        this.callbacks.onPaymentConfirmed(rideId);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // ...existing code...
      this.setConnectionStatus("failed");
      if (this.callbacks?.onError) {
        this.callbacks.onError(
          new Error("Connection failed after maximum retry attempts"),
        );
      }
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.callbacks);
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.setConnectionStatus("disconnected");
  }

  reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0; // Reset attempts for manual reconnect
    return this.connect(this.callbacks);
  }

  /**
   * Update callbacks without reconnecting
   */
  updateCallbacks(callbacks: JobEventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Join a specific order/job room for granular updates
   */
  joinOrderRoom(orderId: string) {
    if (this.socket && orderId) {
      this.socket.emit("joinOrderRoom", { orderId });
    }
  }

  /**
   * Send location update via the shared socket.
   * heading is the GPS compass heading in degrees [0, 360); null if device doesn't report it.
   */
  sendLocationUpdate(lat: number, lng: number, role?: string, heading?: number | null): boolean {
    if (this.socket && this.connectionStatus === "connected") {
      this.socket.emit("rider_location_update", {
        lat,
        lng,
        role,
        ...(heading != null ? { heading } : {}),
      });
      return true;
    }
    return false;
  }

  /**
   * Send batch location updates via the shared socket
   */
  sendLocationBatch(
    locations: Array<{ lat: number; lng: number; timestamp: number }>,
    role?: string,
  ): boolean {
    if (this.socket && this.connectionStatus === "connected") {
      this.socket.emit("rider_location_batch", { locations, role });
      return true;
    }
    return false;
  }

  /**
   * Get the socket instance for direct access if needed
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.connectionStatus === "connected" && this.socket !== null;
  }
}
