import AsyncStorage from "@react-native-async-storage/async-storage";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface RiderEventHandlers {
  onDeliveryAssigned?: (data: any) => void;
  onDeliveryUpdated?: (data: any) => void;
  onDeliveryCancelled?: (data: any) => void;
  onRideAssigned?: (data: any) => void;
  onRideUpdated?: (data: any) => void;
  onRideCancelled?: (data: any) => void;
  onError?: (error: Error) => void;
}

export class RiderEventsService {
  private eventSource: any = null;
  private reconnectTimeout: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private handlers: RiderEventHandlers = {};

  async connect(handlers: RiderEventHandlers): Promise<void> {
    this.handlers = handlers;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Close existing connection
      if (this.eventSource) {
        this.eventSource.close();
      }

      const url = `${EXPO_PUBLIC_API_URL}/riders/stream`;

      const RNEventSource = (await import("react-native-sse")).default;
      this.eventSource = new RNEventSource(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.setupEventListeners();
    } catch (error) {
      this.handlers.onError?.(error as Error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.addEventListener("delivery.assigned", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.handlers.onDeliveryAssigned?.(data);
      this.reconnectAttempts = 0;
    });

    this.eventSource.addEventListener("delivery.updated", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.handlers.onDeliveryUpdated?.(data);
    });

    this.eventSource.addEventListener("delivery.cancelled", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.handlers.onDeliveryCancelled?.(data);
    });

    this.eventSource.addEventListener("ride.assigned", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.handlers.onRideAssigned?.(data);
    });

    this.eventSource.addEventListener("ride.updated", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.handlers.onRideUpdated?.(data);
    });

    this.eventSource.addEventListener("ride.cancelled", (event: any) => {
      const data =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      this.handlers.onRideCancelled?.(data);
    });

    this.eventSource.onerror = (error: any) => {
      this.handlers.onError?.(new Error("SSE connection error"));
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
        this.connect(this.handlers);
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
    return this.connect(this.handlers);
  }
}
