"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  MapPin,
  Package,
  User,
  Phone,
  Clock,
  CheckCircle,
  Circle,
  Truck,
  XCircle,
  Weight,
  Droplets,
  Thermometer,
  AlertTriangle,
  Navigation,
  ShieldAlert,
  Flag,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import ReportDisputeModal from "@/app/main/orders/component/reportDisputeModal";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Delivery status ordering — used by the timeline
// ---------------------------------------------------------------------------
type DeliveryStatus =
  | "PENDING"
  | "REQUESTED"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

const STATUS_ORDER: DeliveryStatus[] = [
  "PENDING",
  "REQUESTED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
];

const TIMELINE_STEPS: {
  status: DeliveryStatus;
  label: string;
  sub: string;
}[] = [
  { status: "PENDING", label: "Created", sub: "Delivery request submitted" },
  {
    status: "REQUESTED",
    label: "Searching",
    sub: "Finding an available rider",
  },
  {
    status: "ASSIGNED",
    label: "Rider Assigned",
    sub: "Rider is heading to pickup",
  },
  {
    status: "PICKED_UP",
    label: "Picked Up",
    sub: "Package collected from sender",
  },
  {
    status: "IN_TRANSIT",
    label: "In Transit",
    sub: "En route to recipient",
  },
  {
    status: "DELIVERED",
    label: "Delivered",
    sub: "Package delivered successfully",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusRank = (s: DeliveryStatus) => {
  const idx = STATUS_ORDER.indexOf(s);
  return idx === -1 ? -1 : idx;
};

const isBeyond = (current: DeliveryStatus, step: DeliveryStatus) =>
  statusRank(current) >= statusRank(step);

const STATUS_CHIP: Record<string, string> = {
  DELIVERED:
    "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  IN_TRANSIT:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  PICKED_UP:
    "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  DEFAULT:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
};

const chipStyle = (status: string) =>
  STATUS_CHIP[status] ?? STATUS_CHIP.DEFAULT;

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function DeliveryTimeline({
  status,
  delivery,
}: {
  status: DeliveryStatus;
  delivery: any;
}) {
  const cancelled = status === "CANCELLED";

  if (cancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
        <XCircle className="w-6 h-6 text-red-500 shrink-0" />
        <div>
          <p className="font-bold text-red-700 dark:text-red-400">
            Delivery Cancelled
          </p>
          <p className="text-xs text-red-500/80 mt-0.5">
            This delivery was cancelled and will not be fulfilled.
          </p>
        </div>
      </div>
    );
  }

  // Timestamps keyed to steps
  const timestamps: Partial<Record<DeliveryStatus, string | null>> = {
    PENDING: delivery.createdAt,
    REQUESTED: delivery.createdAt,
    ASSIGNED: delivery.assignedAt,
    PICKED_UP: delivery.pickedUpAt,
    DELIVERED: delivery.deliveredAt,
  };

  return (
    <div className="relative">
      {/* Vertical connector */}
      <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-100 dark:bg-white/10" />

      <div className="space-y-6">
        {TIMELINE_STEPS.map((step) => {
          const done = isBeyond(status, step.status);
          const active =
            STATUS_ORDER[statusRank(status)] === step.status ||
            (step.status === "ASSIGNED" && status === "ACCEPTED");
          const ts = timestamps[step.status];

          return (
            <div key={step.status} className="flex gap-4 relative">
              {/* Dot */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full shrink-0 flex items-center justify-center border-2 transition-all ${
                  done
                    ? "bg-yellow-500 border-yellow-500 text-white"
                    : active
                      ? "bg-white dark:bg-[#151515] border-yellow-500 text-yellow-500"
                      : "bg-white dark:bg-[#151515] border-gray-200 dark:border-white/10 text-gray-300"
                }`}
              >
                {done ? (
                  <CheckCircle className="w-4 h-4" />
                ) : active ? (
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </div>

              {/* Text */}
              <div className="pt-1">
                <p
                  className={`text-sm font-bold ${
                    done
                      ? "text-gray-900 dark:text-white"
                      : active
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{step.sub}</p>
                {ts && done && (
                  <p className="text-[10px] text-gray-400 mt-1 font-mono">
                    {fmtDate(ts)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const deliveryId = params.id as string;

  const fetcher = async (url: string) => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
      throw new Error("Not authenticated");
    }
    const token = (session as any)?.accessToken;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to fetch delivery");
    }
    return res.json();
  };

  const shouldFetch =
    status === "authenticated" && deliveryId
      ? `${API_URL}/users/deliveries/${deliveryId}`
      : null;

  const {
    data: delivery,
    error,
    isLoading,
  } = useSWR(shouldFetch, fetcher, {
    // Poll every 10 s while in-progress; stop when terminal
    refreshInterval: (data) =>
      data && ["DELIVERED", "CANCELLED"].includes(data.status) ? 0 : 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  // Dispute modal state
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  // Check for an existing dispute — only fetched once delivery is DELIVERED
  const disputeCheckKey =
    status === "authenticated" && delivery?.status === "DELIVERED"
      ? `${API_URL}/super-admin/disputes/check?deliveryId=${deliveryId}`
      : null;

  const { data: disputeData, mutate: mutateDispute } = useSWR(
    disputeCheckKey,
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 5000 },
  );

  const { canReport, isExpired, hasDispute } = useMemo(() => {
    if (!delivery || delivery.status !== "DELIVERED") {
      return { canReport: false, isExpired: false, hasDispute: false };
    }
    const hasActiveDispute = !!disputeData?.dispute;

    let isPastWindow = false;
    if (delivery.deliveredAt) {
      const delivered = new Date(delivery.deliveredAt);
      const windowDate = new Date();
      windowDate.setDate(windowDate.getDate() - 7);
      isPastWindow = delivered < windowDate;
    }

    return {
      canReport: !isPastWindow && !hasActiveDispute,
      isExpired: isPastWindow && !hasActiveDispute,
      hasDispute: hasActiveDispute,
    };
  }, [delivery, disputeData]);

  // ---------- Loading ----------
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  // ---------- Error ----------
  if (error || !delivery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-[#151515] rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Delivery not found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
          {error?.message || "We couldn't locate this delivery record."}
        </p>
        <Link
          href="/main/profile"
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
        >
          Back to Profile
        </Link>
      </div>
    );
  }

  const pickupAddr: string =
    delivery.pickupAddress?.address ||
    [
      delivery.pickupAddress?.street,
      delivery.pickupAddress?.city,
      delivery.pickupAddress?.state,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Pickup location";

  const dropoffAddr: string =
    delivery.dropoffAddress?.address ||
    [
      delivery.dropoffAddress?.street,
      delivery.dropoffAddress?.city,
      delivery.dropoffAddress?.state,
    ]
      .filter(Boolean)
      .join(", ") ||
    "Dropoff location";

  const isFinal = ["DELIVERED", "CANCELLED"].includes(delivery.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-gray-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-4 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white dark:bg-[#151515] rounded-full flex items-center justify-center border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold">Delivery Details</h1>{" "}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              #{delivery.id.split("-")[0].toUpperCase()}
            </p>
          </div>
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full border ${chipStyle(delivery.status)}`}
          >
            {delivery.status.replaceAll("_", " ")}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Timeline */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <h2 className="text-base font-bold mb-6 flex items-center gap-2">
            <Truck className="w-5 h-5 text-yellow-500" />
            Delivery Progress
          </h2>
          <DeliveryTimeline status={delivery.status} delivery={delivery} />
        </div>

        {/* Addresses */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-yellow-500" />
            Route
          </h2>
          <div className="pl-2 border-l-2 border-gray-100 dark:border-white/10 ml-2 space-y-6">
            {/* Pickup */}
            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-gray-300 dark:bg-white/30 border-2 border-white dark:border-[#151515]" />
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-bold">
                Pickup
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {pickupAddr}
              </p>
              {delivery.pickupAddress?.city && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {delivery.pickupAddress.city}
                  {delivery.pickupAddress.state
                    ? `, ${delivery.pickupAddress.state}`
                    : ""}
                </p>
              )}
            </div>
            {/* Dropoff */}
            <div className="relative pl-6">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-yellow-500 border-2 border-white dark:border-[#151515]" />
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-bold">
                Delivery to
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {delivery.recipientName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{dropoffAddr}</p>
              {delivery.recipientPhone && (
                <a
                  href={`tel:${delivery.recipientPhone}`}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-500 hover:text-blue-400 transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  {delivery.recipientPhone}
                </a>
              )}
            </div>
          </div>

          {/* Distance */}
          {delivery.distanceKm != null && (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                Distance:{" "}
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {Number(delivery.distanceKm).toFixed(2)} km
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Package details */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <Package className="w-5 h-5 text-yellow-500" />
            Package Info
          </h2>

          <div className="space-y-3 text-sm">
            {delivery.packageDetails && (
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Contents</span>
                <span className="font-medium text-right max-w-[60%]">
                  {delivery.packageDetails}
                </span>
              </div>
            )}
            {delivery.weightKg != null && (
              <div className="flex justify-between items-center border-t border-gray-50 dark:border-white/5 pt-3">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5" /> Weight
                </span>
                <span className="font-medium">{delivery.weightKg} kg</span>
              </div>
            )}
          </div>

          {/* Flags */}
          {(delivery.isFragile ||
            delivery.isPerishable ||
            delivery.containsLiquid) && (
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex flex-wrap gap-2">
              {delivery.isFragile && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                  <AlertTriangle className="w-3 h-3" /> Fragile
                </span>
              )}
              {delivery.isPerishable && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
                  <Thermometer className="w-3 h-3" /> Perishable
                </span>
              )}
              {delivery.containsLiquid && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                  <Droplets className="w-3 h-3" /> Contains Liquid
                </span>
              )}
            </div>
          )}
        </div>

        {/* Rider info — shown only when assigned */}
        {delivery.riderName && (
          <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
            <h2 className="text-base font-bold mb-5 flex items-center gap-2">
              <User className="w-5 h-5 text-yellow-500" />
              Your Rider
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-black text-lg shrink-0">
                {delivery.riderName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white">
                  {delivery.riderName}
                </p>
                {delivery.riderPhone && (
                  <a
                    href={`tel:${delivery.riderPhone}`}
                    className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {delivery.riderPhone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment summary */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
          <h2 className="text-base font-bold mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Payment Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Delivery Fee</span>
              <span className="font-bold text-gray-900 dark:text-white">
                ₦{Number(delivery.deliveryFee ?? 0).toLocaleString()}
              </span>
            </div>
            {delivery.distanceKm != null && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Distance</span>
                <span>{Number(delivery.distanceKm).toFixed(2)} km</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500 pt-2 border-t border-gray-50 dark:border-white/5">
              <span>Placed</span>
              <span>{fmtDate(delivery.createdAt)}</span>
            </div>
            {delivery.deliveredAt && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivered</span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {fmtDate(delivery.deliveredAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        {!isFinal && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-0.5" />
            <span>
              This page refreshes automatically while your delivery is in
              progress.
            </span>
          </div>
        )}

        {/* Report Dispute — only visible after successful delivery */}
        {delivery.status === "DELIVERED" && (
          <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-yellow-500" />
              Report an Issue
            </h2>

            {hasDispute && (
              <div className="flex items-start justify-between gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-100 dark:border-yellow-900/20">
                <div className="flex items-start gap-3">
                  <Flag className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
                    You've already submitted a dispute for this delivery. Our
                    team is reviewing it.
                  </p>
                </div>
                {disputeData?.dispute?.id && (
                  <Link
                    href={`/main/disputes/${disputeData.dispute.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-yellow-700 dark:text-yellow-400 hover:underline shrink-0"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )}

            {canReport && (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Had a problem with this delivery? You can report an issue
                  within 7 days of delivery.
                </p>
                <button
                  onClick={() => setIsDisputeModalOpen(true)}
                  className="w-full py-4 bg-white dark:bg-[#151515] text-red-500 font-bold rounded-xl border border-gray-100 dark:border-white/5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  Report an Issue
                </button>
              </>
            )}

            {isExpired && (
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                  Dispute window closed (7 days)
                </p>
              </div>
            )}
          </div>
        )}

        <Link
          href="/main/profile"
          className="w-full py-4 bg-yellow-500 text-black font-bold text-center rounded-xl hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10 block"
        >
          Back to Profile
        </Link>
      </div>

      <ReportDisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        referenceId={deliveryId}
        type="DELIVERY"
        onSuccess={() => mutateDispute()}
      />
    </div>
  );
}
