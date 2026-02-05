"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  Download,
  Filter,
  Eye,
  Search,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  X,
  Calendar,
} from "lucide-react";
import { DataTable } from "@/app/super-admin/component/datatable";
import { ColumnDef } from "@tanstack/react-table";
import { TransactionsListSkeleton } from "./component/skeleton";
import WalletAdjustmentModal from "./component/WalletAdjustmentModal";
import { toast } from "react-toastify";
import useSWR from "swr";
import { fetcher } from "../hooks/useSuperAdminFetch";

interface Transaction {
  id: string;
  type: "Credit" | "Debit";
  amount: string;
  desc: string;
  refId?: string;
  refType?: string;
  user: string;
  date: string;
  status: string;
}

interface TransactionStats {
  revenue: number;
  payouts: number;
  net: number;
}

interface TransactionsApiResponse {
  data: Transaction[];
  stats: TransactionStats;
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// Helper to ensure Naira display even if backend hardcodes dollar signs
const formatNairaString = (amountStr: string) => amountStr.replace("$", "₦");

const StatsCard = ({
  title,
  value,
  type,
}: {
  title: string;
  value: string;
  type: "net" | "in" | "out";
}) => {
  const colors = {
    net: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in: "bg-green-500/10 text-green-500 border-green-500/20",
    out: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };
  const Icon =
    type === "in" ? TrendingUp : type === "out" ? TrendingDown : Wallet;
  return (
    <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{title}</p>
        <Icon className={`w-5 h-5 ${colors[type].split(" ")[1]}`} />
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
    </div>
  );
};

export default function TransactionsPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: (pagination.pageIndex + 1).toString(),
      limit: pagination.pageSize.toString(),
    });
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (statusFilter !== "All")
      params.append("status", statusFilter.toUpperCase());
    if (typeFilter !== "All") params.append("type", typeFilter);
    return params.toString();
  }, [pagination, debouncedSearch, statusFilter, typeFilter]);

  const {
    data: apiResponse,
    error,
    isLoading,
    mutate,
  } = useSWR<TransactionsApiResponse>(
    `/super-admin/transactions?${queryString}`,
    fetcher,
    { keepPreviousData: true },
  );

  const transactions = apiResponse?.data || [];
  const stats = apiResponse?.stats || { revenue: 0, payouts: 0, net: 0 };
  const total = apiResponse?.meta?.total || 0;

  // ✅ FIXED: NAIRA CURRENCY FORMATTER
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val);

  const hasActiveFilters =
    statusFilter !== "All" || typeFilter !== "All" || searchTerm !== "";

  const clearAllFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Transaction ID",
        cell: (info) => (
          <span className="text-gray-400 font-mono text-xs">
            {info.getValue<string>().substring(0, 8)}...
          </span>
        ),
      },
      {
        accessorKey: "desc",
        header: "Description",
        cell: (info) => {
          const row = info.row.original;
          if (row.refId && row.refType) {
            return (
              <Link
                href={`/super-admin/${row.refType.toLowerCase()}s/${row.refId}`}
                className="text-yellow-500 hover:underline flex items-center gap-1"
              >
                {info.getValue<string>()} <ArrowUpRight className="w-3 h-3" />
              </Link>
            );
          }
          return (
            <span className="text-gray-300">{info.getValue<string>()}</span>
          );
        },
      },
      {
        accessorKey: "user",
        header: "User",
        cell: (info) => (
          <span className="text-gray-300">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${row.original.type === "Credit" ? "bg-green-500" : "bg-orange-500"}`}
            ></div>
            <span className="text-gray-300 text-sm">{row.original.type}</span>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.type === "Credit" ? (
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 text-orange-500" />
            )}
            <span
              className={`font-semibold ${row.original.type === "Credit" ? "text-green-500" : "text-orange-500"}`}
            >
              {/* ✅ FIXED: REPLACING $ WITH ₦ */}
              {formatNairaString(row.original.amount)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<string>();
          const color =
            status === "Success"
              ? "bg-green-500/20 text-green-500 border-green-500/30"
              : status === "Processing"
                ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                : "bg-red-500/20 text-red-500 border-red-500/30";
          return (
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-medium border ${color}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: (info) => (
          <span className="text-gray-400 text-sm">
            {new Date(info.getValue<string>()).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            href={`/super-admin/transactions/${row.original.id}`}
            className="text-yellow-500 hover:bg-yellow-500/10 p-2 rounded-lg transition-colors inline-flex"
          >
            <Eye className="w-4 h-4" />
          </Link>
        ),
      },
    ],
    [],
  );

  // --- ✅ FIXED: MOBILE CARD CURRENCY DISPLAY ---
  const TransactionCard = ({ transaction }: { transaction: Transaction }) => (
    <div className="bg-[#1E293B] border border-gray-700 rounded-lg p-4 space-y-3 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-gray-500 font-mono block truncate">
            {transaction.id}
          </span>
        </div>
        <span
          className={`px-2.5 py-1 rounded-md text-xs font-medium border whitespace-nowrap ${
            transaction.status === "Success"
              ? "bg-green-500/20 text-green-500 border-green-500/30"
              : transaction.status === "Processing"
                ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                : "bg-red-500/20 text-red-500 border-red-500/30"
          }`}
        >
          {transaction.status}
        </span>
      </div>
      <div>
        {transaction.refId && transaction.refType ? (
          <Link
            href={`/super-admin/${transaction.refType.toLowerCase()}s/${transaction.refId}`}
            className="text-yellow-500 hover:underline font-medium text-base flex items-center gap-1"
          >
            {transaction.desc} <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <p className="text-white font-medium text-base">{transaction.desc}</p>
        )}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
        <div className="flex items-center gap-2">
          {transaction.type === "Credit" ? (
            <>
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm text-gray-300">Credit</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-sm text-gray-300">Debit</span>
            </>
          )}
        </div>
        <span
          className={`font-bold text-xl ${transaction.type === "Credit" ? "text-green-500" : "text-orange-500"}`}
        >
          {/* ✅ FIXED: REPLACING $ WITH ₦ FOR MOBILE */}
          {formatNairaString(transaction.amount)}
        </span>
      </div>
      <Link
        href={`/super-admin/transactions/${transaction.id}`}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-colors mt-3"
      >
        <Eye className="w-4 h-4" />{" "}
        <span className="text-sm font-semibold">View Details</span>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Transactions</h1>
          <p className="text-gray-400 text-sm mt-1 font-medium">
            Platform financial ledger & internal wallet auditing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="md:hidden flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-lg text-gray-300"
          >
            <Filter className="w-5 h-5" />{" "}
            <span className="text-sm font-medium">Filters</span>
          </button>

          <button
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg "
          >
            <Wallet className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">Adjust Wallet</span>
          </button>

          <button
            onClick={() => mutate()}
            className="p-2 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>

          <button
            onClick={() => toast.info("Export feature coming soon")}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-bold uppercase tracking-tighter text-xs"
          >
            <Download className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {apiResponse && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatsCard
            title="Net Revenue"
            value={formatCurrency(stats.net)}
            type="net"
          />
          <StatsCard
            title="Total In"
            value={formatCurrency(stats.revenue)}
            type="in"
          />
          <StatsCard
            title="Total Out"
            value={formatCurrency(stats.payouts)}
            type="out"
          />
        </div>
      )}

      {/* Filter Section */}
      <div className="hidden md:flex flex-row gap-3 mb-6 bg-[#1E293B] p-4 rounded-xl border border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search ID, user, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#0F172A] text-gray-300 text-sm border border-gray-700 rounded-lg px-3 py-2 outline-none"
        >
          <option>All Status</option>
          <option>Success</option>
          <option>Processing</option>
          <option>Failed</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="bg-[#1E293B] rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        {isLoading && transactions.length === 0 ? (
          <TransactionsListSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-red-500/20 mb-4" />
            <h3 className="text-white font-bold italic uppercase tracking-tighter">
              Connection Failed
            </h3>
            <button
              onClick={() => mutate()}
              className="mt-4 px-8 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm"
            >
              Retry Request
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            {/* ✅ FIXED: REPLACED DollarSign with Banknote icon */}
            <Banknote className="w-16 h-16 text-slate-800 mb-4" />
            <h3 className="text-gray-500 font-bold uppercase italic tracking-widest text-xs">
              No Records Found
            </h3>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable
                columns={columns}
                data={transactions}
                pagination={pagination}
                onPaginationChange={setPagination}
                pageCount={Math.ceil(total / pagination.pageSize)}
              />
            </div>
            <div className="md:hidden space-y-3 p-4">
              {transactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <WalletAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
