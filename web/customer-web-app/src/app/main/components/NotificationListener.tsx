'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { createClient } from '../../../../utils/supabase/client';

export const NotificationListener = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const setupConnection = async () => {
      // 1. Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) return;

      // 👇 FIX: Extract only the origin (http://localhost:3000)
      // This removes '/api/v1' so Socket.IO connects to the root namespace
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const SOCKET_URL = new URL(apiUrl).origin;
      
      // 2. Initialize socket with auth token
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token } 
      });

      socketRef.current.on('connect', () => {
        console.log('🔌 Connected to Notification Server');
      });

      // 3. Handle incoming notifications
      socketRef.current.on('notification', (data: any) => {
        toast.info(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">{data.title}</span>
            <span className="text-xs opacity-90">{data.message}</span>
          </div>, 
          {
            icon: <span>🔔</span>,
            position: "top-right",
            theme: document.documentElement.classList.contains('dark') ? "dark" : "light",
          }
        );
      });

      socketRef.current.on('disconnect', () => {
        console.log('🔌 Disconnected from Notification Server');
      });

      socketRef.current.on('connect_error', (err) => {
        // Suppress specific namespace errors if they persist during hot-reload
        if (err.message !== 'Invalid namespace') {
             console.error('🔌 Socket Connection Error:', err.message);
        }
      });
    };

    setupConnection();

    // 4. Proper cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return null; 
};