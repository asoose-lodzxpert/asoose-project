import { IncomingJobOffer } from "@/types/job";
import { getAccessToken } from "./auth";

export type JobEventCallbacks = {
  onJobAssigned?: (job: IncomingJobOffer) => void;
  onJobUpdated?: (jobId: string, status: string) => void;
  onJobCancelled?: (jobId: string) => void;
  onError?: (error: Error) => void;
};

export class JobEventsService {
  private eventSource: any = null;
  private reconnectTimeout: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private callbacks: JobEventCallbacks = {};

  async connect(callbacks: JobEventCallbacks): Promise<void> {
    this.callbacks = callbacks;
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
      const RNEventSource = (await import("react-native-sse")).default;
      this.eventSource = new RNEventSource(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.setupEventListeners();
    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.addEventListener("job.assigned", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.callbacks.onJobAssigned?.(data);
      this.reconnectAttempts = 0;
    });

    this.eventSource.addEventListener("job.updated", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.callbacks.onJobUpdated?.(data.id, data.status);
    });

    this.eventSource.addEventListener("job.cancelled", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.callbacks.onJobCancelled?.(data.id);
    });

    this.eventSource.onerror = (error: any) => {
      this.callbacks.onError?.(new Error("SSE connection error"));
      this.handleReconnect();
    };
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(
        this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
        30000,
      );
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.callbacks);
      }, delay);
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.reconnectAttempts = 0;
  }

  reconnect(): Promise<void> {
    this.disconnect();
    return this.connect(this.callbacks);
  }
}
