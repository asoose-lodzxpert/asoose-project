"use client";

import React, { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  Eye,
  Search,
  RefreshCw,
  FileText,
  AlertTriangle,
  Truck,
  Store,
  ChevronRight,
} from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { fetcher } from "../hooks/useSuperAdminFetch";
import { DataTable } from "@/app/super-admin/component/datatable";
import VerificationSkeleton from "./skeleton";

// ===========================================================================
//  TYPES & INTERFACES
// ===========================================================================

interface VendorDocument {
  id: string;
  name: string;
  fileName: string;
  url: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  uploadedDate: string;
}

interface RiderDocument {
  id: string;
  type: string;
  url: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
}

interface StoreInfo {
  id: string;
  name: string;
  type: string;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
}

interface VendorRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  createdAt: string;
  store?: StoreInfo;
  documents: VendorDocument[];
}

interface RiderRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  createdAt: string;
  vehicle?: Vehicle;
  documents: RiderDocument[];
}

type VerificationRow = VendorRow | RiderRow;

interface VerificationResponse {
  data: VerificationRow[];
  total: number;
  page: number;
}

// Type Guards
function isVendorRow(row: VerificationRow): row is VendorRow {
  return "store" in row;
}

function isRiderRow(row: VerificationRow): row is RiderRow {
  return "vehicle" in row;
}

// ===========================================================================
//  MAIN COMPONENT
// ===========================================================================

export default function VerificationPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"vendor" | "rider">("vendor");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Server-Side Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Data Fetching
  const { data, mutate, isLoading, error } = useSWR<VerificationResponse>(
    `/super-admin/verification?type=${activeTab}&search=${debouncedSearch}&page=${page}&limit=10`,
    fetcher,
    { keepPreviousData: true },
  );

  // ===========================================================================
  //  LOGIC HELPERS
  // ===========================================================================

  const getSecondaryInfo = (row: VerificationRow) => {
    if (activeTab === "vendor" && isVendorRow(row))
      return row.store?.name || "N/A";
    if (activeTab === "rider" && isRiderRow(row))
      return row.vehicle?.plateNumber || "N/A";
    return "-";
  };

  const handleViewDetails = (id: string) => {
    router.push(`/super-admin/verification/${id}`);
  };

  // ===========================================================================
  //  TABLE COLUMNS
  // ===========================================================================

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Partner Identity",
        cell: ({ row }: any) => (
          <div className="flex flex-col">
            <span className="font-bold text-white">{row.original.name}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-tight">
              {row.original.email}
            </span>
          </div>
        ),
      },
      {
        header: "Entity Reference",
        cell: ({ row }: any) => (
          <span className="text-sm text-gray-300">
            {getSecondaryInfo(row.original)}
          </span>
        ),
      },
      {
        header: "Documentation",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-blue-400">
            <FileText className="w-3 h-3" />
            <span className="text-xs font-bold">
              {row.original.documents?.length || 0} Files
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }: any) => (
          <button
            onClick={() => handleViewDetails(row.original.id)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-xs font-bold"
          >
            <Eye className="w-3.5 h-3.5" /> View Details
          </button>
        ),
      },
    ],
    [activeTab],
  );

  // ===========================================================================
  //  MOBILE RENDERER
  // ===========================================================================

  const renderVerificationMobileCard = (row: VerificationRow) => {
    const isVendor = isVendorRow(row);
    const secondaryInfo = isVendor
      ? (row as VendorRow).store?.name
      : (row as RiderRow).vehicle?.plateNumber;

    return (
      <div
        key={row.id}
        onClick={() => handleViewDetails(row.id)}
        className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 mb-3 space-y-4 hover:border-blue-500/30 transition-all active:scale-[0.98] cursor-pointer"
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-slate-800 rounded-lg shrink-0">
              {isVendor ? (
                <Store className="w-5 h-5 text-blue-400" />
              ) : (
                <Truck className="w-5 h-5 text-orange-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-white truncate">{row.name}</h4>
              <p className="text-xs text-gray-500 truncate">{row.email}</p>
            </div>
          </div>
          <ChevronRight className="text-gray-600 w-5 h-5" />
        </div>

        <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/50">
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">
              Entity
            </p>
            <p className="text-sm text-gray-300 truncate">
              {secondaryInfo || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">
              Documents
            </p>
            <p className="text-sm text-blue-400">
              {row.documents?.length || 0} Uploaded
            </p>
          </div>
        </div>

        <div className="w-full py-2 bg-slate-800 rounded-lg text-xs font-bold text-center text-gray-300">
          Tap to review credentials
        </div>
      </div>
    );
  };

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isLoading && !data) return <VerificationSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <ToastContainer theme="dark" position="bottom-right" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white ">
            Verifications
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
            Pending identity & document audits
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-600" />
            <input
              placeholder="Filter by name or email..."
              className="w-full bg-[#1E293B] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => mutate()}
            className="p-2.5 sm:p-3 bg-slate-800 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900 rounded-xl w-full sm:w-fit border border-slate-800">
        {(["vendor", "rider"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPage(1);
            }}
            className={`flex-1 sm:flex-initial px-6 sm:px-8 py-2 text-xs font-black uppercase rounded-lg transition-all ${
              activeTab === tab
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab}s
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {error ? (
          <div className="p-12 sm:p-20 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500/20 mx-auto" />
            <p className="text-gray-400 font-bold text-sm sm:text-base">
              Database link interrupted
            </p>
            <button
              onClick={() => mutate()}
              className="px-6 py-2 bg-blue-600 rounded-lg text-white font-bold text-sm"
            >
              Reconnect
            </button>
          </div>
        ) : !isLoading && data?.data.length === 0 ? (
          <div className="p-16 sm:p-24 text-center">
            <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-slate-800" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
              Queue Cleared
            </p>
            <p className="text-gray-600 text-sm mt-1">
              No pending {activeTab} registrations found.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data?.data || []}
            pageSize={10}
            renderMobileCard={renderVerificationMobileCard}
          />
        )}
      </div>
    </div>
  );
}
