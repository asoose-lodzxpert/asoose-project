"use client";

import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { NotificationService } from "./services/notifications.service";
import NotificationCard from "./components/NotificationCard";
import { Notification } from "./types";
import { Loader2, Check, BellOff, Wifi } from "lucide-react";
import { toast } from "react-toastify";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = async () => {
    try {
      if (page === 1) setLoading(true);
      const res = await NotificationService.getAll(page);

      setNotifications((prev) => {
        const newItems = res.data.filter(
          (n) => !prev.some((p) => p.id === n.id),
        );
        return page === 1 ? res.data : [...prev, ...newItems];
      });

      setHasMore(page < res.meta.pages);
    } catch (error) {
      console.error(error);
      toast.error("Could not load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  useEffect(() => {
    // ✅ Check for NextAuth session
    if (!session?.user?.id) return;

    const setupSocket = async () => {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      // Initialize socket
      // You might also want to pass the access token for auth:
      // auth: { token: (session as any).accessToken }
      socketRef.current = io(API_URL, {
        transports: ["websocket"],
        query: { userId: session.user.id }, // Pass userId in query if needed by backend
      });

      socketRef.current.on("connect", () => {
        // ✅ Use NextAuth user ID
        socketRef.current?.emit("join", session.user.id);
      });

      socketRef.current.on("notification", (newNotif: Notification) => {
        setNotifications((prev) => [newNotif, ...prev]);
        // Optional: Add toast or sound here
      });
    };

    setupSocket();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [session]); // ✅ Re-run if session changes

  const handleMarkAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      await NotificationService.markAsRead(id);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

      await NotificationService.markAllAsRead();
      toast.success("All marked as read");
    } catch (error) {
      toast.error("Failed to mark all read");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 sticky top-[60px] bg-[#0F172A]/90 backdrop-blur-sm z-10 py-4 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white mb-1">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <Wifi className="w-3 h-3 text-green-500" /> Live Updates Active
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-sm text-gray-300 rounded-lg border border-gray-700 transition-colors"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 text-green-400" />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* Content List */}
      {loading && page === 1 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3 min-h-[50vh]">
          {notifications.map((notif) => (
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
          <p>No notifications yet</p>
        </div>
      )}

      {/* Pagination Footer */}
      {notifications.length > 0 && (
        <div className="flex justify-between mt-8 border-t border-gray-800 pt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 text-sm text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 py-2">Page {page}</span>
          <button
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm text-gray-400 disabled:opacity-30 hover:text-white transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
