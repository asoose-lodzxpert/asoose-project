"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/app/super-admin/hooks/useSuperAdminFetch";
import {
  Car,
  Bike,
  Phone,
  Wifi,
  WifiOff,
  Briefcase,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Search,
  Copy,
  CheckCheck,
  Navigation2,
  Users,
  Route,
  Signal,
  SignalZero,
  ChevronRight,
} from "lucide-react";

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

type FilterStatus = "ALL" | "ONLINE" | "OFFLINE" | "ON_JOB";
type ActiveTab = "ALL" | "DRIVERS" | "RIDERS";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatLastSeen(ms: number): string {
  if (!ms) return "Unknown";
  const diff = Date.now() - ms;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatCoords(lat: number, lng: number): string {
  if (!lat || !lng) return "Location unavailable";
  return `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
}

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function isOnline(user: LiveMapUser): boolean {
  return user.status === "ONLINE" || user.status === "ACTIVE";
}

function hasLocation(user: LiveMapUser): boolean {
  return Boolean(user.lat && user.lng);
}

// ── Copy-to-clipboard mini hook ───────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  return { copied, copy };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatBadge({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color} flex-1 min-w-[120px]`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <div>
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Person Card ───────────────────────────────────────────────────────────────
function PersonCard({ user }: { user: LiveMapUser }) {
  const { copied, copy } = useCopy();
  const online = isOnline(user);
  const hasLoc = hasLocation(user);
  const isDriver = user.role === "DRIVER";
  const hasActiveJob = Boolean(user.currentJobId);
  const hasPendingJob = Boolean(user.pendingJobId);
  const coords = formatCoords(user.lat, user.lng);
  const dossierPath = isDriver
    ? `/super-admin/users/drivers/${user.id}`
    : `/super-admin/users/riders/${user.id}`;

  return (
    <div
      className={`relative bg-[#1E293B] rounded-2xl border ${
        online ? "border-gray-700" : "border-gray-800 opacity-75"
      } overflow-hidden transition-all hover:border-gray-600 hover:shadow-xl hover:shadow-black/30 group`}
    >
      {/* Status strip */}
      <div
        className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${
          hasActiveJob
            ? "bg-yellow-500"
            : online
              ? "bg-green-500"
              : "bg-gray-600"
        }`}
      />

      <div className="pl-4 pr-4 pt-4 pb-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black overflow-hidden border-2 ${
                isDriver
                  ? "border-blue-500 bg-blue-500/20 text-blue-400"
                  : "border-amber-500 bg-amber-500/20 text-amber-400"
              }`}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            {/* Status indicator dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1E293B] ${
                online ? "bg-green-400" : "bg-gray-500"
              }`}
            />
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-bold text-sm truncate">
                {user.name}
              </h3>
              <span
                className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                  isDriver
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {isDriver ? (
                  <Car className="w-2.5 h-2.5" />
                ) : (
                  <Bike className="w-2.5 h-2.5" />
                )}
                {isDriver ? "Driver" : "Rider"}
              </span>
              <span
                className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                  hasActiveJob
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    : online
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-gray-500/10 text-gray-400 border-gray-700"
                }`}
              >
                {hasActiveJob ? (
                  <Briefcase className="w-2.5 h-2.5" />
                ) : online ? (
                  <Signal className="w-2.5 h-2.5" />
                ) : (
                  <SignalZero className="w-2.5 h-2.5" />
                )}
                {hasActiveJob ? "On Job" : online ? "Online" : "Offline"}
              </span>
            </div>
            {/* Last seen */}
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              Last seen:{" "}
              <span className="text-gray-400 font-semibold">
                {formatLastSeen(user.lastSeen)}
              </span>
            </p>
          </div>

          {/* Quick profile link (appears on hover) */}
          <Link
            href={dossierPath}
            className="p-1.5 rounded-lg text-gray-600 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all shrink-0 opacity-0 group-hover:opacity-100"
            title="Open full profile"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mb-3" />

        {/* Details */}
        <div className="space-y-2">
          {/* Phone */}
          {user.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <a
                href={`tel:${user.phone}`}
                className="text-xs text-gray-300 hover:text-white transition-colors font-mono"
              >
                {user.phone}
              </a>
            </div>
          )}

          {/* Plate */}
          {user.plateNumber && (
            <div className="flex items-center gap-2">
              <Car className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-xs font-mono font-bold tracking-widest text-gray-300 bg-gray-800 px-2 py-0.5 rounded uppercase">
                {user.plateNumber}
              </span>
            </div>
          )}

          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
            {hasLoc ? (
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-300 font-mono break-all">
                  {coords}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => copy(coords, user.id + "_coords")}
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-yellow-400 transition-colors"
                  >
                    {copied === user.id + "_coords" ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                  <span className="text-gray-700">·</span>
                  <a
                    href={mapsUrl(user.lat, user.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-400 transition-colors"
                  >
                    <Navigation2 className="w-3 h-3" />
                    View on Maps
                  </a>
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-600 italic">
                No location data
              </span>
            )}
          </div>
        </div>

        {/* Active / Pending Job */}
        {(hasActiveJob || hasPendingJob) && (
          <div className="mt-3">
            <div
              className={`rounded-xl p-3 flex items-start gap-3 ${
                hasActiveJob
                  ? "bg-yellow-500/10 border border-yellow-500/20"
                  : "bg-gray-800/60 border border-gray-700"
              }`}
            >
              <Briefcase
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  hasActiveJob ? "text-yellow-400" : "text-gray-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    hasActiveJob ? "text-yellow-400" : "text-gray-400"
                  }`}
                >
                  {hasActiveJob ? "Active Job" : "Pending Assignment"}
                </p>
                <p className="text-white text-xs font-mono truncate mt-0.5">
                  {user.currentJobId || user.pendingJobId}
                </p>
                {hasActiveJob && user.currentJobType && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-gray-400 text-[10px] capitalize">
                      Type:{" "}
                      <span className="text-white font-bold">
                        {user.currentJobType}
                      </span>
                    </span>
                    {user.currentJobType === "ride" && (
                      <Link
                        href={`/super-admin/rides/${user.currentJobId}`}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> View Ride
                      </Link>
                    )}
                    {user.currentJobType === "delivery" && (
                      <Link
                        href={`/super-admin/deliveries/${user.currentJobId}`}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> View Delivery
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA — visible on hover */}
      <div className="px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={dossierPath}
          className="flex items-center justify-center gap-2 w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-[10px] font-black rounded-lg transition-all uppercase tracking-wider"
        >
          <ExternalLink className="w-3 h-3" /> Open Full Profile
        </Link>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-600">
      <Users className="w-12 h-12 mb-3 opacity-20" />
      <p className="text-sm font-bold">{message}</p>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-[#1E293B] rounded-2xl border border-gray-800 p-4 animate-pulse">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-700 rounded w-2/3" />
          <div className="h-2.5 bg-gray-800 rounded w-1/2" />
        </div>
      </div>
      <div className="border-t border-gray-800 mb-3" />
      <div className="space-y-2">
        <div className="h-2.5 bg-gray-800 rounded w-3/4" />
        <div className="h-2.5 bg-gray-800 rounded w-1/2" />
        <div className="h-8 bg-gray-800 rounded w-full mt-2" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FleetDashboardPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [activeTab, setActiveTab] = useState<ActiveTab>("ALL");

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

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const drivers = allUsers.filter((u) => u.role === "DRIVER");
    const riders = allUsers.filter((u) => u.role === "RIDER");
    const online = allUsers.filter(isOnline);
    const offline = allUsers.filter((u) => !isOnline(u));
    const onJob = allUsers.filter((u) => Boolean(u.currentJobId));
    return { drivers, riders, online, offline, onJob };
  }, [allUsers]);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allUsers;

    if (activeTab === "DRIVERS") list = list.filter((u) => u.role === "DRIVER");
    if (activeTab === "RIDERS") list = list.filter((u) => u.role === "RIDER");

    if (statusFilter === "ONLINE") list = list.filter(isOnline);
    if (statusFilter === "OFFLINE") list = list.filter((u) => !isOnline(u));
    if (statusFilter === "ON_JOB")
      list = list.filter((u) => Boolean(u.currentJobId));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.plateNumber?.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q),
      );
    }

    // Online first, then most recently seen
    return [...list].sort((a, b) => {
      if (isOnline(a) && !isOnline(b)) return -1;
      if (!isOnline(a) && isOnline(b)) return 1;
      return (b.lastSeen || 0) - (a.lastSeen || 0);
    });
  }, [allUsers, activeTab, statusFilter, search]);

  const tabItems: { key: ActiveTab; label: string; count: number }[] = [
    { key: "ALL", label: "Everyone", count: allUsers.length },
    { key: "DRIVERS", label: "Drivers", count: stats.drivers.length },
    { key: "RIDERS", label: "Riders", count: stats.riders.length },
  ];

  const statusFilters: { key: FilterStatus; label: string }[] = [
    { key: "ALL", label: "All statuses" },
    { key: "ONLINE", label: "🟢 Online" },
    { key: "OFFLINE", label: "⚫ Offline" },
    { key: "ON_JOB", label: "🟡 On Job" },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div className="bg-[#1E293B] border-b border-gray-800 sticky top-0 z-20">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Route className="w-5 h-5 text-yellow-400" />
              Fleet Dashboard
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Live positions of all drivers &amp; riders — updates every 10
              seconds
            </p>
          </div>

          <button
            onClick={() => mutate()}
            disabled={isValidating}
            title="Refresh now"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-xs font-bold text-gray-400 hover:text-white hover:border-gray-500 transition-all ${
              isValidating ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-yellow-400" : ""}`}
            />
            {isValidating ? "Updating…" : "Refresh Now"}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-6 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            Cannot reach server — showing last known data. Retrying
            automatically.
          </div>
        )}
      </div>

      <div className="px-6 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* ── Stat pills ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <StatBadge
            icon={Users}
            label="Total People"
            value={allUsers.length}
            color="bg-slate-800 text-white border-gray-700"
          />
          <StatBadge
            icon={Car}
            label="Drivers"
            value={stats.drivers.length}
            color="bg-blue-500/10 text-blue-400 border-blue-500/20"
          />
          <StatBadge
            icon={Bike}
            label="Riders"
            value={stats.riders.length}
            color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          />
          <StatBadge
            icon={Wifi}
            label="Online Now"
            value={stats.online.length}
            color="bg-green-500/10 text-green-400 border-green-500/20"
          />
          <StatBadge
            icon={WifiOff}
            label="Offline"
            value={stats.offline.length}
            color="bg-gray-500/10 text-gray-400 border-gray-700"
          />
          <StatBadge
            icon={Briefcase}
            label="On a Job"
            value={stats.onJob.length}
            color="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          />
        </div>

        {/* ── Search + status filter ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone or plate…"
              className="w-full pl-9 pr-4 py-2.5 bg-[#1E293B] border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="px-3 py-2.5 bg-[#1E293B] border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-yellow-500 transition-colors"
          >
            {statusFilters.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded-xl w-fit border border-gray-800">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-yellow-500 text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  activeTab === tab.key
                    ? "bg-black/20 text-black"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Results count ─────────────────────────────────────────────────── */}
        {!isLoading && (
          <p className="text-xs text-gray-600 font-bold -mt-2">
            Showing{" "}
            <span className="text-gray-400">{filtered.length}</span> of{" "}
            <span className="text-gray-400">{allUsers.length}</span> people
          </p>
        )}

        {/* ── Card grid ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState
              message={
                search || statusFilter !== "ALL"
                  ? "No results match your filters."
                  : "No fleet members found."
              }
            />
          ) : (
            filtered.map((user) => <PersonCard key={user.id} user={user} />)
          )}
        </div>
      </div>
    </div>
  );
}
