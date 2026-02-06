import { IncomingJobOffer } from "@/types/job";
import { getAccessToken } from "./auth";

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
  private eventSource: any = null;
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
    this.setConnectionStatus("connected"); // Temporarily set as connected

    // TODO: SSE temporarily disabled due to property is not writable error
    // Uncomment when moving to old architecture or fixing SSE compatibility

    /*
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Close existing connection
      if (this.eventSource) {
        this.eventSource.close();
      }

      const url = `${process.env.EXPO_PUBLIC_API_URL}/riders/jobs/stream`;

      // Dynamic import to avoid early initialization
      const RNEventSource = (await import("react-native-sse")).default;

      this.eventSource = new RNEventSource(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        pollingInterval: 5000, // Fallback polling
      });

      this.setupEventListeners();
      this.setConnectionStatus("connected");
    } catch (error) {
      this.setConnectionStatus("disconnected");
      this.callbacks.onError?.(error as Error);
      throw error;
    }
    */
  }

  private setupEventListeners(): void {
    // TODO: SSE temporarily disabled
    return;

    /*
    if (!this.eventSource) return;

    this.eventSource.addEventListener("job.assigned", (event: any) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        this.callbacks.onJobAssigned?.(data);
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error("Error handling job.assigned event:", error);
        this.callbacks.onError?.(new Error("Failed to process job assignment"));
      }
    });

    this.eventSource.addEventListener("job.updated", (event: any) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        this.callbacks.onJobUpdated?.(data.id, data.status);
      } catch (error) {
        console.error("Error handling job.updated event:", error);
        this.callbacks.onError?.(new Error("Failed to process job update"));
      }
    });

    this.eventSource.addEventListener("job.cancelled", (event: any) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        this.callbacks.onJobCancelled?.(data.id);
      } catch (error) {
        console.error("Error handling job.cancelled event:", error);
        this.callbacks.onError?.(
          new Error("Failed to process job cancellation"),
        );
      }
    });

    this.eventSource.onerror = (error: any) => {
      console.error("SSE connection error:", error);
      this.setConnectionStatus("reconnecting");
      this.callbacks.onError?.(new Error("SSE connection error"));
      this.handleReconnect();
    };
    */
  }

  private handleReconnect(): void {
    // TODO: SSE temporarily disabled
    /*
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
    */
  }

  disconnect(): void {
    // TODO: SSE temporarily disabled
    /*
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.reconnectAttempts = 0;
    */
    this.setConnectionStatus("disconnected");
  }

  reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0; // Reset attempts for manual reconnect
    return this.connect(this.callbacks);
  }
}
