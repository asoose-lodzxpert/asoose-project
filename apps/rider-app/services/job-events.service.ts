import { IncomingJobOffer } from "@/types/job";
import { getAccessToken } from "./auth";
import { io, Socket } from "socket.io-client";

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "failed";

export type JobEventCallbacks = {
  onJobAssigned?: (job: IncomingJobOffer) => void;
  onJobUpdated?: (jobId: string, status: string) => void;
  onJobCancelled?: (jobId: string) => void;
  onError?: (error: Error) => void;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
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
    this.callbacks.onConnectionStatusChange?.(status);
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  async connect(callbacks: JobEventCallbacks): Promise<void> {
    this.callbacks = callbacks;

    try {
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
        reconnectionDelayMax: 10000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventListeners();
      this.setConnectionStatus("connected");
    } catch (error) {
      this.setConnectionStatus("disconnected");
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Job events socket connected");
      this.setConnectionStatus("connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      console.log("Job events socket disconnected");
      this.setConnectionStatus("disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Job events socket connection error:", error);
      this.setConnectionStatus("reconnecting");
      this.callbacks.onError?.(new Error("Connection error"));
    });

    // Listen for job.assigned event
    this.socket.on("job.assigned", (data: any) => {
      try {
        console.log("Received job.assigned event:", data);

        // Map backend event to IncomingJobOffer format
        const job: IncomingJobOffer = {
          id: data.id,
          jobType: data.jobType,
          customerName: data.customerName || "Customer",
          pickupAddress: data.pickupAddress || "",
          dropoffAddress: data.dropoffAddress || "",
          earnings: data.estimatedEarnings || data.earnings || 0,
          distanceKm: data.distance || data.distanceKm,
        };

        this.callbacks.onJobAssigned?.(job);
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error("Error handling job.assigned event:", error);
        this.callbacks.onError?.(new Error("Failed to process job assignment"));
      }
    });

    // Listen for job.updated event
    this.socket.on("job.updated", (data: any) => {
      try {
        console.log("Received job.updated event:", data);
        this.callbacks.onJobUpdated?.(data.id, data.status);
      } catch (error) {
        console.error("Error handling job.updated event:", error);
        this.callbacks.onError?.(new Error("Failed to process job update"));
      }
    });

    // Listen for job.cancelled event
    this.socket.on("job.cancelled", (data: any) => {
      try {
        console.log("Received job.cancelled event:", data);
        this.callbacks.onJobCancelled?.(data.id);
      } catch (error) {
        console.error("Error handling job.cancelled event:", error);
        this.callbacks.onError?.(
          new Error("Failed to process job cancellation"),
        );
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnect attempts reached");
      this.setConnectionStatus("failed");
      this.callbacks.onError?.(
        new Error("Connection failed after maximum retry attempts"),
      );
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
   * Join a specific order/job room for granular updates
   */
  joinOrderRoom(orderId: string) {
    if (this.socket && orderId) {
      this.socket.emit("joinOrderRoom", { orderId });
    }
  }

  /**
   * Send location update via the shared socket
   */
  sendLocationUpdate(lat: number, lng: number): boolean {
    if (this.socket && this.connectionStatus === "connected") {
      this.socket.emit("rider_location_update", { lat, lng });
      return true;
    }
    return false;
  }

  /**
   * Send batch location updates via the shared socket
   */
  sendLocationBatch(
    locations: Array<{ lat: number; lng: number; timestamp: number }>,
  ): boolean {
    if (this.socket && this.connectionStatus === "connected") {
      this.socket.emit("rider_location_batch", { locations });
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
