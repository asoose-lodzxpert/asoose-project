import React from "react";
import Link from "next/link";
import {
  CheckCircle,
  Info,
  AlertTriangle,
  Truck,
  Check,
  CreditCard,
  Car,
  ExternalLink,
  User,
} from "lucide-react";
import { formatAbsoluteTimestamp } from "@/services/formatters/absolute-timestamp.formatter";
import { Notification } from "../types";

interface NotificationProps {
  notification: Notification;
  onRead: (id: string) => void;
}

/** Resolve a deep-link path from the notification metadata */
function resolveDetailLink(type: string, metadata?: Record<string, any>): string | null {
  if (!metadata) return null;
  // Dispute notifications always link to the dispute page
  if (metadata.disputeId) return `/super-admin/disputes/${metadata.disputeId}`;
  if (type === "ORDER"    && metadata.orderId)    return `/super-admin/orders/${metadata.orderId}`;
  if (type === "DELIVERY" && metadata.deliveryId) return `/super-admin/deliveries/${metadata.deliveryId}`;
  if (type === "RIDE"     && metadata.rideId)     return `/super-admin/rides/${metadata.rideId}`;
  return null;
}

export default function NotificationCard({
  notification,
  onRead,
}: NotificationProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "ORDER":    return <Truck       className="w-5 h-5 text-blue-400"    />;
      case "RIDE":     return <Car         className="w-5 h-5 text-purple-400"  />;
      case "DELIVERY": return <Truck       className="w-5 h-5 text-orange-400"  />;
      case "ALERT":    return <AlertTriangle className="w-5 h-5 text-red-400"   />;
      case "SUCCESS":  return <CheckCircle className="w-5 h-5 text-green-400"   />;
      case "PAYMENT":  return <CreditCard  className="w-5 h-5 text-emerald-400" />;
      default:         return <Info        className="w-5 h-5 text-yellow-400"  />;
    }
  };

  const detailLink = resolveDetailLink(notification.type, notification.metadata);

  return (
    <div
      className={`
        relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ease-in-out
        ${notification.isRead
          ? "bg-[#1E293B]/50 border-gray-800 opacity-60 hover:opacity-100"
          : "bg-[#1E293B] border-yellow-500/30 shadow-lg shadow-black/20 translate-x-1"
        }
      `}
    >
      {/* Icon */}
      <div className={`p-2 rounded-lg bg-gray-800 shrink-0 ${!notification.isRead && "animate-pulse"}`}>
        {getIcon(notification.type)}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <h4 className={`text-sm font-semibold mb-0.5 ${notification.isRead ? "text-gray-300" : "text-white"}`}>
            {notification.title}
          </h4>
          <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0">
            {formatAbsoluteTimestamp(notification.createdAt)}
          </span>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl break-words">
          {notification.message}
        </p>

        {/* Recipient chip */}
        {notification.recipientName && (
          <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded-full">
            <User className="w-3 h-3" />
            {notification.recipientName}
          </span>
        )}

        {/* Deep-link */}
        {detailLink && (
          <Link
            href={detailLink}
            className="inline-flex items-center gap-1 mt-2 ml-2 text-[10px] text-yellow-500 hover:text-yellow-400 font-medium"
          >
            View detail <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Mark-as-read button */}
      {!notification.isRead && (
        <button
          onClick={() => onRead(notification.id)}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-green-400 transition-colors"
          title="Mark as read"
        >
          <Check className="w-4 h-4" />
        </button>
      )}

      {/* Unread dot */}
      {!notification.isRead && (
        <span className="absolute top-3 right-2 w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
      )}
    </div>
  );
}
