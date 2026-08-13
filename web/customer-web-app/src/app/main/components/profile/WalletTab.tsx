"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  WalletService,
  WalletTransaction,
} from "@/services/wallet.service";

const PENDING_WALLET_TOPUP_KEY = "pending_wallet_topup";

interface WalletTabProps {
  token: string;
}

const statusClass = (status: string) => {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
    case "FAILED":
      return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    default:
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
  }
};

export function WalletTab({ token }: WalletTabProps) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState("20000");
  const [topupLoading, setTopupLoading] = useState(false);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wallet, history] = await Promise.all([
        WalletService.getMyWallet(token),
        WalletService.getTransactions(page, 20, token),
      ]);
      setBalance(wallet.balance);
      setTransactions(history.transactions ?? []);
      setTotal(history.pagination?.total ?? 0);
      setTotalPages(Math.max(history.pagination?.totalPages ?? 1, 1));
    } catch (requestError: any) {
      setError(requestError?.message || "Could not load your wallet.");
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Enter a valid top-up amount.");
      return;
    }

    setTopupLoading(true);
    try {
      const result = await WalletService.initializeTopup(amount, token);
      if (!result.authorizationUrl?.startsWith("https://checkout.paystack.com/")) {
        throw new Error("The payment link returned by the server is invalid.");
      }

      localStorage.setItem(
        PENDING_WALLET_TOPUP_KEY,
        JSON.stringify({
          reference: result.reference,
          returnTo: "/main/profile?tab=wallet",
        }),
      );
      window.location.href = result.authorizationUrl;
    } catch (topupError: any) {
      toast.error(topupError?.message || "Could not initialize wallet top-up.");
      setTopupLoading(false);
    }
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-6">
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 p-5 text-black shadow-xl shadow-yellow-500/15 sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/20" />
          <div className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-white/10" />
          <div className="relative">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black">
                <span className="rounded-xl bg-black/10 p-2">
                  <Wallet className="h-4 w-4" />
                </span>
                Asoose Wallet
              </div>
              <button
                type="button"
                onClick={loadWallet}
                disabled={loading}
                aria-label="Refresh wallet"
                className="rounded-xl bg-white/25 p-2 transition hover:bg-white/40 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <p className="text-xs font-bold text-black/60">Balance</p>
            {loading ? (
              <div className="mt-2 h-11 w-48 animate-pulse rounded-xl bg-white/25" />
            ) : (
              <p className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5 dark:border-white/[0.07] dark:bg-[#151515]">
          <button
            type="button"
            onClick={() => setShowTopup((current) => !current)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <span>
              <span className="block text-sm font-black">Top up wallet</span>
              <span className="mt-1 block text-xs text-gray-500">
                Add money securely with Paystack.
              </span>
            </span>
            <span className="rounded-xl bg-yellow-100 p-2 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
              <Plus className="h-5 w-5" />
            </span>
          </button>

          {showTopup && (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-white/5">
              <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 focus-within:border-yellow-500 dark:border-white/10 dark:bg-white/5">
                <span className="font-bold text-gray-500">₦</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={topupAmount}
                  onChange={(event) => setTopupAmount(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent px-2 py-3 font-black outline-none"
                  aria-label="Top-up amount"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[5000, 10000, 20000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTopupAmount(String(amount))}
                    className={`rounded-xl border px-2 py-2 text-xs font-bold ${topupAmount === String(amount) ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" : "border-gray-200 text-gray-500 dark:border-white/10"}`}
                  >
                    ₦{amount.toLocaleString()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleTopup}
                disabled={topupLoading || !topupAmount}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 py-3 text-sm font-black text-white transition hover:bg-black disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {topupLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {topupLoading ? "Opening Paystack…" : "Continue to Paystack"}
              </button>
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.07] dark:bg-[#151515]">
        <header className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-4 sm:px-5 dark:border-white/5 dark:bg-white/[0.03]">
          <div>
            <h2 className="text-sm font-black">Transactions</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {total} transaction{total === 1 ? "" : "s"}
            </p>
          </div>
          <span className="text-xs font-bold text-gray-400">
            Page {page} of {totalPages}
          </span>
        </header>

        {loading ? (
          <div className="space-y-3 p-4 sm:p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
            ))}
          </div>
        ) : error ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button type="button" onClick={loadWallet} className="mt-4 rounded-xl bg-gray-950 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-black">
              Try again
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center text-gray-400">
            <Clock3 className="mb-3 h-9 w-9 opacity-50" />
            <p className="text-sm font-bold">No wallet transactions yet</p>
            <p className="mt-1 text-xs">Your wallet activity will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {transactions.map((transaction) => {
              const isCredit = transaction.type === "CREDIT";
              return (
                <article key={transaction.id} className="flex gap-3 px-4 py-4 transition hover:bg-gray-50 sm:px-5 dark:hover:bg-white/[0.03]">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isCredit ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"}`}>
                    {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{transaction.description}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(transaction.createdAt).toLocaleString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p className={`shrink-0 text-sm font-black ${isCredit ? "text-green-600" : "text-gray-950 dark:text-white"}`}>
                        {isCredit ? "+" : "−"}₦{Number(transaction.amount).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                      <span className={`rounded-full px-2 py-1 ${statusClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                      <span className="text-gray-400">{transaction.channel}</span>
                      <span
                        className="text-gray-400"
                        title={transaction.referenceId}
                      >
                        {transaction.referenceType}
                        {transaction.referenceId
                          ? ` · ${transaction.referenceId.slice(0, 8)}`
                          : ""}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <footer className="grid grid-cols-2 gap-3 border-t border-gray-100 p-4 dark:border-white/5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page === 1}
              className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold disabled:opacity-40 dark:border-white/10"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={page === totalPages}
              className="flex items-center justify-center gap-1 rounded-xl bg-gray-950 py-2.5 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-black"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
