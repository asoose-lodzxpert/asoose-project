"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { io, Socket } from "socket.io-client";
import {
  ChevronLeft,
  Phone,
  User,
  CreditCard,
  Loader2,
  AlertCircle,
  RefreshCw,
  WifiOff,
  Package,
} from "lucide-react";
import { getSession } from "next-auth/react"; // ✅ Import NextAuth
import { toast } from "react-toastify";
import SmartTimeline, { TimelineStep } from "./component/smartTimeline";

// --- Configuration ---
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// --- Types ---
interface OrderData {
  id: string;
  status: string;
  total: number;

  // ✅ Backend provided metrics
  eta: string | null;
  distance: string | null;

  timeline: TimelineStep[];
  items: { id: string; name: string; qty: number; price: number }[];
  rider?: {
    name: string;
    phone: string;
    vehicle: string;
  };
}

interface ApiError {
  message: string;
}

// --- Fetcher ---
const fetcher = async (url: string): Promise<OrderData> => {
  if (!API_URL) throw new Error("API URL not configured");

  // ✅ Use NextAuth getSession
  const session = await getSession();
  const token = (session as any)?.accessToken;

  if (!token) throw new Error("Authentication required");

  const res = await fetch(`${API_URL}${url}`, {
    headers: { Authorization: `Bearer ${token}` }, // ✅ Use NextAuth Token
  });

  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
};

export default function TrackOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  // --- Data Fetching ---
  const {
    data: order,
    error: fetchError,
    isLoading,
    mutate: updateOrder,
  } = useSWR<OrderData, ApiError>(
    orderId ? `/users/orders/${orderId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: true,
    },
  );

  // --- Socket Connection ---
  const connectSocket = useCallback(async () => {
    if (!API_URL || !orderId) return;
    if (socketRef.current?.connected) return;

    try {
      // ✅ Get Token from NextAuth Session
      const session = await getSession();
      const token = (session as any)?.accessToken;

      if (!token) {
        setConnectionError("Authentication failed");
        return;
      }

      const newSocket = io(API_URL, {
        auth: { token }, // ✅ Pass NextAuth Token to Socket
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        timeout: 10000,
      });

      newSocket.on("connect", () => {
        setSocketConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        newSocket.emit("joinOrderRoom", { orderId });
      });

      newSocket.on("disconnect", () => setSocketConnected(false));

      newSocket.on("connect_error", () => {
        setConnectionError("Connection lost. Retrying...");
        setReconnectAttempts((prev) => prev + 1);
      });

      // ✅ Listen for Smart Updates from Backend
      newSocket.on(`order_update_${orderId}`, (data: Partial<OrderData>) => {
        if (data.status)
          toast.info(`Status: ${data.status.replace(/_/g, " ")}`);

        updateOrder((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...data,
            // Merge timeline intelligently if needed, or just replace
            timeline: data.timeline || prev.timeline,
          };
        }, false);
      });

      // ✅ Listen for specific Trip Updates (ETA/Distance)
      newSocket.on(
        `trip_update_${orderId}`,
        (data: { eta: string; distance: string }) => {
          updateOrder(
            (prev) =>
              prev ? { ...prev, eta: data.eta, distance: data.distance } : prev,
            false,
          );
        },
      );

      socketRef.current = newSocket;
      setSocket(newSocket);
    } catch (error) {
      console.error("Socket error:", error);
      setConnectionError("Failed to connect");
    }
  }, [orderId, updateOrder]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectSocket]);

  // --- Render States ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (fetchError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Unable to Load Order</h2>
          <button
            onClick={() => router.back()}
            className="text-blue-600 underline"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20 px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Track Order
            {socketConnected && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </h1>
          <p className="text-xs text-gray-500">#{order.id.slice(0, 8)}</p>
        </div>
      </header>

      {/* Connection Warning */}
      {connectionError && !socketConnected && (
        <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-800 text-sm">
            <WifiOff className="w-4 h-4" />
            <span>{connectionError}</span>
          </div>
          <button
            onClick={() => connectSocket()}
            className="flex items-center gap-1 text-yellow-700 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* ✅ Smart Timeline Implementation */}
        <SmartTimeline
          status={order.status}
          eta={order.eta}
          distance={order.distance}
          timeline={order.timeline}
          isLive={socketConnected}
        />

        {/* Rider Info Card */}
        {order.rider && (
          <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{order.rider.name}</p>
                <p className="text-xs text-gray-500">{order.rider.vehicle}</p>
              </div>
            </div>
            <a
              href={`tel:${order.rider.phone}`}
              className="p-3 bg-green-50 text-green-600 rounded-full hover:bg-green-100"
            >
              <Phone className="w-5 h-5" />
            </a>
          </section>
        )}

        {/* Order Summary */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-900">Order Summary</h2>
          </div>
          <div className="space-y-3 mb-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  <span className="font-bold text-gray-900">x{item.qty}</span>{" "}
                  {item.name}
                </span>
                <span className="font-medium text-gray-900">
                  ₦{item.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CreditCard className="w-4 h-4" />
              <span>Paid via Card</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              ₦{order.total.toLocaleString()}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
