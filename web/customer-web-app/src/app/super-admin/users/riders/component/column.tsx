import React from "react";
import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { Rider } from "./types";
import {
  CheckCircle,
  Clock,
  Ban,
  AlertCircle,
  User,
  Car,
  Bike,
  Star,
  Phone,
  Eye,
  Trash2,
} from "lucide-react";

const columnHelper = createColumnHelper<Rider>();

// --- Visual Helpers (Unchanged) ---
export const getStatusColor = (status: string) => {
  switch (status) {
    case "Online":
      return "bg-green-500/20 text-green-500 border-green-500/20";
    case "Busy":
      return "bg-blue-500/20 text-blue-500 border-blue-500/20";
    case "Suspended":
      return "bg-red-500/20 text-red-500 border-red-500/20";
    case "Offline":
      return "bg-gray-500/20 text-gray-400 border-gray-500/20";
    default:
      return "bg-gray-700 text-gray-300";
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case "Online":
      return <CheckCircle className="w-3 h-3" />;
    case "Busy":
      return <Clock className="w-3 h-3" />;
    case "Suspended":
      return <Ban className="w-3 h-3" />;
    case "Offline":
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <User className="w-3 h-3" />;
  }
};

export const getVehicleIcon = (type: string) => {
  return type === "Car" ? (
    <Car className="w-4 h-4" />
  ) : (
    <Bike className="w-4 h-4" />
  );
};

export const getVerificationColor = (verification: string) => {
  return verification === "Verified"
    ? "bg-blue-500/20 text-blue-400 border-blue-500/20"
    : "bg-yellow-500/20 text-yellow-500 border-yellow-500/20";
};

// --- Column Generator ---
interface ColumnActions {
  onToggleStatus: (rider: Rider) => void;
  onDelete: (rider: Rider) => void;
}

export const createRiderColumns = ({
  onToggleStatus,
  onDelete,
}: ColumnActions) => [
  columnHelper.accessor("id", {
    header: "Rider ID",
    cell: (info) => (
      <Link
        href={`/super-admin/users/riders/${info.getValue()}`}
        className="font-mono text-yellow-500 hover:underline text-xs"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("name", {
    header: "Name / Phone",
    cell: (info) => (
      <div>
        <Link
          href={`/super-admin/users/riders/${info.row.original.id}`}
          className="font-bold text-white hover:text-yellow-500 block"
        >
          {info.getValue()}
        </Link>
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <Phone className="w-3 h-3" /> {info.row.original.phone}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("vehicle", {
    header: "Vehicle",
    cell: (info) => (
      <div className="flex items-center gap-2">
        <div
          className={`p-1.5 rounded-lg ${info.row.original.type === "Car" ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"}`}
        >
          {getVehicleIcon(info.row.original.type)}
        </div>
        <div>
          <div className="text-white font-medium">{info.getValue()}</div>
          <div className="text-xs text-gray-500 font-mono">
            {info.row.original.plate}
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <div className="flex items-center gap-1">
        {getStatusIcon(info.getValue())}
        <span
          className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(info.getValue())}`}
        >
          {info.getValue()}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor("verification", {
    header: "Verification",
    cell: (info) => (
      <span
        className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getVerificationColor(info.getValue())}`}
      >
        {info.getValue() === "Verified" ? "✓ Verified" : "⚠ Pending"}
      </span>
    ),
  }),
  columnHelper.accessor("rating", {
    header: "Rating",
    cell: (info) => (
      <div className="flex items-center gap-1 text-yellow-400">
        {info.getValue() ? info.getValue()?.toFixed(1) : "-"}
        <Star className="w-3 h-3 fill-yellow-400" />
      </div>
    ),
  }),
  columnHelper.accessor("rides", {
    header: "Total Rides",
    cell: (info) => (
      <span className="text-center font-mono text-white">
        {info.getValue()}
      </span>
    ),
  }),
  // FIX: Using columnHelper.display for proper type inference
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          href={`/super-admin/users/riders/${row.original.id}`}
          className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500"
        >
          <Eye className="w-4 h-4" />
        </Link>
        <button
          onClick={() => onToggleStatus(row.original)}
          className={`p-2 rounded-lg ${row.original.status === "Suspended" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
        >
          {row.original.status === "Suspended" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Ban className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onDelete(row.original)}
          className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ),
  }),
];
