"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  ShoppingBag,
  Car,
  Package,
  ExternalLink,
  Calendar,
  Flag,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { io, Socket } from "socket.io-client";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

const SOCKET_URL = API_URL.replace("/api/v1", "");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

const STATUS_STYLES: Record<string, { chip: string; icon: React.ReactNode }> = {
  OPEN: {
    chip: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20",
    icon: <ShieldAlert className="w-4 h-4" />,
  },
  RESOLVED: {
    chip: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-500/20",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  REJECTED: {
    chip: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/20",
    icon: <XCircle className="w-4 h-4" />,
  },
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
};

function CategoryIcon({ category }: { category: string }) {
  if (category === "Order") return <ShoppingBag className="w-5 h-5" />;
  if (category === "Ride") return <Car className="w-5 h-5" />;
  if (category === "Delivery") return <Package className="w-5 h-5" />;
  return <ShieldAlert className="w-5 h-5" />;
}

function associatedEntityLink(dispute: any) {
  if (dispute.orderId)
    return { label: "View Order", href: `/main/orders/${dispute.orderId}` };
  if (dispute.deliveryId)
    return {
      label: "View Delivery",
      href: `/main/deliveries/${dispute.deliveryId}`,
    };
  if (dispute.rideId)
    return { label: "View Ride", href: `/main/rides/${dispute.rideId}` };
  return null;
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------
function MessageBubble({
  message,
  currentUserId,
}: {
  message: any;
  currentUserId: string;
}) {
  const isMe = message.sender?.id === currentUserId;
  const isSupport = ["SUPER_ADMIN", "ADMIN_MANAGER", "ADMIN_SUPPORT"].includes(
    message.sender?.role,
  );
  return (
    <div className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
          isSupport
            ? "bg-yellow-500 text-black"
            : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300"
        }`}
      >
        {isSupport ? "S" : (message.sender?.name?.[0] ?? "?").toUpperCase()}
      </div>
      <div
        className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}
      >
        {!isMe && (
          <p className="text-[10px] text-gray-400 font-semibold ml-1">
            {isSupport ? "Support Team" : (message.sender?.name ?? "Unknown")}
          </p>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm ${
            isMe
              ? "bg-yellow-500 text-black rounded-tr-sm"
              : "bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200 rounded-tl-sm"
          }`}
        >
          {message.message}
        </div>
        <p className="text-[10px] text-gray-400 mx-1">
          {fmtDate(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const disputeId = params.id as string;
  const currentUserId = (session?.user as any)?.id ?? "";

  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Real-time socket — refresh messages when admin replies
  useEffect(() => {
    if (status !== "authenticated" || !disputeId) return;

    const token = (session as any)?.accessToken;
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("dispute:message", (payload: { disputeId: string }) => {
      if (payload.disputeId !== disputeId) return;
      // Refresh the SWR data to pick up the new message
      mutate();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, disputeId, session]);

  const fetcher = async (url: string) => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
      throw new Error("Not authenticated");
    }
    const token = (session as any)?.accessToken;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to load dispute");
    }
    return res.json();
  };

  const shouldFetch =
    status === "authenticated" && disputeId
      ? `${API_URL}/super-admin/disputes/${disputeId}`
      : null;

  const {
    data: dispute,
    error,
    isLoading,
    mutate,
  } = useSWR(shouldFetch, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    setIsSending(true);
    try {
      const token = (session as any)?.accessToken;
      const res = await fetch(
        `${API_URL}/super-admin/disputes/${disputeId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: messageText.trim() }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to send message");
      }
      setMessageText("");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const entityLink = useMemo(
    () => (dispute ? associatedEntityLink(dispute) : null),
    [dispute],
  );
  const statusStyle = dispute
    ? (STATUS_STYLES[dispute.status] ?? STATUS_STYLES.OPEN)
    : STATUS_STYLES.OPEN;

  // ---------- Loading ----------
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  // ---------- Error ----------
  if (error || !dispute) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-[#151515] rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Dispute not found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
          {error?.message || "We could not locate this dispute record."}
        </p>
        <Link
          href="/main/profile"
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
        >
          Back to Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-gray-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-4 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white dark:bg-[#151515] rounded-full flex items-center justify-center border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold">Dispute Details</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              #{dispute.id.split("-")[0].toUpperCase()}
            </p>
          </div>
          <span
            title={socketConnected ? "Live updates active" : "Connecting…"}
            className="ml-auto"
          >
            {socketConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-400" />
            )}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${statusStyle.chip}`}
          >
            {statusStyle.icon}
            {dispute.status}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Overview */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 dark:text-red-400 shrink-0">
                <CategoryIcon category={dispute.category ?? "General"} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                  {dispute.category ?? "General"} Dispute
                </p>
                <h2 className="font-bold text-base">{dispute.reason}</h2>
              </div>
            </div>
            {dispute.priority && (
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 ${PRIORITY_STYLES[dispute.priority] ?? PRIORITY_STYLES.LOW}`}
              >
                {dispute.priority}
              </span>
            )}
          </div>

          {dispute.description && (
            <div className="pt-4 border-t border-gray-50 dark:border-white/5">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">
                Description
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {dispute.description}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-50 dark:border-white/5 grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Filed
                </p>
                <p>{fmtDate(dispute.createdAt)}</p>
              </div>
            </div>
            {dispute.updatedAt && dispute.updatedAt !== dispute.createdAt && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Last Updated
                  </p>
                  <p>{fmtDate(dispute.updatedAt)}</p>
                </div>
              </div>
            )}
            {dispute.resolvedAt && (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 shrink-0 text-green-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {dispute.status === "RESOLVED" ? "Resolved" : "Closed"}
                  </p>
                  <p>{fmtDate(dispute.resolvedAt)}</p>
                </div>
              </div>
            )}
            {dispute.status === "OPEN" && (
              <div className="flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 shrink-0 text-yellow-500" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Time Open
                  </p>
                  <p>{dispute.hoursOpen ?? 0}h</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Associated entity link */}
        {entityLink && (
          <div className="bg-white dark:bg-[#151515] rounded-3xl p-5 border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-0.5">
                Related to
              </p>
              <p className="text-sm font-bold">
                {dispute.orderId
                  ? `Order #${dispute.orderId.split("-")[0].toUpperCase()}`
                  : dispute.deliveryId
                    ? `Delivery #${dispute.deliveryId.split("-")[0].toUpperCase()}`
                    : `Ride #${dispute.rideId?.split("-")[0].toUpperCase()}`}
              </p>
            </div>
            <Link
              href={entityLink.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {entityLink.label}
            </Link>
          </div>
        )}

        {/* Resolution / rejection note */}
        {(dispute.status === "RESOLVED" || dispute.status === "REJECTED") &&
          (dispute.resolution || dispute.resolutionNote) && (
            <div
              className={`rounded-3xl p-5 border shadow-sm ${
                dispute.status === "RESOLVED"
                  ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20"
                  : "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {dispute.status === "RESOLVED" ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <p
                  className={`text-xs font-bold uppercase tracking-widest ${dispute.status === "RESOLVED" ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                >
                  {dispute.status === "RESOLVED"
                    ? "Resolution Note"
                    : "Rejection Reason"}
                </p>
              </div>
              <p
                className={`text-sm leading-relaxed ${dispute.status === "RESOLVED" ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"}`}
              >
                {dispute.resolution ?? dispute.resolutionNote}
              </p>
            </div>
          )}

        {/* Evidence images */}
        {dispute.evidenceImages?.length > 0 && (
          <div className="bg-white dark:bg-[#151515] rounded-3xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">
              Evidence Photos
            </p>
            <div className="grid grid-cols-2 gap-3">
              {dispute.evidenceImages.map((url: string, i: number) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 hover:opacity-90 transition-opacity"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Messages thread */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-yellow-500" />
            Conversation
          </h2>

          {!dispute.messages || dispute.messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-gray-200 dark:text-white/10 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No messages yet.</p>
              {dispute.canAddMessage && (
                <p className="text-xs text-gray-400 mt-1">
                  Send a message below to start the conversation.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(dispute.messages ?? []).map((msg: any) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}

          {dispute.canAddMessage && (
            <div className="mt-5 pt-5 border-t border-gray-50 dark:border-white/5">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">
                Send a Message
              </p>
              <div className="flex gap-3 items-end">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message to support..."
                  rows={3}
                  className="flex-1 p-4 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl border border-transparent focus:border-yellow-500 outline-none resize-none text-sm placeholder:text-gray-400 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isSending || !messageText.trim()}
                  className="h-12 w-12 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 ml-1">
                Ctrl+Enter to send
              </p>
            </div>
          )}

          {!dispute.canAddMessage && dispute.status !== "OPEN" && (
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 text-center">
              <p className="text-xs text-gray-400 font-medium">
                This dispute is closed. No further messages can be added.
              </p>
            </div>
          )}
        </div>

        {/* Filed by */}
        {dispute.openedByUser && (
          <div className="bg-white dark:bg-[#151515] rounded-3xl p-5 border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-black shrink-0">
              {(dispute.openedByUser.name?.[0] ?? "U").toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-0.5">
                Filed by
              </p>
              <p className="text-sm font-bold">{dispute.openedByUser.name}</p>
              <p className="text-xs text-gray-500">
                {dispute.openedByUser.email}
              </p>
            </div>
          </div>
        )}

        <Link
          href="/main/profile"
          className="w-full py-4 bg-yellow-500 text-black font-bold text-center rounded-xl hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10 block"
        >
          Back to Profile
        </Link>
      </div>
    </div>
  );
}
