import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:3000";

export type SocketEventCallback = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private accessToken: string | null = null;

  /**
   * Initialize socket connection with authentication
   */
  connect(accessToken: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.accessToken = accessToken;

    this.socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("❌ Socket disconnected:", reason);
    });

    this.socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });

    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: SocketEventCallback) {
    if (!this.socket) {
      console.warn("Socket not connected. Call connect() first.");
      return;
    }
    this.socket.on(event, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback?: SocketEventCallback) {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any) {
    if (!this.socket) {
      console.warn("Socket not connected. Call connect() first.");
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();

// ============================================================================
// --- RIDE EVENT LISTENERS ---
// ============================================================================
// Event names & payloads match the NestJS backend exactly.
// Backend emits to `user_${customerId}` room with flat event names.

/** Emitted when a rider accepts the ride request */
export interface DriverFoundEvent {
  type: 'DRIVER_FOUND';
  metadata: {
    rideId: string;
    driver: {
      id: string;
      name: string;
      phone: string;
      vehicle: {
        brand: string;
        model: string;
        plateNumber: string;
        color: string;
        year: number;
      };
    };
  };
}

/** Real-time driver GPS pings while ride is active */
export interface DriverLocationUpdateEvent {
  type: 'DRIVER_LOCATION_UPDATE';
  metadata: {
    lat: number;
    lng: number;
    heading: number;
    rideId: string;
  };
}

/** Emitted when driver arrives at pickup point */
export interface DriverArrivedEvent {
  type: 'DRIVER_ARRIVED';
  metadata: {
    rideId: string;
    message: string;
  };
}

/** Emitted for TRIP_STARTED, TRIP_COMPLETED, RIDE_CANCELLED */
export interface RideStatusEvent {
  type: 'TRIP_STARTED' | 'TRIP_COMPLETED' | 'RIDE_CANCELLED';
  rideId: string;
}

/** Emitted by the backend when ride matching starts after payment confirmation */
export interface RideUpdateEvent {
  type: 'FINDING_DRIVER' | string;
  status?: string;
  rideId: string;
  label?: string;
}

export const subscribeToRideEvents = (
  callbacks: {
    onDriverFound?: (data: DriverFoundEvent) => void;
    onDriverLocationUpdate?: (data: DriverLocationUpdateEvent) => void;
    onDriverArrived?: (data: DriverArrivedEvent) => void;
    onTripStarted?: (data: RideStatusEvent) => void;
    onTripCompleted?: (data: RideStatusEvent) => void;
    onRideCancelled?: (data: RideStatusEvent) => void;
    onRideUpdate?: (data: RideUpdateEvent) => void;
  },
) => {
  if (callbacks.onDriverFound) {
    socketService.on('DRIVER_FOUND', callbacks.onDriverFound);
  }
  if (callbacks.onDriverLocationUpdate) {
    socketService.on('DRIVER_LOCATION_UPDATE', callbacks.onDriverLocationUpdate);
  }
  if (callbacks.onDriverArrived) {
    socketService.on('DRIVER_ARRIVED', callbacks.onDriverArrived);
  }
  if (callbacks.onTripStarted) {
    socketService.on('TRIP_STARTED', callbacks.onTripStarted);
  }
  if (callbacks.onTripCompleted) {
    socketService.on('TRIP_COMPLETED', callbacks.onTripCompleted);
  }
  if (callbacks.onRideCancelled) {
    socketService.on('RIDE_CANCELLED', callbacks.onRideCancelled);
  }
  if (callbacks.onRideUpdate) {
    socketService.on('ride_update', callbacks.onRideUpdate);
  }
};

export const unsubscribeFromRideEvents = () => {
  socketService.off('DRIVER_FOUND');
  socketService.off('DRIVER_LOCATION_UPDATE');
  socketService.off('DRIVER_ARRIVED');
  socketService.off('TRIP_STARTED');
  socketService.off('TRIP_COMPLETED');
  socketService.off('RIDE_CANCELLED');
  socketService.off('ride_update');
};

// ============================================================================
// --- DELIVERY EVENT LISTENERS ---
// ============================================================================
// Backend emits 'delivery_update' to `user_${customerId}` room.
// The delivery detail page subscribes directly via socketService.on('delivery_update', ...).
// These types describe the actual backend payload shape.

export interface DeliveryUpdateEvent {
  deliveryId: string;
  status: 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  label: string;
  rider?: {
    name: string;
    phone: string;
    vehicle: string;
  };
}
