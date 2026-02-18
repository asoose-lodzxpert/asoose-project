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

export interface RideDriverAssignedEvent {
  rideId: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicleNumber: string;
    image?: string;
    location: {
      latitude: number;
      longitude: number;
      heading?: number; // <--- FIXED: Added heading
    };
  };
  eta: number;
}

export interface RideStatusChangedEvent {
  rideId: string;
  status: "REQUESTED" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  timestamp: string;
  message?: string;
}

export interface DriverLocationUpdateEvent {
  rideId: string;
  location: {
    latitude: number;
    longitude: number;
    heading?: number; // <--- FIXED: Added heading
  };
  timestamp: string;
}

export const subscribeToRideEvents = (
  rideId: string,
  callbacks: {
    onDriverAssigned?: (data: RideDriverAssignedEvent) => void;
    onStatusChanged?: (data: RideStatusChangedEvent) => void;
    onDriverLocationUpdate?: (data: DriverLocationUpdateEvent) => void;
    onDriverArrived?: () => void;
  },
) => {
  if (callbacks.onDriverAssigned) {
    socketService.on(`ride.${rideId}.driver.assigned`, callbacks.onDriverAssigned);
  }

  if (callbacks.onStatusChanged) {
    socketService.on(`ride.${rideId}.status.changed`, callbacks.onStatusChanged);
  }

  if (callbacks.onDriverLocationUpdate) {
    socketService.on(`ride.${rideId}.driver.location`, callbacks.onDriverLocationUpdate);
  }

  if (callbacks.onDriverArrived) {
    socketService.on(`ride.${rideId}.driver.arrived`, callbacks.onDriverArrived);
  }
};

export const unsubscribeFromRideEvents = (rideId: string) => {
  socketService.off(`ride.${rideId}.driver.assigned`);
  socketService.off(`ride.${rideId}.status.changed`);
  socketService.off(`ride.${rideId}.driver.location`);
  socketService.off(`ride.${rideId}.driver.arrived`);
};

// ============================================================================
// --- DELIVERY EVENT LISTENERS ---
// ============================================================================

// <--- FIXED: Renamed back to DeliveryRiderAssignedEvent, changed rideId to deliveryId, and driver to rider
export interface DeliveryRiderAssignedEvent {
  deliveryId: string;
  rider: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicleNumber: string;
    image?: string;
    location: {
      latitude: number;
      longitude: number;
      heading?: number; // <--- FIXED: Added heading
    };
  };
  eta: number;
}

export interface DeliveryStatusChangedEvent {
  deliveryId: string;
  status: "REQUESTED" | "ASSIGNED" | "PICKED_UP" | "DELIVERED" | "CANCELLED";
  timestamp: string;
  message?: string;
}

export interface RiderLocationUpdateEvent {
  deliveryId: string;
  location: {
    latitude: number;
    longitude: number;
    heading?: number;
  };
  timestamp: string;
}

export const subscribeToDeliveryEvents = (
  deliveryId: string,
  callbacks: {
    onRiderAssigned?: (data: DeliveryRiderAssignedEvent) => void;
    onStatusChanged?: (data: DeliveryStatusChangedEvent) => void;
    onRiderLocationUpdate?: (data: RiderLocationUpdateEvent) => void;
    onRiderArrived?: () => void;
    onPackagePickedUp?: () => void;
  },
) => {
  if (callbacks.onRiderAssigned) {
    socketService.on(`delivery.${deliveryId}.rider.assigned`, callbacks.onRiderAssigned);
  }

  if (callbacks.onStatusChanged) {
    socketService.on(`delivery.${deliveryId}.status.changed`, callbacks.onStatusChanged);
  }

  if (callbacks.onRiderLocationUpdate) {
    socketService.on(`delivery.${deliveryId}.rider.location`, callbacks.onRiderLocationUpdate);
  }

  if (callbacks.onRiderArrived) {
    socketService.on(`delivery.${deliveryId}.rider.arrived`, callbacks.onRiderArrived);
  }

  if (callbacks.onPackagePickedUp) {
    socketService.on(`delivery.${deliveryId}.package.picked_up`, callbacks.onPackagePickedUp);
  }
};

export const unsubscribeFromDeliveryEvents = (deliveryId: string) => {
  socketService.off(`delivery.${deliveryId}.rider.assigned`);
  socketService.off(`delivery.${deliveryId}.status.changed`);
  socketService.off(`delivery.${deliveryId}.rider.location`);
  socketService.off(`delivery.${deliveryId}.rider.arrived`);
  socketService.off(`delivery.${deliveryId}.package.picked_up`);
};