import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCookie } from 'cookies-next';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const useRideSocket = (onEvent: (event: any) => void) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getCookie('accessToken');
    if (!token) return;

    socketRef.current = io(`${SOCKET_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('notification', (payload) => onEvent(payload));

    return () => { socketRef.current?.disconnect(); };
  }, [onEvent]);

  return socketRef.current;
};