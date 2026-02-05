import React from "react";
import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { Activity, Alert } from "./data";
import {
  Clock,
  ShoppingCart,
  Car,
  Package,
  Truck,
  Users,
  ExternalLink,
  AlertCircle,
  Eye,
  MoreHorizontal,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

const columnHelperActivity = createColumnHelper<Activity>();
const columnHelperAlert = createColumnHelper<Alert>();

// --- Helpers ---

export const getActivityIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case "order":
      return <ShoppingCart className="w-4 h-4 text-blue-400" />;
    case "ride":
      return <Car className="w-4 h-4 text-orange-400" />;
    case "vendor":
      return <Package className="w-4 h-4 text-purple-400" />;
    case "delivery":
      return <Truck className="w-4 h-4 text-indigo-400" />;
    case "customer":
      return <Users className="w-4 h-4 text-green-400" />;
    case "dispute":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case "verification":
      return <ShieldCheck className="w-4 h-4 text-yellow-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

export const getSeverityColor = (severity: string) => {
  switch (severity?.toUpperCase()) {
    case "HIGH":
      return "bg-red-500/20 text-red-500 border-red-500/20";
    case "MEDIUM":
      return "bg-orange-500/20 text-orange-500 border-orange-500/20";
    case "LOW":
      return "bg-yellow-500/20 text-yellow-500 border-yellow-500/20";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/20";
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "New":
      return "bg-blue-500/20 text-blue-400";
    case "Ack":
      return "bg-yellow-500/20 text-yellow-400";
    case "Resolved":
      return "bg-green-500/20 text-green-400";
    case "Investigating":
      return "bg-purple-500/20 text-purple-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
};

/**
 * ✅ ROUTING FIX: Maps entity types to correct file system paths
 */
export const getActivityLink = (activity: Activity) => {
  if (!activity.entityId) return "#";

  // Normalize type string
  const type = (activity.entityType || activity.type || "").toLowerCase();

  switch (true) {
    case type.includes("vendor"):
      return `/super-admin/users/vendors/${activity.entityId}`;

    case type.includes("customer"):
      return `/super-admin/users/customers/${activity.entityId}`;

    case type.includes("rider"):
      return `/super-admin/users/riders/${activity.entityId}`;

    case type.includes("order"):
      return `/super-admin/orders/${activity.entityId}`;

    case type.includes("ride"):
      return `/super-admin/rides/${activity.entityId}`;

    case type.includes("delivery"):
      return `/super-admin/deliveries/${activity.entityId}`;

    case type.includes("dispute"):
      return `/super-admin/disputes/${activity.entityId}`;

    case type.includes("verification"):
      // Links to the new deep-linked verification page
      return `/super-admin/verification?id=${activity.entityId}`;

    case type.includes("transaction"):
      return `/super-admin/transactions/${activity.entityId}`;

    default:
      // Fallback for unknown types
      return "#";
  }
};

// --- Activity Columns ---
export const createActivityColumns = () => [
  columnHelperActivity.accessor("time", {
    header: "Timestamp",
    cell: (info) => {
      try {
        return (
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="font-mono text-gray-400 text-xs">
              {formatDistanceToNow(parseISO(info.getValue()), {
                addSuffix: true,
              })}
            </span>
          </div>
        );
      } catch (e) {
        return <span className="text-gray-500 text-xs">-</span>;
      }
    },
  }),
  columnHelperActivity.accessor("event", {
    header: "Event",
    cell: (info) => (
      <div className="flex items-center gap-2">
        {getActivityIcon(info.row.original.type)}
        <span className="font-medium text-white">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelperActivity.accessor("entity", {
    header: "User/Entity",
    cell: (info) => (
      <span className="text-gray-300 font-medium">{info.getValue()}</span>
    ),
  }),
  {
    id: "actions",
    header: "Action",
    cell: ({ row }: { row: any }) => {
      const link = getActivityLink(row.original);
      const isClickable = link !== "#";

      return (
        <div className="flex items-center gap-2">
          {isClickable ? (
            <Link href={link}>
              <button className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 font-bold text-xs transition-colors border border-yellow-500/20">
                <ExternalLink className="w-3 h-3" />
                {row.original.action || "View Details"}
              </button>
            </Link>
          ) : (
            <span className="text-xs text-gray-500 italic">No details</span>
          )}
        </div>
      );
    },
  },
];

// --- Alert Columns ---
interface AlertActions {
  onResolve: (id: string) => void;
}

export const createAlertColumns = ({ onResolve }: AlertActions) => [
  columnHelperAlert.accessor("severity", {
    header: "Severity",
    cell: (info) => (
      <span
        className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getSeverityColor(info.getValue())}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelperAlert.accessor("message", {
    header: "Alert",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-white">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelperAlert.accessor("category", {
    header: "Category",
    cell: (info) => (
      <span className="text-gray-400 text-xs">{info.getValue()}</span>
    ),
  }),
  columnHelperAlert.accessor("time", {
    header: "Time",
    cell: (info) => (
      <span className="text-gray-400 text-xs font-mono">
        {formatDistanceToNow(parseISO(info.getValue()), { addSuffix: true })}
      </span>
    ),
  }),
  columnHelperAlert.accessor("status", {
    header: "Status",
    cell: (info) => (
      <span
        className={`px-2 py-1 rounded text-xs ${getStatusColor(info.getValue())}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }: { row: any }) => {
      // Use the same robust link helper for alerts
      const link = getActivityLink({
        ...row.original,
        entityId: row.original.entityId,
        type: row.original.entityType,
      } as any);

      return (
        <div className="flex items-center gap-2">
          <Link href={link}>
            <button
              className="p-1.5 hover:bg-blue-500/10 rounded text-gray-400 hover:text-blue-500 transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </Link>
          <button
            onClick={() => onResolve(row.original.id)}
            className={`px-3 py-1 rounded font-bold text-xs transition-colors ${
              row.original.status === "New"
                ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                : "bg-green-500 hover:bg-green-400 text-black"
            }`}
          >
            {row.original.status === "New" ? "Resolve" : "Reopen"}
          </button>
        </div>
      );
    },
  },
];

// --- Mobile Cards ---
export const renderActivityMobileCard = (activity: Activity) => {
  const link = getActivityLink(activity);
  const isClickable = link !== "#";

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="font-mono text-gray-400 text-xs">
            {formatDistanceToNow(parseISO(activity.time), { addSuffix: true })}
          </span>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs uppercase border border-gray-700 bg-gray-800 text-gray-300`}
        >
          {activity.type}
        </span>
      </div>
      <div className="flex items-start gap-3 mb-4 text-sm">
        <div className="p-2 bg-gray-800/50 rounded-lg mt-0.5 border border-gray-700">
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1">
          <p className="font-bold text-white">{activity.event}</p>
          <p className="text-gray-400 text-xs mt-1">{activity.entity}</p>
        </div>
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-gray-800">
        {isClickable ? (
          <Link href={link} className="flex-1">
            <button className="flex items-center gap-2 text-yellow-500 hover:text-yellow-400 font-bold text-xs transition-colors">
              <ExternalLink className="w-3 h-3" />{" "}
              {activity.action || "View Details"}
            </button>
          </Link>
        ) : (
          <span className="text-xs text-gray-600 italic">
            No details available
          </span>
        )}
        <button className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const renderAlertMobileCard = (alert: Alert) => {
  const link = getActivityLink({
    ...alert,
    entityId: alert.entityId,
    type: alert.entityType,
  } as any);

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <span
          className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getSeverityColor(alert.severity)}`}
        >
          {alert.severity}
        </span>
        <span
          className={`px-2 py-1 rounded text-xs ${getStatusColor(alert.status)}`}
        >
          {alert.status}
        </span>
      </div>
      <div className="flex items-start gap-3 mb-4 text-sm">
        <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-white leading-snug">{alert.message}</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-gray-400 text-xs bg-gray-800 px-1.5 py-0.5 rounded">
              Cat: {alert.category}
            </span>
            <span className="text-gray-500 text-xs">•</span>
            <span className="text-gray-400 text-xs font-mono">
              {formatDistanceToNow(parseISO(alert.time), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-3 border-t border-gray-800">
        <Link href={link} className="flex-1">
          <button className="w-full flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm font-bold">
            <Eye className="w-4 h-4" /> View
          </button>
        </Link>
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold ${alert.status === "New" ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-green-500 text-black hover:bg-green-400"}`}
        >
          {alert.status === "New" ? "Resolve" : "Reopen"}
        </button>
      </div>
    </div>
  );
};
