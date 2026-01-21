import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCookie } from 'cookies-next';

// Use env var, fallback to relative path (proxy) or localhost
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useRideSocket = (
  onEvent: (event: any) => void, 
  onReconnected?: () => void
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getCookie('accessToken');
    
    // Initialize Socket with explicit Auth
    socketRef.current = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token }, // Handshake auth
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'], // Prefer WebSocket for lower latency
    });

    const socket = socketRef.current;

    // --- Core Events ---
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // If this is a reconnection, trigger state sync
      if (socket.recovered && onReconnected) {
        onReconnected();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
    });

    // --- Ride Events ---
    // Listen to all ride-related events and pass to handler
    const events = [
      'DRIVER_FOUND', 
      'DRIVER_LOCATION_UPDATE', 
      'DRIVER_ARRIVED', 
      'TRIP_STARTED', 
      'TRIP_COMPLETED', 
      'NO_DRIVERS_FOUND',
      'RIDE_CANCELLED'
    ];

    events.forEach((evt) => {
      socket.on(evt, (data) => onEvent({ type: evt, ...data }));
    });

    return () => {
      socket.disconnect();
    };
  }, [onEvent, onReconnected]);

  return socketRef.current;
};