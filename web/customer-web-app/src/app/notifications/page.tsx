'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../utils/supabase/client';
import { Bell, CheckCheck, Clock, AlertCircle, ShoppingBag, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

// Types
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Notifications
  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/sign-in');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark All As Read
  const handleMarkAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Optimistic Update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    await fetch(`${API_URL}/notifications/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
  };

  // Helper to get Icon based on type
  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CREATED':
      case 'ORDER_UPDATE':
        return <ShoppingBag className="w-5 h-5 text-blue-500" />;
      case 'PAYMENT_SUCCESS':
        return <CheckCheck className="w-5 h-5 text-green-500" />;
      case 'ALERT':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-20">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#151515] border-b border-gray-100 dark:border-white/5 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" /> Notifications
          </h1>
          {notifications.some(n => !n.isRead) && (
            <button 
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-yellow-600 dark:text-yellow-500 hover:opacity-80"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bell className="w-16 h-16 mb-4 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-2xl border transition-all flex gap-4 ${
                  notif.isRead 
                    ? 'bg-white dark:bg-[#151515] border-gray-100 dark:border-white/5' 
                    : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                   notif.isRead ? 'bg-gray-100 dark:bg-white/5' : 'bg-white dark:bg-white/10'
                }`}>
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-sm font-bold ${notif.isRead ? 'text-gray-900 dark:text-gray-200' : 'text-black dark:text-white'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0 ml-2">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
                
                {!notif.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}