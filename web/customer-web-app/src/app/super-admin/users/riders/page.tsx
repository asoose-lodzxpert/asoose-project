"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  Search,
  Filter,
  Users,
  ShieldAlert,
  Wifi,
  Ban,
  Eye,
  Trash2,
  CheckCircle,
  Star,
  Wallet,
  Car,
  Plus,
} from "lucide-react";
import { DataTable } from "@/app/super-admin/component/datatable";
import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { AppAlert } from "../customers/[id]/alerts";
import useSWR from "swr";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import RidersPageSkeleton from "./component/skeleton";
import { getSession } from "next-auth/react";
import { Currency } from "@/app/main/components/Currency";

// --- Types ---
interface Rider {
  id: string;
  name: string;
  email: string;
  plateNumber: string;
  status: string;
  verification: string;
  rating: number;
  walletBalance: number;
  createdAt: string;
  image?: string | null;
}

interface RiderStats {
  total: number;
  pending: number;
  online: number;
  suspended: number;
}

interface RidersApiResponse {
  data: Rider[];
  stats: RiderStats;
}

const columnHelper = createColumnHelper<Rider>();

export default function RidersPage() {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // ✅ FIX: Clean Base URL construction to avoid /api duplication
  // Ensure your .env.local NEXT_PUBLIC_API_URL is: http://localhost:3001/api/v1
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
  } = useSWR<RidersApiResponse>(`/super-admin/riders?${queryString}`, fetcher, {
    keepPreviousData: true,
  });

  const riders = apiResponse?.data || [];
  const stats = apiResponse?.stats || {
    total: 0,
    pending: 0,
    online: 0,
    suspended: 0,
  };

  // ===========================================================================
  //  HANDLERS (Fixed 404 logic)
  // ===========================================================================

  const handleDelete = async (id: string) => {
    const result = await AppAlert.confirm(
      "Delete Rider?",
      "This action is irreversible. All rider data, documents, and vehicle info will be removed.",
      "Yes, Delete",
      true,
    );

    if (result.isConfirmed) {
      try {
        const headers = await getAuthHeader();
        // Removed /api prefix here because BASE_URL already contains it
        const res = await fetch(`${BASE_URL}/super-admin/riders/${id}`, {
          method: "DELETE",
          headers,
        });

        if (!res.ok) throw new Error("Delete failed");

        AppAlert.success("Rider Deleted");
        mutate();
      } catch (e) {
        AppAlert.error(
          "Error",
          "Failed to delete rider. Check server connection.",
        );
      }
    }
  };

  const handleToggleStatus = async (rider: Rider) => {
    const isSuspending = rider.status !== "SUSPENDED";
    const action = isSuspending ? "Suspend" : "Activate";

    const result = await AppAlert.confirm(
      `${action} Rider?`,
      isSuspending
        ? "Rider will be blocked from receiving rides."
        : "Rider access will be restored.",
      `Yes, ${action}`,
      isSuspending,
    );

    if (result.isConfirmed) {
      try {
        const newStatus = isSuspending ? "SUSPENDED" : "ACTIVE";
        const headers = await getAuthHeader();

        const res = await fetch(
          `${BASE_URL}/super-admin/riders/${rider.id}/status`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({ status: newStatus }),
          },
        );

        if (!res.ok) throw new Error("Status update failed");

        AppAlert.success(`Rider ${action}d`);
        mutate();
      } catch (e) {
        AppAlert.error("Error", `Failed to ${action.toLowerCase()} rider`);
      }
    }
  };

  // ===========================================================================
  //  COLUMNS
  // ===========================================================================
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Rider",
        cell: (info) => (
          <Link
            href={`/super-admin/users/riders/${info.row.original.id}`}
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
            <span
              className={`text-xs font-bold uppercase tracking-wider ${color}`}
            >
              {status}
            </span>
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
              href={`/super-admin/users/riders/${row.original.id}`}
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
              title="Delete Rider"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isLoading) return <RidersPageSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
              Fleet Management
            </h1>
            <p className="text-sm text-gray-400">
              Manage riders, payouts, and verifications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/super-admin/users/riders/create"
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold rounded-lg transition-colors shadow-lg shadow-yellow-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Add Rider</span>
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-gray-700 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors">
              <Download className="w-4 h-4" />{" "}
              <span className="hidden md:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Riders"
            value={stats.total}
            icon={Users}
            color="white"
            isActive={statusFilter === "ALL"}
            onClick={() => setStatusFilter("ALL")}
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={ShieldAlert}
            color="yellow"
            isActive={statusFilter === "PENDING"}
            onClick={() => setStatusFilter("PENDING")}
          />
          <StatCard
            title="Online"
            value={stats.online}
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
            <div className="flex gap-2">
              {["ALL", "PENDING", "ONLINE", "SUSPENDED"].map((tab) => (
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
          {riders.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
              <Users className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest">
                No riders matched your criteria
              </p>
            </div>
          ) : (
            <DataTable
              data={riders}
              columns={columns}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              pageSize={10}
              renderMobileCard={(rider) => (
                <div className="bg-[#0F172A] border border-gray-800 p-4 rounded-xl mb-3">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                        {rider.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">
                          {rider.name}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono uppercase">
                          {rider.plateNumber}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded border ${rider.status === "ONLINE" ? "text-green-500 border-green-500/20" : "text-red-500 border-red-500/20"}`}
                    >
                      {rider.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Currency
                      amount={rider.walletBalance}
                      className="text-sm font-bold text-white"
                    />
                    <Link
                      href={`/super-admin/users/riders/${rider.id}`}
                      className="text-xs font-bold text-yellow-500"
                    >
                      View Dossier
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
        {value.toLocaleString()}
      </h2>
    </button>
  );
};
