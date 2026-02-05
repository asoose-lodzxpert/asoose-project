import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { z } from "zod";

// Phase 2.2: Schema Validation
// Define strict schemas for incoming data to prevent runtime errors and injection attacks
const DriverSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  vehicle: z.object({
    brand: z.string(),
    model: z.string(),
    plateNumber: z.string(),
    color: z.string(),
  }),
  rating: z.number().optional(),
});

const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

// Phase 3.2: Event Schemas
const SocketEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("DRIVER_FOUND"),
    metadata: z.object({ driver: DriverSchema, rideId: z.string() }),
  }),
  z.object({
    type: z.literal("DRIVER_LOCATION_UPDATE"),
    metadata: LocationSchema,
  }),
  z.object({ type: z.literal("DRIVER_ARRIVED"), metadata: z.any().optional() }),
  z.object({ type: z.literal("TRIP_STARTED"), metadata: z.any().optional() }),
  z.object({ type: z.literal("TRIP_COMPLETED"), metadata: z.any().optional() }),
  z.object({
    type: z.literal("NO_DRIVERS_FOUND"),
    metadata: z.any().optional(),
  }),
  z.object({ type: z.literal("RIDE_CANCELLED"), metadata: z.any().optional() }),
]);

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000";

export const useRideSocket = (
  token: string | null, // Phase 1.1: Explicit Token Injection
  onEvent: (event: z.infer<typeof SocketEventSchema>) => void,
  onReconnected?: () => void,
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return; // Don't connect without auth

    socketRef.current = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token }, // Secure handshake
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected safe:", socket.id);
      if (socket.recovered && onReconnected) onReconnected();
    });

    // Validated Event Listener
    const handleEvent = (type: string, data: any) => {
      const payload = { type, ...data };
      const result = SocketEventSchema.safeParse(payload);

      if (result.success) {
        onEvent(result.data);
      } else {
        console.error(
          `Socket Security Warning: Invalid payload for ${type}`,
          result.error,
        );
        // Phase 3.3: You could track this in Sentry
      }
    };

    const events = [
      "DRIVER_FOUND",
      "DRIVER_LOCATION_UPDATE",
      "DRIVER_ARRIVED",
      "TRIP_STARTED",
      "TRIP_COMPLETED",
      "NO_DRIVERS_FOUND",
      "RIDE_CANCELLED",
    ];

    events.forEach((evt) => {
      socket.on(evt, (data) => handleEvent(evt, data));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, onEvent, onReconnected]); // Re-connect only if token changes

  return socketRef.current;
};
