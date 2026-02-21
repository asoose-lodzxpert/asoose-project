"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Wallet,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  Loader2,
  Plus,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";

interface WalletInfo {
  balance: number;
  currency: string;
  balanceHidden: boolean;
  hasWallet: boolean;
  accountNumber: string | null;
  bankName: string | null;
}

interface TxRecord {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
  type: string;
  date: string;
}

interface TxMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface WalletTabProps {
  token: string;
  apiUrl: string;
}


const STATUS_STYLES: Record<string, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  REFUNDED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function statusStyle(s: string) {
  return (
    STATUS_STYLES[s.toUpperCase()] ??
    "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400"
  );
}

function isCredit(type: string) {
  return type === "Wallet Top-up" || type.toLowerCase().includes("topup");
}


export function WalletTab({ token, apiUrl }: WalletTabProps) {
  // wallet state
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [copied, setCopied] = useState(false);

  // history state
  const [txRows, setTxRows] = useState<TxRecord[]>([]);
  const [txMeta, setTxMeta] = useState<TxMeta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);


  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await fetch(`${apiUrl}/users/wallet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load wallet");
      setWallet(await res.json());
    } catch (err: any) {
      toast.error(err.message || "Failed to load wallet");
    } finally {
      setWalletLoading(false);
    }
  }, [token, apiUrl]);


  const fetchHistory = useCallback(
    async (page: number) => {
      setTxLoading(true);
      try {
        const res = await fetch(
          `${apiUrl}/users/wallet/history?page=${page}&limit=10`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!res.ok) throw new Error("Failed to load history");
        const { data, meta } = await res.json();
        setTxRows(data ?? []);
        setTxMeta(meta);
      } catch (err: any) {
        toast.error(err.message || "Failed to load wallet history");
      } finally {
        setTxLoading(false);
      }
    },
    [token, apiUrl],
  );

  useEffect(() => {
    fetchWallet();
    fetchHistory(1);
  }, [fetchWallet, fetchHistory]);

  useEffect(() => {
    fetchHistory(txPage);
  }, [txPage, fetchHistory]);


  const handleProvision = async () => {
    setProvisioning(true);
    try {
      const res = await fetch(`${apiUrl}/users/wallet/provision`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create wallet");
      }
      const data = await res.json();
      setWallet((prev) => ({
        ...prev!,
        hasWallet: true,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        balance: data.balance ?? 0,
        balanceHidden: data.balanceHidden ?? false,
      }));
      toast.success("Wallet created successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create wallet");
    } finally {
      setProvisioning(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!wallet) return;
    const newHidden = !wallet.balanceHidden;
    setTogglingVisibility(true);
    try {
      const res = await fetch(`${apiUrl}/users/wallet/visibility`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hidden: newHidden }),
      });
      if (!res.ok) throw new Error();
      setWallet((prev) =>
        prev ? { ...prev, balanceHidden: newHidden } : prev,
      );
    } catch {
      toast.error("Failed to update balance visibility");
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-4">
        {/* Balance card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-yellow-500/20">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm opacity-90">
                  Asoose Wallet
                </span>
              </div>

              {wallet && (
                <button
                  onClick={handleToggleVisibility}
                  disabled={togglingVisibility}
                  className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors disabled:opacity-50"
                  title={wallet.balanceHidden ? "Show balance" : "Hide balance"}
                >
                  {togglingVisibility ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : wallet.balanceHidden ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            <p className="text-xs opacity-70 mb-1">Available Balance</p>
            {walletLoading ? (
              <div className="h-10 w-36 bg-white/20 rounded-xl animate-pulse" />
            ) : (
              <p className="text-4xl font-black tracking-tight">
                {wallet?.balanceHidden
                  ? "₦ ••••••"
                  : `₦ ${Number(wallet?.balance ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`}
              </p>
            )}
          </div>
        </div>

        {/* Account info / create wallet */}
        {walletLoading ? (
          <div className="h-44 bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 animate-pulse" />
        ) : wallet?.hasWallet && wallet.accountNumber ? (
          <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 rounded-xl">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm">Fund Your Wallet</h3>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Transfer to this account to top up instantly.
            </p>

            <div className="bg-gray-50 dark:bg-white/5 rounded-2xl px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Bank</p>
              <p className="font-bold text-sm">{wallet.bankName}</p>
            </div>

            <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-2xl px-4 py-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Account Number</p>
                <p className="font-bold text-xl tracking-widest">
                  {wallet.accountNumber}
                </p>
              </div>
              <button
                onClick={() => handleCopy(wallet.accountNumber!)}
                className="p-2 bg-yellow-500/10 text-yellow-600 rounded-xl hover:bg-yellow-500/20 transition-colors"
              >
                {copied ? (
                  <CheckCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Dedicated account · NGN transfers only
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151515] rounded-3xl border border-dashed border-gray-200 dark:border-white/10 p-8 flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 rounded-2xl">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-base mb-1">No Wallet Yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Create a dedicated wallet to fund rides, orders, and deliveries.
              </p>
            </div>
            <button
              onClick={handleProvision}
              disabled={provisioning}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-50"
            >
              {provisioning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {provisioning ? "Creating…" : "Create Wallet"}
            </button>
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <h3 className="font-bold text-sm">Transaction History</h3>
          {txMeta.total > 0 && (
            <span className="text-xs text-gray-400">
              {txMeta.total} record{txMeta.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Rows */}
        {txLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : txRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <Clock className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">No transactions yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {txRows.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  {/* Direction icon */}
                  <div
                    className={`flex-shrink-0 p-2 rounded-xl ${
                      isCredit(tx.type)
                        ? "bg-green-100 dark:bg-green-900/20 text-green-600"
                        : "bg-orange-100 dark:bg-orange-900/20 text-orange-600"
                    }`}
                  >
                    {isCredit(tx.type) ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Description + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{tx.type}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {new Date(tx.date).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Amount + status badge */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <p
                      className={`text-sm font-bold ${
                        isCredit(tx.type)
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {isCredit(tx.type) ? "+" : "−"}₦
                      {Number(tx.amount).toLocaleString("en-NG")}
                    </p>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusStyle(tx.status)}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {txMeta.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                <button
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  disabled={txPage === 1 || txLoading}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                <span className="text-xs text-gray-400">
                  Page {txPage} of {txMeta.pages}
                </span>

                <button
                  onClick={() =>
                    setTxPage((p) => Math.min(txMeta.pages, p + 1))
                  }
                  disabled={txPage === txMeta.pages || txLoading}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
