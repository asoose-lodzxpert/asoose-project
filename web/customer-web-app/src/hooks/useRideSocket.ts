import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
// import { getCookie } from 'cookies-next';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useRideSocket = (onEvent: (event: any) => void) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getCookie('accessToken');
    if (!token) return;

    // Connect to the 'notifications' namespace defined in your backend Gateway
    socketRef.current = io(`${SOCKET_URL}/notifications`, {
      auth: { token }, // Backend Gateway expects token in auth or headers
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to Notification Gateway');
    });

    // Listen for the generic 'notification' event emitted by sendToUser()
    socketRef.current.on('notification', (payload) => {
      console.log('Socket Event:', payload);
      onEvent(payload);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [onEvent]);

  return socketRef.current;
};