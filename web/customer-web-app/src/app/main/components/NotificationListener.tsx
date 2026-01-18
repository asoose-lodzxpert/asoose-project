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

      const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // 2. Initialize socket with auth token
      // Pass token in 'auth' object as expected by your backend gateway
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
        console.error('🔌 Socket Connection Error:', err.message);
      });
    };

    setupConnection();

    // 4. Proper cleanup to prevent memory leaks or multiple connections
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return null; 
};