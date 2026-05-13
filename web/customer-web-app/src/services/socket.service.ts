import { io, Socket } from "socket.io-client";
import { devLog } from "@/lib/logger"; // M4: PII-safe dev-only logger

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "http://localhost:3000";

export type SocketEventCallback = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private accessToken: string | null = null;

  /**
   * Initialize socket connection with authentication.
   *
   * @param accessToken - JWT to authenticate the socket handshake
   * @param onExhausted - Optional callback invoked when all reconnection attempts
   *   fail (H3 fix). Use to surface a UI warning that live tracking is degraded.
   */
  connect(accessToken: string, onExhausted?: () => void) {
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
      devLog("✅ Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason: string) => {
      devLog("❌ Socket disconnected:", reason);
    });

    this.socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });

    // Fired by socket.io after all reconnectionAttempts are exhausted (H3 fix)
    this.socket.io.on("reconnect_failed", () => {
      console.warn("Socket: all reconnection attempts exhausted.");
      onExhausted?.();
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
//
// IMPORTANT: backend event payloads are FLAT — no `metadata` wrapper.

/**
 * Emitted when a rider accepts the ride request.
 * Backend event name: "DRIVER_ACCEPTED" (not "DRIVER_FOUND").
 */
export interface DriverAcceptedEvent {
  type: "DRIVER_ACCEPTED";
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
  message?: string;
}

/** @deprecated Alias kept for transition — prefer DriverAcceptedEvent */
export type DriverFoundEvent = DriverAcceptedEvent;

/**
 * Real-time driver GPS pings while ride is active.
 *
 * Backend wraps coordinates inside a `metadata` object:
 *   { type: 'DRIVER_LOCATION_UPDATE', metadata: { lat, lng, heading, rideId } }
 */
export interface DriverLocationUpdateEvent {
  type: "DRIVER_LOCATION_UPDATE";
  metadata: {
    lat: number;
    lng: number;
    heading: number;
    rideId: string;
  };
}

/**
 * Emitted when driver arrives at pickup point.
 *
 * Backend has two emission sites with slightly different shapes:
 *   jobs.service.ts  → { type, rideId, metadata: { message } }  (rideId top-level)
 *   rides.service.ts → { type, metadata: { rideId, message } }   (rideId in metadata)
 *
 * This interface normalises by accepting rideId at BOTH locations;
 * handlers should read `data.rideId ?? data.metadata?.rideId`.
 */
export interface DriverArrivedEvent {
  type: "DRIVER_ARRIVED";
  rideId?: string;
  metadata?: {
    rideId?: string;
    message?: string;
  };
}

/** Emitted for TRIP_STARTED, TRIP_COMPLETED, RIDE_CANCELLED */
export interface RideStatusEvent {
  type: "TRIP_STARTED" | "TRIP_COMPLETED" | "RIDE_CANCELLED";
  rideId: string;
  /** Present on RIDE_CANCELLED */
  cancelledBy?: string;
  /** Present on RIDE_CANCELLED */
  reason?: string;
}

/**
 * Emitted by the backend when ride matching starts after payment confirmation.
 * Backend event name: "ride_update" (lowercase).
 * Backend sends type = "SEARCHING_DRIVER" (not "FINDING_DRIVER").
 */
export interface RideUpdateEvent {
  type: "SEARCHING_DRIVER" | string;
  status?: string;
  rideId: string;
  label?: string;
}

/**
 * Emitted when no drivers are available in the area.
 * Backend payload is FLAT: { type, rideId, reason }
 */
export interface NoDriversFoundEvent {
  type: "NO_DRIVERS_FOUND";
  rideId: string;
  reason: string;
}

export const subscribeToRideEvents = (callbacks: {
  onDriverAccepted?: (data: DriverAcceptedEvent) => void;
  /** @deprecated Use onDriverAccepted */
  onDriverFound?: (data: DriverAcceptedEvent) => void;
  onDriverLocationUpdate?: (data: DriverLocationUpdateEvent) => void;
  onDriverArrived?: (data: DriverArrivedEvent) => void;
  onTripStarted?: (data: RideStatusEvent) => void;
  onTripCompleted?: (data: RideStatusEvent) => void;
  onRideCancelled?: (data: RideStatusEvent) => void;
  onRideUpdate?: (data: RideUpdateEvent) => void;
  onNoDriversFound?: (data: NoDriversFoundEvent) => void;
}) => {
  // Backend emits "DRIVER_ACCEPTED" (not "DRIVER_FOUND")
  const driverAcceptedHandler = callbacks.onDriverAccepted ?? callbacks.onDriverFound;
  if (driverAcceptedHandler) {
    socketService.on("DRIVER_ACCEPTED", driverAcceptedHandler);
  }
  if (callbacks.onDriverLocationUpdate) {
    socketService.on(
      "DRIVER_LOCATION_UPDATE",
      callbacks.onDriverLocationUpdate,
    );
  }
  if (callbacks.onDriverArrived) {
    socketService.on("DRIVER_ARRIVED", callbacks.onDriverArrived);
  }
  if (callbacks.onTripStarted) {
    socketService.on("TRIP_STARTED", callbacks.onTripStarted);
  }
  if (callbacks.onTripCompleted) {
    socketService.on("TRIP_COMPLETED", callbacks.onTripCompleted);
  }
  if (callbacks.onRideCancelled) {
    socketService.on("RIDE_CANCELLED", callbacks.onRideCancelled);
  }
  if (callbacks.onRideUpdate) {
    // Backend emits lowercase "ride_update" (not "RIDE_UPDATE")
    socketService.on("ride_update", callbacks.onRideUpdate);
  }
  if (callbacks.onNoDriversFound) {
    socketService.on("NO_DRIVERS_FOUND", callbacks.onNoDriversFound);
  }
};

export const unsubscribeFromRideEvents = () => {
  socketService.off("DRIVER_ACCEPTED");
  socketService.off("DRIVER_LOCATION_UPDATE");
  socketService.off("DRIVER_ARRIVED");
  socketService.off("TRIP_STARTED");
  socketService.off("TRIP_COMPLETED");
  socketService.off("RIDE_CANCELLED");
  socketService.off("ride_update");
  socketService.off("NO_DRIVERS_FOUND");
};

// ============================================================================
// --- DELIVERY EVENT LISTENERS ---
// ============================================================================
// Backend emits 'delivery_update' to `user_${customerId}` room.
// The delivery detail page subscribes directly via socketService.on('delivery_update', ...).
// These types describe the actual backend payload shape.

export interface DeliveryUpdateEvent {
  deliveryId: string;
  status: "ASSIGNED" | "PICKED_UP" | "DELIVERED" | "CANCELLED";
  label: string;
  rider?: {
    name: string;
    phone: string;
    vehicle: string;
  };
}

export interface ChatMessageEvent {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
  rideId?: string;
  orderId?: string;
}
