"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "../hooks/useSuperAdminFetch";
import { NotificationService } from "./services/notifications.service";
import NotificationCard from "./components/NotificationCard";
import { Notification, NotificationResponse } from "./types";
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
  BellRing,
} from "lucide-react";
import { toast } from "react-toastify";

type TabKey = "ALL" | "ORDER" | "DELIVERY" | "RIDE";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "ALL", label: "All Events", icon: <LayoutGrid className="w-4 h-4" /> },
  { key: "ORDER", label: "Orders", icon: <Package className="w-4 h-4" /> },
  { key: "DELIVERY", label: "Deliveries", icon: <Truck className="w-4 h-4" /> },
  { key: "RIDE", label: "Rides", icon: <Car className="w-4 h-4" /> },
];

export default function NotificationsPage() {
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const swrKey = `/super-admin/notifications?page=${page}${activeTab !== "ALL" ? `&type=${activeTab}` : ""}`;

  const {
    data: apiResponse,
    error,
    isLoading,
    mutate,
  } = useSWR<NotificationResponse>(swrKey, fetcher, { keepPreviousData: true });

  const notifications: Notification[] = apiResponse?.data ?? [];
  const meta = apiResponse?.meta ?? { total: 0, page: 1, pages: 1 };
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // --- Socket Lifecycle ---
  useEffect(() => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    const API_URL = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    ).replace(/\/api\/v1\/?$/, "");

    const socket = io(API_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinAdminRoom");
      setLiveConnected(true);
    });

    socket.on("disconnect", () => setLiveConnected(false));

    socket.on("admin_notification", (notif: Notification) => {
      if (activeTab !== "ALL" && notif.type !== activeTab) return;
      mutate(
        (prev) =>
          prev
            ? { ...prev, data: [notif, ...prev.data] }
            : { data: [notif], meta: { total: 1, page: 1, pages: 1 } },
        false,
      );
      toast.info(`🔔 ${notif.title}`, { autoClose: 4000 });
    });

    return () => {
      socket.disconnect();
    };
  }, [session, activeTab, mutate]);

  // --- Handlers ---
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      mutate(
        (prev) =>
          prev
            ? {
              ...prev,
              data: prev.data.map((n) =>
                n.id === id ? { ...n, isRead: true } : n,
              ),
            }
            : prev,
        false,
      );
      try {
        await NotificationService.markAsRead(id);
      } catch {
        toast.error("Failed to update status");
        mutate();
      }
    },
    [mutate],
  );

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    mutate(
      (prev) =>
        prev
          ? { ...prev, data: prev.data.map((n) => ({ ...n, isRead: true })) }
          : prev,
      false,
    );
    try {
      await NotificationService.markAllAsRead(
        activeTab !== "ALL" ? activeTab : undefined,
      );
      toast.success("All marked as read");
    } catch {
      toast.error("Failed to mark all read");
      mutate();
    } finally {
      setMarkingAll(false);
    }
  }, [activeTab, mutate]);

  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      const result = await NotificationService.sendTestPush();
      if (result.success) {
        toast.success(
          `Test push sent to ${result.tokensFound} admin device(s)`,
        );
      } else {
        toast.warn(
          result.message ||
          "No admin tokens found. Grant notification permission in your browser first.",
        );
      }
    } catch {
      toast.error("Failed to send test push");
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 sticky top-0 bg-[#0F172A]/90 backdrop-blur-md z-20 py-6 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              System Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
            {liveConnected ? (
              <>
                <Wifi className="w-3 h-3 text-green-500" /> Live Updates Active
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-red-500" /> Connecting...
              </>
            )}
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{meta.total} total events</span>
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={handleTestPush}
            disabled={testingPush}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-sm text-blue-400 rounded-lg border border-blue-600/30 transition-all disabled:opacity-50"
          >
            {testingPush ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BellRing className="w-4 h-4" />
            )}
            Test Push
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] hover:bg-[#334155] text-sm text-gray-300 rounded-lg border border-gray-700 transition-all"
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
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border shrink-0 ${activeTab === tab.key
                ? "bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20"
                : "bg-[#1E293B] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white"
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main List */}
      <div className="min-h-[50vh]">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-gray-500 text-sm">Fetching notifications...</p>
          </div>
        ) : error ? (
          <div className="p-10 bg-red-500/5 border border-red-500/20 text-red-400 rounded-2xl text-center">
            <p className="mb-4">Failed to load system notifications.</p>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 underline"
            >
              Retry Connection
            </button>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                onRead={handleMarkAsRead}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500 bg-[#1E293B]/20 rounded-3xl border border-gray-800/50 dashed">
            <BellOff className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-lg font-medium">Clear skies!</p>
            <p className="text-sm opacity-60">
              No {activeTab === "ALL" ? "" : activeTab.toLowerCase() + " "}
              notifications found.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-between mt-10 border-t border-gray-800 pt-8">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-6 py-2 bg-[#1E293B] rounded-lg text-sm font-medium text-gray-300 disabled:opacity-20 hover:bg-[#334155] transition-all"
          >
            Previous
          </button>
          <span className="text-sm font-mono text-gray-500">
            {page} <span className="mx-2 opacity-30">/</span> {meta.pages}
          </span>
          <button
            disabled={page >= meta.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-2 bg-[#1E293B] rounded-lg text-sm font-medium text-gray-300 disabled:opacity-20 hover:bg-[#334155] transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
