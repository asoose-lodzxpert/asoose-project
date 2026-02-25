"use client";

import React from "react";
import useSWR from "swr";
import { fetcher } from "../hooks/useSuperAdminFetch"; // ← adjust path if needed
import Swal from "sweetalert2";
import {
  Eye,
  Check,
  X,
  Banknote,
  Loader2,
  AlertCircle,
  Filter,
} from "lucide-react";
import PayoutsSkeleton from "./skeleton"; // ← adjust path if needed

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type FilterStatus =
  | "ALL"
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "REJECTED"
  | "FAILED";
type FilterType = "ALL" | "VENDOR" | "RIDER";

interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  paystackRecipientCode?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VendorDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface StoreDetails {
  id: string;
  name: string;
  vendor: VendorDetails | null;
  bankAccount: BankAccount | null;
}

interface RiderDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  bankAccount: BankAccount | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  method: string;
  reference?: string | null;
  rejectionReason?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccountId?: string | null;
  storeId?: string;
  riderId?: string;
  payoutType: "VENDOR" | "RIDER";
  recipientName: string;
  bankAccount: BankAccount | null;
  vendorDetails: VendorDetails | null;
  store: StoreDetails | null;
  rider: RiderDetails | null;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  APPROVED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PAID: "bg-green-500/10 text-green-400 border-green-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  FAILED: "bg-rose-900/20 text-rose-400 border-rose-500/20",
};

