"use client";

import React, { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/app/super-admin/hooks/useSuperAdminFetch";
import {
  X,
  ExternalLink,
  Wifi,
  WifiOff,
  Car,
  Bike,
  Clock,
  Phone,
  Briefcase,
  RefreshCw,
  Users,
} from "lucide-react";

// ── Dynamic import so the Google Maps JS API only loads client-side ──────────
const LiveMapCanvas = dynamic(() => import("./LiveMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-[#1E293B] flex items-center justify-center">
      <p className="text-gray-500 text-sm animate-pulse font-bold uppercase tracking-widest">
        Loading map…
      </p>
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────
export interface LiveMapUser {
  id: string;
  name: string;
  image: string | null;
  phone: string | null;
  plateNumber: string | null;
  role: "DRIVER" | "RIDER";
  status: string;
  lastSeen: number;
  lat: number;
  lng: number;
  currentJobId: string | null;
  currentJobType: string | null;
  pendingJobId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatLastSeen(ms: number): string {
  if (!ms) return "Unknown";
  const diff = Date.now() - ms;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

// ── Detail Sidebar ────────────────────────────────────────────────────────────
function UserDetailPanel({
  user,
  onClose,
}: {
  user: LiveMapUser;
  onClose: () => void;
}) {
  const isDriver = user.role === "DRIVER";
  const isOnline = user.status === "ONLINE" || user.status === "ACTIVE";
  const hasActiveJob = Boolean(user.currentJobId);
  const hasPendingJob = Boolean(user.pendingJobId);
  const dossierPath = isDriver
    ? `/super-admin/users/drivers/${user.id}`
    : `/super-admin/users/riders/${user.id}`;

  return (
    <div className="w-80 shrink-0 bg-[#1E293B] border-r border-gray-800 flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
          {isDriver ? "Driver" : "Rider"} Detail
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden border-2 ${
                isDriver ? "border-blue-500" : "border-red-500"
              } bg-slate-700`}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white">{user.name.charAt(0)}</span>
              )}
            </div>
            {/* Online dot */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1E293B] ${
                isOnline ? "bg-green-400 animate-pulse" : "bg-gray-500"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm truncate">
              {user.name}
            </h3>
            <p className="text-gray-500 text-[10px] font-mono truncate">
              {user.id}
            </p>
          </div>
        </div>

        {/* Role + Status badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
              isDriver
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {isDriver ? (
              <Car className="w-3 h-3" />
            ) : (
              <Bike className="w-3 h-3" />
            )}
            {user.role}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${
              isOnline
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : user.status === "ACTIVE"
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/20"
            }`}
          >
            {isOnline ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {user.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-5 space-y-3 border-b border-gray-800">
        {user.phone && (
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Phone className="w-4 h-4 text-gray-500 shrink-0" />
            <span>{user.phone}</span>
          </div>
        )}
        {user.plateNumber && (
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Car className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="font-mono uppercase tracking-wider">
              {user.plateNumber}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <Clock className="w-4 h-4 text-gray-500 shrink-0" />
          <span>
            Last seen:{" "}
            <span className="text-white font-bold">
              {formatLastSeen(user.lastSeen)}
            </span>
          </span>
        </div>
      </div>

      {/* Active / Pending Job */}
      <div className="p-5 flex-1">
        <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-3">
          Job Status
        </h4>

        {hasActiveJob ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
                Active Job
              </span>
            </div>
            <p className="text-white text-xs font-mono">{user.currentJobId}</p>
            <p className="text-gray-400 text-[10px] mt-1 capitalize">
              Type:{" "}
              <span className="text-white font-bold">
                {user.currentJobType}
              </span>
            </p>
            {/* Deep link to the ride or order */}
            {user.currentJobType === "ride" && (
              <Link
                href={`/super-admin/rides/${user.currentJobId}`}
                className="mt-3 flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> View Ride
              </Link>
            )}
            {user.currentJobType === "delivery" && (
              <Link
                href={`/super-admin/deliveries/${user.currentJobId}`}
                className="mt-3 flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> View Delivery
              </Link>
            )}
          </div>
        ) : hasPendingJob ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
                Pending Assignment
              </span>
            </div>
            <p className="text-white text-xs font-mono">{user.pendingJobId}</p>
          </div>
        ) : (
          <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 flex items-center gap-3 text-gray-500">
            <Wifi className="w-4 h-4" />
            <span className="text-xs font-bold">
              {isOnline ? "Available — no active job" : "Offline / Idle"}
            </span>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="p-4 border-t border-gray-800">
        <Link
          href={dossierPath}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-xl transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open Full Dossier
        </Link>
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Pill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${color}`}
    >
      <span>{count}</span>
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LiveMapPage() {
  const [selectedUser, setSelectedUser] = useState<LiveMapUser | null>(null);

  const {
    data: users,
    isLoading,
    error,
    mutate,
    isValidating,
  } = useSWR<LiveMapUser[]>("/super-admin/maps/live", fetcher, {
    refreshInterval: 10_000,
    keepPreviousData: true,
  });

  const allUsers = users ?? [];
  const drivers = allUsers.filter((u) => u.role === "DRIVER");
  const riders = allUsers.filter((u) => u.role === "RIDER");
  const online = allUsers.filter(
    (u) => u.status === "ONLINE" || u.status === "ACTIVE",
  );
  const offline = allUsers.filter((u) => u.status === "OFFLINE");
  const active = allUsers.filter((u) => u.currentJobId);

  const handleMarkerClick = useCallback((user: LiveMapUser) => {
    setSelectedUser(user);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-[#1E293B] shrink-0">
        <div>
          <h1 className="text-sm font-bold text-white uppercase tracking-widest">
            Live Fleet Map
          </h1>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Real-time positions from matching service — auto-refreshes every 10s
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-4 mr-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
              <span className="text-[10px] text-gray-400 font-bold uppercase">
                Driver
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
              <span className="text-[10px] text-gray-400 font-bold uppercase">
                Rider
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 opacity-60 shadow" />
              <span className="text-[10px] text-gray-600 font-bold uppercase">
                Offline
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 border-2 border-yellow-400 shadow" />
              <span className="text-[10px] text-gray-400 font-bold uppercase">
                On Job
              </span>
            </div>
          </div>

          {/* Stat pills */}
          <div className="hidden md:flex items-center gap-2">
            <Pill
              label="Drivers"
              count={drivers.length}
              color="bg-blue-500/10 text-blue-400 border-blue-500/20"
            />
            <Pill
              label="Riders"
              count={riders.length}
              color="bg-red-500/10 text-red-400 border-red-500/20"
            />
            <Pill
              label="Online"
              count={online.length}
              color="bg-green-500/10 text-green-400 border-green-500/20"
            />
            <Pill
              label="Offline"
              count={offline.length}
              color="bg-red-500/10 text-red-400 border-red-500/20"
            />
            <Pill
              label="On Job"
              count={active.length}
              color="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            />
          </div>

          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className={`p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:bg-white/5 transition-all ${
              isValidating ? "animate-spin text-yellow-500" : ""
            }`}
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && !isLoading && (
        <div className="shrink-0 flex items-center gap-2 px-5 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs font-bold">
          <WifiOff className="w-4 h-4 shrink-0" />
          Failed to load fleet data — showing last known positions. Auto-retrying…
        </div>
      )}

      {/* Body: sidebar + map */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left detail panel */}
        {selectedUser && (
          <UserDetailPanel
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}

        {/* Map */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center bg-[#0F172A]">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <Users className="w-10 h-10 opacity-20 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest">
                Loading fleet data…
              </p>
            </div>
          </div>
        ) : (
          <LiveMapCanvas users={allUsers} onMarkerClick={handleMarkerClick} />
        )}
      </div>
    </div>
  );
}
