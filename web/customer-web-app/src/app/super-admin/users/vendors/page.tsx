"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  Plus,
  Search,
  Eye,
  Trash2,
  Copy,
  UserCheck,
  X,
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DataTable } from "@/app/super-admin/component/datatable";
import {
  createColumnHelper,
  ColumnDef,
  PaginationState,
} from "@tanstack/react-table";
import Swal from "sweetalert2";
import useSWR from "swr";
import { getSession } from "next-auth/react";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import VendorManagementPageSkeleton from "./component/skeleton";
import AddVendorModal from "./component/addvendorModal";
import ManualOnboardModal from "./component/manualOnboardModal";
import { FilterSelect } from "./component/filterSelect";
import { StatCard } from "./component/statcard";

interface Vendor {
  id: string;
  slug?: string;
  name: string;
  email: string;
  category: string;
  status: string;
  verification: string;
  rating: number | null;
  totalOrders: number;
  createdAt?: string;
}

interface VendorsApiResponse {
  data: Vendor[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const columnHelper = createColumnHelper<Vendor>();

export default function VendorManagementPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isManualOnboardOpen, setIsManualOnboardOpen] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [verificationFilter, setVerificationFilter] = useState("All");

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, statusFilter, categoryFilter, verificationFilter]);

  const getAuthHeader = async () => {
    const session = await getSession();
    const token = (session as any)?.accessToken;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    };
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: (pagination.pageIndex + 1).toString(),
      limit: pagination.pageSize.toString(),
    });

    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "All Status") params.set("status", statusFilter);
    if (categoryFilter !== "All") params.set("category", categoryFilter);
    if (verificationFilter !== "All")
      params.set("verification", verificationFilter);

    return params.toString();
  }, [
    pagination,
    debouncedSearch,
    statusFilter,
    categoryFilter,
    verificationFilter,
  ]);

  const {
    data: apiResponse,
    error,
    isLoading,
    mutate,
  } = useSWR<VendorsApiResponse>(
    `/super-admin/vendors?${queryString}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  // ✅ FIX: Filter out 'SUSPENDED' vendors (used for soft delete in backend)
  const vendors = useMemo(() => {
    const rawData = apiResponse?.data || [];
    return rawData.filter((v) => {
      // Backend sets status to SUSPENDED and appends -deleted- to slug on delete
      // We filter based on status 'SUSPENDED' or explicit slug check if available
      return v.status !== "SUSPENDED" && !v.slug?.includes("-deleted-");
    });
  }, [apiResponse?.data]);

  const meta = apiResponse?.meta || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };

  const { data: statsResponse } = useSWR<VendorsApiResponse>(
    `/super-admin/vendors?limit=1000`,
    fetcher,
    { revalidateOnFocus: false },
  );

  // ✅ FIX: Filter 'SUSPENDED' from stats to ensure counts are accurate
  const stats = useMemo(() => {
    const rawVendors = statsResponse?.data || [];
    const allVendors = rawVendors.filter(
      (v) => v.status !== "SUSPENDED" && !v.slug?.includes("-deleted-"),
    );

    return {
      total: allVendors.length,
      pending: allVendors.filter((v) => v.verification === "PENDING").length,
      active: allVendors.filter((v) => v.status === "ACTIVE").length,
      rejected: allVendors.filter(
        (v) => v.status === "REJECTED" || v.status === "DISABLED",
      ).length,
    };
  }, [statsResponse]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("All Status");
    setCategoryFilter("All");
    setVerificationFilter("All");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleQuickFilter = (
    type: "ALL" | "PENDING" | "ACTIVE" | "REJECTED",
  ) => {
    handleClearFilters();
    if (type === "PENDING") {
      setVerificationFilter("PENDING");
    } else if (type === "ACTIVE") {
      setStatusFilter("ACTIVE");
    } else if (type === "REJECTED") {
      setStatusFilter("REJECTED");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete Vendor?",
      text: "This acts as a soft-delete (Vendor will be hidden).",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      background: "#1E293B",
      color: "#fff",
    });

    if (result.isConfirmed) {
      try {
        const headers = await getAuthHeader();
        const res = await fetch(`${API_URL}/super-admin/vendors/${id}`, {
          method: "DELETE",
          headers,
        });

        if (!res.ok) throw new Error("Failed");

        mutate();
        Swal.fire({
          title: "Deleted!",
          icon: "success",
          background: "#1E293B",
          color: "#fff",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: "Failed to delete.",
          icon: "error",
          background: "#1E293B",
          color: "#fff",
        });
      }
    }
  };

  const handleBulkAction = async (action: "approve" | "delete") => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: `${action === "approve" ? "Approve" : "Delete"} ${selectedIds.length} Vendors?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: action === "approve" ? "#22c55e" : "#ef4444",
      background: "#1E293B",
      color: "#fff",
    });

    if (result.isConfirmed) {
      setIsProcessingBulk(true);
      try {
        const headers = await getAuthHeader();
        const requests = selectedIds.map((id) => {
          const url = `${API_URL}/super-admin/vendors/${id}`;
          if (action === "approve") {
            return fetch(url, {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                status: "ACTIVE",
                verification: "VERIFIED",
              }),
            });
          } else {
            return fetch(url, {
              method: "DELETE",
              headers,
            });
          }
        });

        await Promise.allSettled(requests);
        mutate();
        setRowSelection({});
        Swal.fire({
          title: "Success",
          text: "Batch processed.",
          icon: "success",
          background: "#1E293B",
          color: "#fff",
        });
      } catch (err) {
        Swal.fire({
          title: "Error",
          text: "Bulk action failed.",
          icon: "error",
          background: "#1E293B",
          color: "#fff",
        });
      } finally {
        setIsProcessingBulk(false);
      }
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    const toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1500,
      background: "#1E293B",
      color: "#fff",
    });
    toast.fire({ icon: "success", title: "Copied" });
  };

  const handleExport = async () => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/super-admin/vendors?limit=10000`, {
        headers,
      });
      const allData: VendorsApiResponse = await res.json();

      const csv = [
        [
          "Name",
          "Email",
          "Category",
          "Status",
          "Verification",
          "Rating",
          "Orders",
        ].join(","),
        ...allData.data.map((v) =>
          [
            v.name,
            v.email,
            v.category,
            v.status,
            v.verification,
            v.rating ?? "N/A",
            v.totalOrders,
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vendors.csv";
      a.click();
    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to export data.",
        icon: "error",
        background: "#1E293B",
        color: "#fff",
      });
    }
  };

  const selectedCount = Object.keys(rowSelection).length;

  const columns = useMemo<ColumnDef<Vendor, any>[]>(
    () => [
      {
        id: "select",
        header: ({ table }: any) => (
          <input
            type="checkbox"
            className="rounded bg-gray-700 border-gray-600 text-yellow-500 focus:ring-yellow-500 w-4 h-4 cursor-pointer"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }: any) => (
          <input
            type="checkbox"
            className="rounded bg-gray-700 border-gray-600 text-yellow-500 focus:ring-yellow-500 w-4 h-4 cursor-pointer"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-bold text-white truncate flex items-center gap-2">
              {info.getValue()}
              {info.row.original.status === "PENDING" && (
                <span className="text-[10px] bg-blue-500 text-white px-1 rounded animate-pulse">
                  NEW
                </span>
              )}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              ID: {info.row.original.id.substring(0, 8)}...
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Contact",
        cell: (info) => (
          <div className="flex items-center gap-2 group">
            <span className="text-gray-400 truncate max-w-[150px]">
              {info.getValue()}
            </span>
            <button
              onClick={() => handleCopy(info.getValue())}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded text-gray-500 hover:text-white transition-all"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue() || "PENDING";
          const colors = {
            ACTIVE: "bg-green-500/20 text-green-500 border-green-500/20",
            PENDING: "bg-yellow-500/20 text-yellow-500 border-yellow-500/20",
            DISABLED: "bg-gray-500/20 text-gray-400 border-gray-500/20",
            REJECTED: "bg-red-500/20 text-red-500 border-red-500/20",
          };
          return (
            <span
              className={`px-2 py-1 rounded text-xs font-bold uppercase border ${colors[status.toUpperCase() as keyof typeof colors] || colors.PENDING}`}
            >
              {status}
            </span>
          );
        },
      }),
      columnHelper.accessor("verification", {
        header: "Verification",
        cell: (info) => {
          const v = info.getValue() || "PENDING";
          const color =
            v === "VERIFIED"
              ? "text-blue-400 bg-blue-500/10"
              : v === "PENDING"
                ? "text-yellow-500 bg-yellow-500/10"
                : "text-red-400 bg-red-500/10";
          return (
            <span
              className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${color}`}
            >
              {v}
            </span>
          );
        },
      }),
      columnHelper.accessor("totalOrders", {
        header: "Orders",
        cell: (info) => (
          <span className="font-mono text-white">
            {(info.getValue() || 0).toLocaleString()}
          </span>
        ),
      }),
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Link
              href={`/super-admin/users/vendors/${row.original.slug || row.original.id}`}
            >
              <button
                className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
            </Link>
            <button
              onClick={() => handleDelete(row.original.id)}
              className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isLoading) return <VendorManagementPageSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 overflow-x-hidden relative pb-20">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                Vendor Management
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Overview of all service providers
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`md:hidden flex items-center justify-center p-2 border border-gray-700 rounded-lg transition-colors ${showFilters ? "bg-yellow-500 text-black border-yellow-500" : "text-gray-300 hover:bg-gray-800"}`}
              >
                <Filter className="w-4 h-4" />
              </button>

              <button
                onClick={handleExport}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 text-sm font-bold"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </button>
              <button
                onClick={() => setIsManualOnboardOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 text-sm font-bold shadow-lg shadow-green-600/20"
                title="Manually onboard a vendor as Active & Verified"
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden md:inline">Manual Onboard</span>
                <span className="inline md:hidden">Onboard</span>
              </button>
              {/* <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 text-sm font-bold shadow-lg shadow-yellow-500/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Add Vendor</span>
                <span className="inline md:hidden">Add</span>
              </button> */}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 cursor-pointer">
            <StatCard
              title="Total Vendors"
              count={stats.total}
              color="text-white"
              onClick={() => handleQuickFilter("ALL")}
              active={
                statusFilter === "All Status" && verificationFilter === "All"
              }
            />
            <StatCard
              title="Pending Review"
              count={stats.pending}
              color="text-yellow-500"
              icon={<AlertCircle className="w-4 h-4 text-yellow-500" />}
              onClick={() => handleQuickFilter("PENDING")}
              active={verificationFilter === "PENDING"}
            />
            <StatCard
              title="Active & Verified"
              count={stats.active}
              color="text-green-500"
              icon={<CheckCircle className="w-4 h-4 text-green-500" />}
              onClick={() => handleQuickFilter("ACTIVE")}
              active={statusFilter === "ACTIVE"}
            />
            <StatCard
              title="Suspended/Rejected"
              count={stats.rejected}
              color="text-red-500"
              onClick={() => handleQuickFilter("REJECTED")}
              active={statusFilter === "REJECTED"}
            />
          </div>
        </div>

        <div
          className={`bg-[#1E293B] p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-4 items-end transition-all duration-300 ${showFilters ? "flex" : "hidden"} md:flex`}
        >
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 transition-all"
            />
          </div>
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={["ACTIVE", "PENDING", "DISABLED", "REJECTED"]}
          />
          <FilterSelect
            label="Verification"
            value={verificationFilter}
            onChange={setVerificationFilter}
            options={["VERIFIED", "UNVERIFIED", "PENDING"]}
          />

          {(searchQuery ||
            statusFilter !== "All Status" ||
            verificationFilter !== "All") && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-red-400 hover:text-red-300 font-bold px-2 py-2.5 w-full md:w-auto text-center"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0">
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
            {vendors.length > 0 ? (
              <DataTable
                data={vendors}
                columns={columns}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                pageCount={meta.totalPages}
                pagination={pagination}
                onPaginationChange={setPagination}
                renderMobileCard={(v) => (
                  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors mb-3">
                    <div className="flex justify-between items-start mb-3">
                      <Link
                        href={`/super-admin/users/vendors/${v.slug || v.id}`}
                        className="text-yellow-500 hover:text-yellow-400 font-mono font-bold text-sm transition-colors"
                      >
                        {v.name}
                      </Link>
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold uppercase border ${v.status === "ACTIVE" ? "bg-green-500/20 text-green-500 border-green-500/20" : "bg-yellow-500/20 text-yellow-500 border-yellow-500/20"}`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Verification:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${v.verification === "VERIFIED" ? "text-blue-400 bg-blue-500/10" : "text-yellow-500 bg-yellow-500/10"}`}
                        >
                          {v.verification}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Orders:</span>
                        <span className="text-white font-mono">
                          {v.totalOrders.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-gray-800">
                      <Link
                        href={`/super-admin/users/vendors/${v.slug || v.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">View</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm">Delete</span>
                      </button>
                    </div>
                  </div>
                )}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>No vendors found matching your filters.</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-yellow-500 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F172A] border border-gray-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-5 fade-in">
          <span className="font-bold text-sm bg-gray-800 px-3 py-1 rounded-full">
            {selectedCount} Selected
          </span>
          <div className="h-4 w-px bg-gray-700"></div>
          <button
            onClick={() => handleBulkAction("approve")}
            disabled={isProcessingBulk}
            className="flex items-center gap-2 text-green-400 hover:text-green-300 font-bold text-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
          <button
            onClick={() => handleBulkAction("delete")}
            disabled={isProcessingBulk}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold text-sm transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button
            onClick={() => setRowSelection({})}
            className="ml-2 p-1 hover:bg-gray-800 rounded-full text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onVendorAdded={mutate}
      />

      <ManualOnboardModal
        isOpen={isManualOnboardOpen}
        onClose={() => setIsManualOnboardOpen(false)}
        onSuccess={mutate}
      />
    </div>
  );
}
