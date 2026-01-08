'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { createClient } from '../../utils/supabase/client'; // Adjust path if needed

export const NotificationListener = () => {
  useEffect(() => {
    let socket: Socket | null = null;
    const supabase = createClient();

    const setupConnection = async () => {
      // 1. Get the current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) return; 
      const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      socket = io(SOCKET_URL, {
        transports: ['websocket'], 
      });

      socket.on('connect', () => {
        console.log('🔌 Connected to Notification Server');
        socket?.emit('join', userId); 
      });

      socket.on('notification', (data: any) => {
        toast.info(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">{data.title}</span>
            <span className="text-xs opacity-90">{data.message}</span>
          </div>, 
          {
            icon: <span>🔔</span>,
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: document.documentElement.classList.contains('dark') ? "dark" : "light",
          }
        );
      });

      socket.on('disconnect', () => {
        console.log('🔌 Disconnected from Notification Server');
      });
    };

    setupConnection();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return null; 
};