function fmt(amount: number) {
  return "₦" + amount.toLocaleString("en-NG", { minimumFractionDigits: 2 });
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mask(n?: string | null) {
  if (!n) return "—";
  return "•••• " + n.slice(-4);
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border ${
        STATUS_STYLES[status] ?? "bg-slate-700 text-slate-300 border-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full border ${
        type === "VENDOR"
          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
          : "bg-purple-500/10 text-purple-400 border-purple-500/20"
      }`}
    >
      {type}
    </span>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-sm shrink-0">{label}</span>
      <span
        className={`text-sm text-right break-all ${
          mono ? "font-mono text-slate-300" : "text-white"
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-6 mb-2">
      {children}
    </p>
  );
}

// ──────────────────────────────────────────────
// Preview Modal
// ──────────────────────────────────────────────
function PreviewModal({
  payout,
  onClose,
}: {
  payout: Payout;
  onClose: () => void;
}) {
  const isVendor = payout.payoutType === "VENDOR";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#1E293B] flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-700 z-10">
          <div>
            <h2 className="font-bold text-lg text-white">Payout Details</h2>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">
              {payout.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-8">
          <SectionTitle>Payout</SectionTitle>
          <DetailRow label="Type" value={payout.payoutType} />
          <DetailRow label="Recipient" value={payout.recipientName} />
          <DetailRow label="Amount" value={fmt(payout.amount)} />
          <DetailRow label="Status" value={payout.status} />
          <DetailRow label="Method" value={payout.method} />
          <DetailRow label="Reference" value={payout.reference} mono />
          <DetailRow label="Created" value={fmtDate(payout.createdAt)} />
          <DetailRow label="Updated" value={fmtDate(payout.updatedAt)} />
          <DetailRow label="Processed" value={fmtDate(payout.processedAt)} />
          {payout.rejectionReason && (
            <DetailRow
              label="Rejection Reason"
              value={payout.rejectionReason}
            />
          )}

          <SectionTitle>Bank Account</SectionTitle>
          {payout.bankAccount ? (
            <>
              <DetailRow
                label="Bank Name"
                value={payout.bankAccount.bankName}
              />
              <DetailRow
                label="Bank Code"
                value={payout.bankAccount.bankCode}
                mono
              />
              <DetailRow
                label="Account Number"
                value={payout.bankAccount.accountNumber}
                mono
              />
              <DetailRow
                label="Account Name"
                value={payout.bankAccount.accountName}
              />
              <DetailRow label="Currency" value={payout.bankAccount.currency} />
              <DetailRow
                label="Paystack Code"
                value={payout.bankAccount.paystackRecipientCode}
                mono
              />
            </>
          ) : (
            <p className="text-sm text-slate-500 italic py-3">
              No bank account linked
            </p>
          )}

          {isVendor && payout.store && (
            <>
              <SectionTitle>Store</SectionTitle>
              <DetailRow label="Store ID" value={payout.store.id} mono />
              <DetailRow label="Store Name" value={payout.store.name} />
              {payout.store.vendor && (
                <>
                  <SectionTitle>Vendor</SectionTitle>
                  <DetailRow
                    label="Vendor ID"
                    value={payout.store.vendor.id}
                    mono
                  />
                  <DetailRow label="Name" value={payout.store.vendor.name} />
                  <DetailRow
                    label="Email"
                    value={payout.store.vendor.email}
                    mono
                  />
                  <DetailRow
                    label="Phone"
                    value={payout.store.vendor.phone}
                    mono
                  />
                </>
              )}
            </>
          )}

          {!isVendor && payout.rider && (
            <>
              <SectionTitle>Rider</SectionTitle>
              <DetailRow label="Rider ID" value={payout.rider.id} mono />
              <DetailRow label="Name" value={payout.rider.name} />
              <DetailRow label="Email" value={payout.rider.email} mono />
              <DetailRow label="Phone" value={payout.rider.phone} mono />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Reject Dialog
// ──────────────────────────────────────────────
function RejectDialog({
  target,
  onClose,
  onSubmit,
  loading,
}: {
  target: { id: string; type: "VENDOR" | "RIDER"; name: string };
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = React.useState("");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1E293B] border border-slate-700 rounded-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-bold text-lg text-white mb-2">Reject Payout</h2>
        <p className="text-slate-400 text-sm mb-5">
          Rejecting payout for{" "}
          <span className="text-white font-medium">{target.name}</span>. The
          balance will be refunded and the recipient notified.
        </p>

        <textarea
          autoFocus
          className="w-full bg-[#0F172A] border border-slate-600 rounded-xl p-4 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-slate-400 min-h-[120px]"
          placeholder="Enter rejection reason…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!reason.trim() || loading}
            onClick={() => onSubmit(reason.trim())}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <X size={16} />
            )}
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Select Component
// ──────────────────────────────────────────────
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="relative min-w-[140px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full bg-[#1E293B] border border-slate-700 text-white text-sm rounded-xl pl-3 pr-9 py-2.5 focus:outline-none focus:border-slate-500 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Mobile Card
// ──────────────────────────────────────────────
function PayoutCard({
  payout,
  idx,
  onPreview,
  onApprove,
  onRejectRequest,
  approving,
  rejecting,
}: {
  payout: Payout;
  idx: number;
  onPreview: () => void;
  onApprove: () => void;
  onRejectRequest: () => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const isPending = payout.status === "PENDING";
  const busy = approving || rejecting;

  return (
    <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 shadow-sm hover:border-slate-500 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <span className="text-slate-500 text-xs font-medium">
              #{idx + 1}
            </span>
            <TypeBadge type={payout.payoutType} />
            <StatusBadge status={payout.status} />
          </div>
          <p className="font-medium text-white text-base truncate">
            {payout.recipientName}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="font-bold text-lg tabular-nums text-white">
            {fmt(payout.amount)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {fmtDate(payout.createdAt).split(",")[0]}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs mb-4">
        <div>
          <span className="text-slate-400 block mb-0.5">Bank</span>
          {payout.bankAccount ? (
            <span className="text-slate-200 font-mono text-xs">
              {payout.bankAccount.bankName} ·{" "}
              {mask(payout.bankAccount.accountNumber)}
            </span>
          ) : (
            <span className="text-slate-600 italic">None</span>
          )}
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">Ref</span>
          <span className="font-mono text-slate-300 break-all">
            {payout.reference || "—"}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onPreview}
          className="p-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/70 active:bg-slate-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="View details"
        >
          <Eye size={18} />
        </button>

        {isPending && (
          <>
            <button
              disabled={busy}
              onClick={onApprove}
              className="p-2.5 rounded-lg text-green-400 hover:text-white hover:bg-green-700/30 disabled:opacity-50 active:bg-green-800/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Approve"
            >
              {approving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
            </button>

            <button
              disabled={busy}
              onClick={onRejectRequest}
              className="p-2.5 rounded-lg text-red-400 hover:text-white hover:bg-red-700/30 disabled:opacity-50 active:bg-red-800/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Reject"
            >
              {rejecting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <X size={18} />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────
export default function PayoutsManagement() {
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("ALL");
  const [filterType, setFilterType] = React.useState<FilterType>("ALL");
  const [filterFrom, setFilterFrom] = React.useState("");
  const [filterTo, setFilterTo] = React.useState("");

  const [preview, setPreview] = React.useState<Payout | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<{
    id: string;
    type: "VENDOR" | "RIDER";
    name: string;
  } | null>(null);

  const [loadingIds, setLoadingIds] = React.useState<Record<string, boolean>>(
    {},
  );
  const [toast, setToast] = React.useState<{
    msg: string;
    kind: "success" | "error";
  } | null>(null);

  const swrKey = React.useMemo(() => {
    const p = new URLSearchParams();
    if (filterStatus !== "ALL") p.set("status", filterStatus);
    if (filterType !== "ALL") p.set("type", filterType);
    if (filterFrom) p.set("from", filterFrom);
    if (filterTo) p.set("to", filterTo);
    const qs = p.toString();
    return `/super-admin/payouts${qs ? "?" + qs : ""}`;
  }, [filterStatus, filterType, filterFrom, filterTo]);

  const { data, mutate, isLoading } = useSWR<Payout[]>(swrKey, fetcher, {
    refreshInterval: 30_000, // re-poll every 30 s so concurrent admins stay in sync
  });
  const payouts = data ?? [];

  const showToast = (msg: string, kind: "success" | "error") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4500);
  };

  const handleApprove = async (p: Payout) => {
    // Resolve the correct display name based on type and shape of the Payout object
    const recipientDisplay =
      p.payoutType === "VENDOR"
        ? p.store?.vendor?.name ?? p.store?.name ?? "vendor"
        : p.rider?.name ?? "rider";

    const confirm = await Swal.fire({
      title: "Approve Payout?",
      text: `Approve ${p.payoutType.toLowerCase()} payout of ${fmt(p.amount)} for ${recipientDisplay}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#1E293B",
      confirmButtonText: "Yes, Approve",
      background: "#0F172A",
      color: "#fff",
      customClass: { popup: "rounded-xl border border-gray-800" },
    });

    if (!confirm.isConfirmed) return;

    const key = `${p.id}-approve`;
    setLoadingIds((prev) => ({ ...prev, [key]: true }));

    try {
      await fetcher(`/super-admin/payouts/${p.payoutType}/${p.id}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      showToast("Payout approved and transfer initiated.", "success");
      mutate();
    } catch (err: any) {
      showToast(err.message ?? "Approve failed.", "error");
    } finally {
      setLoadingIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    const key = `${rejectTarget.id}-reject`;
    setLoadingIds((prev) => ({ ...prev, [key]: true }));

    try {
      await fetcher(
        `/super-admin/payouts/${rejectTarget.type}/${rejectTarget.id}/reject`,
        { method: "POST", body: JSON.stringify({ reason }) },
      );
      showToast("Payout rejected.", "success");
      setRejectTarget(null);
      mutate();
    } catch (err: any) {
      showToast(err.message ?? "Reject failed.", "error");
    } finally {
      setLoadingIds((prev) => ({ ...prev, [key]: false }));
    }
  };

  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const pendingCount = pendingPayouts.length;
  const totalPending = pendingPayouts.reduce((s, p) => s + p.amount, 0);
  // Show pending summary only when viewing all statuses — otherwise it's misleading
  const showPendingSummary = filterStatus === "ALL";

  if (isLoading && !data) return <PayoutsSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white pb-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 left-4 md:top-6 md:right-6 md:left-auto z-50 flex items-center gap-2.5 px-4 py-3.5 rounded-2xl shadow-2xl text-sm font-medium max-w-[90vw] md:max-w-md ${
            toast.kind === "success" ? "bg-green-700/95" : "bg-red-700/95"
          } backdrop-blur-sm border border-white/10`}
        >
          {toast.kind === "success" ? (
            <Check size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {preview && (
        <PreviewModal payout={preview} onClose={() => setPreview(null)} />
      )}
      {rejectTarget && (
        <RejectDialog
          target={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSubmit={handleReject}
          loading={!!loadingIds[`${rejectTarget.id}-reject`]}
        />
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pt-6 pb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <Banknote size={28} className="text-slate-400" />
            Payout Management
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            {showPendingSummary ? (
              <>
                {pendingCount} pending · Total pending:{" "}
                <span className="text-white font-semibold">
                  {fmt(totalPending)}
                </span>
              </>
            ) : (
              <>
                Showing{" "}
                <span className="text-white font-semibold">
                  {filterStatus}
                </span>{" "}
                payouts · {payouts.length} result
                {payouts.length !== 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-4 sm:p-5 mb-7">
          <div className="flex items-center gap-2.5 mb-4 sm:mb-3 text-slate-300">
            <Filter size={18} />
            <span className="font-medium text-sm">Filters</span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
            <Select
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as FilterStatus)}
              options={[
                { label: "All Status", value: "ALL" },
                { label: "Pending", value: "PENDING" },
                { label: "Approved", value: "APPROVED" },
                { label: "Paid", value: "PAID" },
                { label: "Rejected", value: "REJECTED" },
                { label: "Failed", value: "FAILED" },
              ]}
            />

            <Select
              value={filterType}
              onChange={(v) => setFilterType(v as FilterType)}
              options={[
                { label: "All Types", value: "ALL" },
                { label: "Vendor", value: "VENDOR" },
                { label: "Rider", value: "RIDER" },
              ]}
            />

            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1.5">From</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="bg-[#0F172A] border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-500 [color-scheme:dark]"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-slate-400 mb-1.5">To</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="bg-[#0F172A] border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-500 [color-scheme:dark]"
              />
            </div>

            {(filterStatus !== "ALL" ||
              filterType !== "ALL" ||
              filterFrom ||
              filterTo) && (
              <button
                onClick={() => {
                  setFilterStatus("ALL");
                  setFilterType("ALL");
                  setFilterFrom("");
                  setFilterTo("");
                }}
                className="col-span-2 sm:col-span-1 self-end text-sm text-slate-400 hover:text-white underline underline-offset-2 transition-colors py-2.5"
              >
                Clear filters
              </button>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 col-span-2 sm:col-span-1">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {payouts.length === 0 ? (
          <div className="bg-[#1E293B] border border-dashed border-slate-700 rounded-2xl p-10 sm:p-16 text-center">
            <p className="text-slate-300 font-medium text-lg">
              No payouts found
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="grid gap-4 md:hidden">
              {payouts.map((payout, idx) => {
                const approving = !!loadingIds[`${payout.id}-approve`];
                const rejecting = !!loadingIds[`${payout.id}-reject`];

                return (
                  <PayoutCard
                    key={payout.id}
                    payout={payout}
                    idx={idx}
                    onPreview={() => setPreview(payout)}
                    onApprove={() => handleApprove(payout)}
                    onRejectRequest={() =>
                      setRejectTarget({
                        id: payout.id,
                        type: payout.payoutType,
                        name: payout.recipientName,
                      })
                    }
                    approving={approving}
                    rejecting={rejecting}
                  />
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-slate-900/40 border-b border-slate-700">
                      <th className="text-left text-xs font-semibold text-slate-400 px-6 py-4 w-14">
                        #
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-6 py-4">
                        Recipient
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-6 py-4">
                        Type
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-400 px-6 py-4">
                        Amount
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-6 py-4">
                        Status
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-6 py-4">
                        Bank
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-6 py-4">
                        Date
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-400 px-6 py-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout, idx) => {
                      const isPending = payout.status === "PENDING";
                      const approving = !!loadingIds[`${payout.id}-approve`];
                      const rejecting = !!loadingIds[`${payout.id}-reject`];
                      const busy = approving || rejecting;

                      return (
                        <tr
                          key={payout.id}
                          className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {payout.recipientName}
                          </td>
                          <td className="px-6 py-4">
                            <TypeBadge type={payout.payoutType} />
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-white tabular-nums">
                            {fmt(payout.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={payout.status} />
                          </td>
                          <td className="px-6 py-4">
                            {payout.bankAccount ? (
                              <span className="text-slate-300 font-mono text-xs">
                                {payout.bankAccount.bankName} ·{" "}
                                {mask(payout.bankAccount.accountNumber)}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs italic">
                                None
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                            {fmtDate(payout.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setPreview(payout)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                title="Preview"
                              >
                                <Eye size={17} />
                              </button>

                              {isPending && (
                                <>
                                  <button
                                    disabled={busy}
                                    onClick={() => handleApprove(payout)}
                                    className="p-2 rounded-lg text-green-400 hover:text-white hover:bg-green-700/20 disabled:opacity-50 transition-colors"
                                    title="Approve"
                                  >
                                    {approving ? (
                                      <Loader2
                                        size={17}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Check size={17} />
                                    )}
                                  </button>

                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      setRejectTarget({
                                        id: payout.id,
                                        type: payout.payoutType,
                                        name: payout.recipientName,
                                      })
                                    }
                                    className="p-2 rounded-lg text-red-400 hover:text-white hover:bg-red-700/20 disabled:opacity-50 transition-colors"
                                    title="Reject"
                                  >
                                    {rejecting ? (
                                      <Loader2
                                        size={17}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <X size={17} />
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-500">
                {payouts.length} record{payouts.length !== 1 ? "s" : ""}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
