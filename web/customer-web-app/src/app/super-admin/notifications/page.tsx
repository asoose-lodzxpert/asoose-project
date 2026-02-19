'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { fetcher } from '../hooks/useSuperAdminFetch';
import { NotificationService } from './services/notifications.service';
import NotificationCard from './components/NotificationCard';
import { Notification, NotificationResponse } from './types';
import {
  Loader2,
  Check,
  BellOff,
  Wifi,
  WifiOff,
  Package,
  Truck,
  Car,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'react-toastify';

// â”€â”€â”€ Tab config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TabKey = 'ALL' | 'ORDER' | 'DELIVERY' | 'RIDE';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'ALL',      label: 'All Events',  icon: <LayoutGrid className="w-4 h-4" /> },
  { key: 'ORDER',    label: 'Orders',      icon: <Package    className="w-4 h-4" /> },
  { key: 'DELIVERY', label: 'Deliveries',  icon: <Truck      className="w-4 h-4" /> },
  { key: 'RIDE',     label: 'Rides',       icon: <Car        className="w-4 h-4" /> },
];

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function NotificationsPage() {
  const { data: session } = useSession();

  const [activeTab, setActiveTab]     = useState<TabKey>('ALL');
  const [page, setPage]               = useState(1);
  const [markingAll, setMarkingAll]   = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // â”€â”€ SWR key â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const swrKey = `/super-admin/notifications?page=${page}${activeTab !== 'ALL' ? `&type=${activeTab}` : ''}`;

  const {
    data: apiResponse,
    error,
    isLoading,
    mutate,
  } = useSWR<NotificationResponse>(swrKey, fetcher, { keepPreviousData: true });

  const notifications: Notification[] = apiResponse?.data ?? [];
  const meta = apiResponse?.meta ?? { total: 0, page: 1, pages: 1 };
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Reset to page 1 whenever the tab changes
  useEffect(() => { setPage(1); }, [activeTab]);

  // â”€â”€ Socket â€“ admin room â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    const API_URL = (
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
    ).replace(/\/api\/v1\/?$/, '');   // strip path â€“ socket needs bare origin

    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinAdminRoom');
      setLiveConnected(true);
    });

    socket.on('disconnect', () => setLiveConnected(false));

    // Real-time push: prepend the new notification and refresh badge count
    socket.on('admin_notification', (notif: Notification) => {
      // Only show it if it matches the active tab filter
      if (activeTab !== 'ALL' && notif.type !== activeTab) return;
      mutate(
        (prev) =>
          prev
            ? { ...prev, data: [notif, ...prev.data] }
            : { data: [notif], meta: { total: 1, page: 1, pages: 1 } },
        false,
      );
      toast.info(`ðŸ“¥ ${notif.title}`, { autoClose: 4000 });
    });

    return () => { socket.disconnect(); };
  }, [session, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleMarkAsRead = useCallback(async (id: string) => {
    mutate(
      (prev) =>
        prev
          ? { ...prev, data: prev.data.map(n => n.id === id ? { ...n, isRead: true } : n) }
          : prev,
      false,
    );
    try {
      await NotificationService.markAsRead(id);
    } catch {
      toast.error('Failed to update status');
      mutate();
    }
  }, [mutate]);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    mutate(
      (prev) =>
        prev ? { ...prev, data: prev.data.map(n => ({ ...n, isRead: true })) } : prev,
      false,
    );
    try {
      await NotificationService.markAllAsRead(activeTab !== 'ALL' ? activeTab : undefined);
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark all read');
      mutate();
    } finally {
      setMarkingAll(false);
    }
  }, [activeTab, mutate]);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="max-w-4xl mx-auto pb-20">

      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex items-center justify-between mb-6 sticky top-[60px] bg-[#0F172A]/90 backdrop-blur-sm z-10 py-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">System Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-2">
            {liveConnected ? (
              <><Wifi    className="w-3 h-3 text-green-500" /> Live Updates Active</>
            ) : (
              <><WifiOff className="w-3 h-3 text-red-500"  /> Connecting&hellip;</>
            )}
            <span className="text-gray-600">Â·</span>
            <span className="text-gray-500">{meta.total} total events</span>
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-sm text-gray-300 rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
          >
            {markingAll
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Check   className="w-4 h-4 text-green-400" />}
            Mark all read
          </button>
        )}
      </div>

      {/* â”€â”€ Tabs â”€â”€ */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeTab === tab.key
                ? 'bg-yellow-500 text-black border-yellow-500'
                : 'bg-[#1E293B] text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* â”€â”€ Content â”€â”€ */}
      {isLoading && notifications.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center">
          Failed to load notifications.{' '}
          <button onClick={() => mutate()} className="underline hover:text-red-300 ml-1">
            Retry
          </button>
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3 min-h-[50vh]">
          {notifications.map(notif => (
            <NotificationCard
              key={notif.id}
              notification={notif}
              onRead={handleMarkAsRead}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-[#1E293B]/30 rounded-2xl border border-gray-800/50">
          <BellOff className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-medium">No {activeTab === 'ALL' ? '' : activeTab.toLowerCase() + ' '}events yet</p>
        </div>
      )}

      {/* â”€â”€ Pagination â”€â”€ */}
      {meta.pages > 1 && (
        <div className="flex justify-between mt-8 border-t border-gray-800 pt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-2 text-sm text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 py-2">
            Page {page} / {meta.pages}
          </span>
          <button
            disabled={page >= meta.pages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            Next
          </button>
        </div>
      )}

    </div>
  );
}
