"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Download,
  Search,
  Users,
  Wifi,
  Ban,
  Eye,
  Trash2,
  CheckCircle,
  Car,
  Plus,
} from "lucide-react";
import { DataTable } from "@/app/super-admin/component/datatable";
import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { AppAlert } from "../customers/[id]/alerts";
import useSWR from "swr";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import { getSession } from "next-auth/react";
import { Currency } from "@/app/main/components/Currency";

// --- Types ---
interface Driver {
  id: string;
  name: string;
  email: string;
  plateNumber: string;
  status: string;
  isOnline: boolean;
  lastSeen: string | null;
  verification: string;
  rating: number;
  walletBalance: number;
  createdAt: string;
  image?: string | null;
}

interface DriverStats {
  total: number;
  active: number;
  suspended: number;
}

interface DriversApiResponse {
  data: Driver[];
  stats: DriverStats;
}

const columnHelper = createColumnHelper<Driver>();

export default function DriversPage() {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ONLINE");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

  // --- Hooks ---
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getAuthHeader = async () => {
    const session = await getSession();
    const token = (session as any)?.accessToken;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    };
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (statusFilter !== "ALL") params.append("status", statusFilter);
    return params.toString();
  }, [debouncedSearch, statusFilter]);

  const {
    data: apiResponse,
    isLoading,
    mutate,
  } = useSWR<DriversApiResponse>(
    `/super-admin/drivers?${queryString}`,
    fetcher,
    { keepPreviousData: true },
  );

  const drivers = apiResponse?.data || [];
  const stats = apiResponse?.stats || { total: 0, active: 0, suspended: 0 };

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleDelete = async (id: string) => {
    const result = await AppAlert.confirm(
      "Delete Driver?",
      "This action is irreversible. All driver data, documents, and vehicle info will be removed.",
      "Yes, Delete",
      true,
    );

    if (result.isConfirmed) {
      try {
        const headers = await getAuthHeader();
        const res = await fetch(`${BASE_URL}/super-admin/drivers/${id}`, {
          method: "DELETE",
          headers,
        });

        if (!res.ok) throw new Error("Delete failed");

        AppAlert.success("Driver Deleted");
        mutate();
      } catch {
        AppAlert.error(
          "Error",
          "Failed to delete driver. Check server connection.",
        );
      }
    }
  };

  const handleToggleStatus = async (driver: Driver) => {
    const isSuspending = driver.status !== "SUSPENDED";
    const action = isSuspending ? "Suspend" : "Activate";

    const result = await AppAlert.confirm(
      `${action} Driver?`,
      isSuspending
        ? "Driver will be blocked from receiving rides."
        : "Driver access will be restored.",
      `Yes, ${action}`,
      isSuspending,
    );

    if (result.isConfirmed) {
      try {
        const newStatus = isSuspending ? "SUSPENDED" : "ACTIVE";
        const headers = await getAuthHeader();

        const res = await fetch(
          `${BASE_URL}/super-admin/drivers/${driver.id}/status`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({ status: newStatus }),
          },
        );

        if (!res.ok) throw new Error("Status update failed");

        AppAlert.success(`Driver ${action}d`);
        mutate();
      } catch {
        AppAlert.error("Error", `Failed to ${action.toLowerCase()} driver`);
      }
    }
  };

  // ===========================================================================
  //  COLUMNS
  // ===========================================================================
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Driver",
        cell: (info) => (
          <Link
            href={`/super-admin/users/drivers/${info.row.original.id}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white overflow-hidden border border-slate-600">
              {info.row.original.image ? (
                <img
                  src={info.row.original.image}
                  alt={info.getValue()}
                  className="w-full h-full object-cover"
                />
              ) : (
                info.getValue().charAt(0)
              )}
            </div>
            <div>
              <div className="font-bold text-white text-sm group-hover:text-yellow-500 transition-colors">
                {info.getValue()}
              </div>
              <div className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
                {info.row.original.plateNumber}
              </div>
            </div>
          </Link>
        ),
      }),
      columnHelper.accessor("verification", {
        header: "Verification",
        cell: (info) => (
          <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
              info.getValue() === "VERIFIED"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const color =
            status === "ONLINE"
              ? "text-green-500"
              : status === "SUSPENDED"
                ? "text-red-500"
                : "text-gray-500";
          return (
            <div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${color}`}
              >
                {status}
              </span>
              {info.row.original.lastSeen && status !== "ONLINE" && (
                <div className="text-[10px] text-gray-600 mt-0.5">
                  Last seen{" "}
                  {new Date(info.row.original.lastSeen).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("walletBalance", {
        header: "Wallet",
        cell: (info) => (
          <span className="text-white text-sm font-bold">
            <Currency amount={info.getValue()} />
          </span>
        ),
      }),
      {
        id: "actions",
        header: "Manage",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/super-admin/users/drivers/${row.original.id}`}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-all"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <button
              onClick={() => handleToggleStatus(row.original)}
              className={`p-1.5 rounded transition-all ${
                row.original.status === "SUSPENDED"
                  ? "text-green-500 hover:bg-green-500/10"
                  : "text-orange-500 hover:bg-orange-500/10"
              }`}
              title={
                row.original.status === "SUSPENDED" ? "Activate" : "Suspend"
              }
            >
              {row.original.status === "SUSPENDED" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => handleDelete(row.original.id)}
              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-all"
              title="Delete Driver"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20 animate-pulse">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-gray-800 rounded" />
              <div className="h-4 w-72 bg-gray-800 rounded" />
            </div>
            <div className="h-9 w-28 bg-gray-800 rounded-lg" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-[#1E293B] border border-gray-800 rounded-xl p-4 space-y-3"
              >
                <div className="h-4 w-24 bg-gray-700 rounded" />
                <div className="h-8 w-16 bg-gray-700 rounded" />
              </div>
            ))}
          </div>
          {/* Filters skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-4 flex gap-3">
            <div className="flex-1 h-10 bg-gray-700 rounded-lg" />
            <div className="h-10 w-32 bg-gray-700 rounded-lg" />
            <div className="h-10 w-32 bg-gray-700 rounded-lg" />
          </div>
          {/* Table skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
            <div className="h-12 bg-gray-700/50 border-b border-gray-800" />
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 border-b border-gray-800"
              >
                <div className="h-8 w-8 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-36 bg-gray-700 rounded" />
                  <div className="h-3 w-24 bg-gray-700 rounded" />
                </div>
                <div className="h-6 w-16 bg-gray-700 rounded-full" />
                <div className="h-6 w-20 bg-gray-700 rounded-full" />
                <div className="hidden md:block h-3 w-24 bg-gray-700 rounded" />
                <div className="h-8 w-20 bg-gray-700 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
              Driver Management
            </h1>
            <p className="text-sm text-gray-400">
              Manage ride-hailing drivers, payouts, and verifications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/super-admin/users/riders/create"
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold rounded-lg transition-colors shadow-lg shadow-yellow-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Add Driver</span>
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-gray-700 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors">
              <Download className="w-4 h-4" />{" "}
              <span className="hidden md:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Drivers"
            value={stats.total}
            icon={Users}
            color="white"
            isActive={statusFilter === "ALL"}
            onClick={() => setStatusFilter("ALL")}
          />
          <StatCard
            title="Online"
            value={stats.active}
            icon={Wifi}
            color="green"
            isActive={statusFilter === "ONLINE"}
            onClick={() => setStatusFilter("ONLINE")}
          />
          <StatCard
            title="Suspended"
            value={stats.suspended}
            icon={Ban}
            color="red"
            isActive={statusFilter === "SUSPENDED"}
            onClick={() => setStatusFilter("SUSPENDED")}
          />
        </div>

        {/* Filters */}
        <div className="bg-[#1E293B] rounded-xl border border-gray-800 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search name, email, or plate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:border-yellow-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["ALL", "ONLINE", "ACTIVE", "SUSPENDED"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all ${statusFilter === tab ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
          {drivers.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
              <Car className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest">
                No drivers matched your criteria
              </p>
            </div>
          ) : (
            <DataTable
              data={drivers}
              columns={columns}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              pageSize={10}
              renderMobileCard={(driver) => (
                <div className="bg-[#0F172A] border border-gray-800 p-4 rounded-xl mb-3">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">
                          {driver.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono uppercase">
                          {driver.plateNumber}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border ${driver.status === "ONLINE" ? "text-green-500 border-green-500/20" : "text-red-500 border-red-500/20"}`}
                    >
                      {driver.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Currency
                      amount={driver.walletBalance}
                      className="text-sm font-bold text-white"
                    />
                    <Link
                      href={`/super-admin/users/drivers/${driver.id}`}
                      className="text-xs font-bold text-yellow-500"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  isActive,
  onClick,
}: any) => {
  const styles: any = {
    white: "text-white bg-slate-800",
    yellow: "text-yellow-500 bg-yellow-500/10",
    green: "text-green-500 bg-green-500/10",
    red: "text-red-500 bg-red-500/10",
  };
  return (
    <button
      onClick={onClick}
      className={`p-5 rounded-xl border text-left transition-all ${isActive ? "bg-slate-800 border-yellow-500 shadow-lg shadow-yellow-500/5" : "bg-[#1E293B] border-gray-800 hover:border-gray-700"}`}
    >
      <div className="flex justify-between mb-3">
        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
          {title}
        </p>
        <div className={`p-1.5 rounded-lg ${styles[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white">
        {value?.toLocaleString() ?? 0}
      </h2>
    </button>
  );
};
