'use client';

import React, { useState } from 'react';
import { Bell, ShoppingBag, CheckCheck, AlertCircle, Info, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useSWR from 'swr';
import { toast } from 'react-toastify';

import { EmptyState } from '@/app/main/components/profile/EmptyState';
import { ContentSkeleton } from '../profile/skeleton';
import { fetcher } from '../../super-admin/hooks/useSuperAdminFetch';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// 1. FIX: Define the paginated response structure
interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  lastPage: number;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'settings'>('all');
  
  // 1. FIX: Update SWR type to the paginated object
  const { data: response, mutate, isLoading } = useSWR<PaginatedNotifications>(
    '/notifications',
    fetcher
  );

  // 2. FIX: Safely extract the notifications array
  const notifications = response?.data || [];

  const handleMarkAllRead = async () => {
    try {
      await fetcher('/notifications/read-all', { method: 'PATCH' } as any);
      
      // 3. FIX: Update optimistic mutate to preserve object structure
      if (response) {
        mutate({
          ...response,
          data: response.data.map(n => ({ ...n, isRead: true }))
        }, false);
      }
      
      toast.success('Inbox updated');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetcher(`/notifications/${id}`, { method: 'DELETE' } as any);
      
      // 3. FIX: Update optimistic mutate to preserve object structure
      if (response) {
        mutate({
          ...response,
          data: response.data.filter(n => n.id !== id)
        }, false);
      }
    } catch (err) {
      toast.error('Could not delete notification');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CREATED':
      case 'ORDER_UPDATE': return <ShoppingBag className="w-5 h-5 text-blue-500" />;
      case 'PAYMENT_SUCCESS': return <CheckCheck className="w-5 h-5 text-green-500" />;
      case 'ALERT': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 text-gray-900 dark:text-gray-100">
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black">Notifications</h1>
          <div className="flex bg-white dark:bg-[#151515] p-1 rounded-xl border border-gray-100 dark:border-white/5">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-yellow-500 text-black' : 'text-gray-500'}`}
            >
              Inbox
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-yellow-500 text-black' : 'text-gray-500'}`}
            >
              Settings
            </button>
          </div>
        </div>

        {activeTab === 'all' ? (
          <div className="space-y-4">
            {/* 2. FIX: Call .some() on the extracted array */}
            {notifications.some(n => !n.isRead) && (
              <button onClick={handleMarkAllRead} className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest ml-auto block">
                Mark all read
              </button>
            )}

            {isLoading ? (
              <ContentSkeleton />
            ) : notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications yet" desc="When you get updates, they'll show up here." />
            ) : (
              /* 2. FIX: Call .map() on the extracted array */
              notifications.map((notif) => (
                <div key={notif.id} className={`group relative p-5 rounded-[2rem] border transition-all flex gap-4 ${
                  notif.isRead ? 'bg-white/50 dark:bg-[#111] border-gray-100 dark:border-white/5' : 'bg-white dark:bg-[#151515] border-yellow-500/30'
                }`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${notif.isRead ? 'bg-gray-100 dark:bg-white/5' : 'bg-yellow-500/10'}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-bold text-sm ${!notif.isRead && 'text-yellow-600 dark:text-yellow-500'}`}>{notif.title}</h3>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{notif.message}</p>
                  </div>
                  <button onClick={() => handleDelete(notif.id)} className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-full transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-8 bg-white dark:bg-[#151515] rounded-[2.5rem] border border-gray-100 dark:border-white/5">
             <h3 className="font-bold mb-6">Notification Preferences</h3>
             <p className="text-sm text-gray-500">Manage how you receive alerts.</p>
          </div>
        )}
      </main>

    </div>
  );
}