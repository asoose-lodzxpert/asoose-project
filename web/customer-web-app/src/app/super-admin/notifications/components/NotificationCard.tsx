import React from "react";
import {
  CheckCircle,
  Info,
  AlertTriangle,
  Truck,
  Check,
  CreditCard,
  Car,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Notification } from "../types";

interface NotificationProps {
  notification: Notification;
  onRead: (id: string) => void;
}

export default function NotificationCard({
  notification,
  onRead,
}: NotificationProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "ORDER":
        return <Truck className="w-5 h-5 text-blue-400" />;
      case "RIDE":
        return <Car className="w-5 h-5 text-purple-400" />;
      case "ALERT":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case "SUCCESS":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "PAYMENT":
        return <CreditCard className="w-5 h-5 text-emerald-400" />;
      default:
        return <Info className="w-5 h-5 text-yellow-400" />;
    }
  };

  return (
    <div
      className={`
      relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ease-in-out
      ${
        notification.isRead
          ? "bg-[#1E293B]/50 border-gray-800 opacity-60 hover:opacity-100"
          : "bg-[#1E293B] border-yellow-500/30 shadow-lg shadow-black/20 translate-x-1"
      }
    `}
    >
      <div
        className={`p-2 rounded-lg bg-gray-800 shrink-0 ${!notification.isRead && "animate-pulse"}`}
      >
        {getIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4
            className={`text-sm font-semibold mb-1 truncate ${notification.isRead ? "text-gray-300" : "text-white"}`}
          >
            {notification.title}
          </h4>
          <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2 shrink-0">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl break-words">
          {notification.message}
        </p>
      </div>

      {!notification.isRead && (
        <button
          onClick={() => onRead(notification.id)}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-green-400 transition-colors group"
          title="Mark as read"
        >
          <Check className="w-4 h-4" />
        </button>
      )}

      {!notification.isRead && (
        <span className="absolute top-4 right-2 w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
      )}
    </div>
  );
}
