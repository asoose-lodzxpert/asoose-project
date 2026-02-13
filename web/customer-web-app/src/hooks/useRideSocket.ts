import { useEffect } from "react";
import { z } from "zod";
import { socketService } from "@/services/socket.service"; // Unified Singleton

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
  heading: z.number().optional(), // FIXED: Included heading to fix map rotation
});

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

export const useRideSocket = (
  token: string | null,
  onEvent: (event: z.infer<typeof SocketEventSchema>) => void,
  onReconnected?: () => void,
) => {
  useEffect(() => {
    if (!token) return;

    // Use singleton socket service instead of creating new io() instance
    const socket = socketService.connect(token);

    const handleConnect = () => {
      if (socket?.recovered && onReconnected) onReconnected();
    };
    socketService.on("connect", handleConnect);

    const handleEvent = (type: string, data: any) => {
      const payload = { type, ...data };
      const result = SocketEventSchema.safeParse(payload);

      if (result.success) {
        onEvent(result.data);
      } else {
        console.error(`Socket Security Warning: Invalid payload for ${type}`, result.error);
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

    const listeners: Record<string, (data: any) => void> = {};
    events.forEach((evt) => {
      listeners[evt] = (data) => handleEvent(evt, data);
      socketService.on(evt, listeners[evt]);
    });

    return () => {
      events.forEach((evt) => {
        socketService.off(evt, listeners[evt]);
      });
      socketService.off("connect", handleConnect);
      // Removed socket.disconnect() to preserve the singleton's lifetime
    };
  }, [token, onEvent, onReconnected]);
};