"use client";

import React, { useState } from "react";
import { X, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import { toast } from "react-toastify";

// ------------------------------------------------------------------
// The status values as stored in the DB (Prisma DeliveryStatus enum)
// ------------------------------------------------------------------
const ALL_STATUSES: { value: string; label: string; description: string; color: string }[] = [
  {
    value: "REQUESTED",
    label: "Requested",
    description: "Searching for an available rider",
    color: "blue",
  },
  {
    value: "ASSIGNED",
    label: "Assigned",
    description: "A rider has been assigned and notified",
    color: "purple",
  },
  {
    value: "ACCEPTED",
    label: "Accepted",
    description: "Rider accepted and is heading to pickup",
    color: "indigo",
  },
  {
    value: "PICKED_UP",
    label: "Picked Up",
    description: "Package collected from sender",
    color: "yellow",
  },
  {
    value: "IN_TRANSIT",
    label: "In Transit",
    description: "Package en route to recipient",
    color: "orange",
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    description: "Package successfully delivered",
    color: "green",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    description: "Delivery cancelled — cannot be undone",
    color: "red",
  },
];

interface UpdateStatusModalProps {
  deliveryId: string;
  currentStatus: string; // display-transformed status from API
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateStatusModal({
  deliveryId,
  currentStatus,
  onClose,
  onSuccess,
}: UpdateStatusModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await fetcher(`/super-admin/deliveries/${deliveryId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selected }),
      });
      toast.success(`Delivery status updated to ${ALL_STATUSES.find((s) => s.value === selected)?.label}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const colorMap: Record<string, string> = {
    blue: "border-blue-500/50 bg-blue-500/10 text-blue-400",
    purple: "border-purple-500/50 bg-purple-500/10 text-purple-400",
    indigo: "border-indigo-500/50 bg-indigo-500/10 text-indigo-400",
    yellow: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
    orange: "border-orange-500/50 bg-orange-500/10 text-orange-400",
    green: "border-green-500/50 bg-green-500/10 text-green-400",
    red: "border-red-500/50 bg-red-500/10 text-red-400",
  };

  const selectedColorMap: Record<string, string> = {
    blue: "border-blue-400 bg-blue-500/20 ring-2 ring-blue-500/30",
    purple: "border-purple-400 bg-purple-500/20 ring-2 ring-purple-500/30",
    indigo: "border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-500/30",
    yellow: "border-yellow-400 bg-yellow-500/20 ring-2 ring-yellow-500/30",
    orange: "border-orange-400 bg-orange-500/20 ring-2 ring-orange-500/30",
    green: "border-green-400 bg-green-500/20 ring-2 ring-green-500/30",
    red: "border-red-400 bg-red-500/20 ring-2 ring-red-500/30",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-[#1E293B] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold text-lg">Update Delivery Status</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Current:{" "}
              <span className="text-yellow-400 font-medium">{currentStatus}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Grid */}
        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
          {ALL_STATUSES.map((s) => {
            const isSelected = selected === s.value;
            const baseClass = `w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3`;
            const stateClass = isSelected
              ? selectedColorMap[s.color]
              : `border-gray-700 hover:border-gray-500 bg-gray-800/40`;

            return (
              <button
                key={s.value}
                className={`${baseClass} ${stateClass}`}
                onClick={() => setSelected(s.value)}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                    ${isSelected ? "border-current" : "border-gray-600"}
                    ${colorMap[s.color].split(" ").find((c) => c.startsWith("text-")) || "text-gray-400"}
                  `}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                </div>
                <div>
                  <p className={`font-semibold text-sm ${isSelected ? colorMap[s.color].split(" ").find((c) => c.startsWith("text-")) : "text-white"}`}>
                    {s.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                </div>
                {isSelected && (
                  <CheckCircle
                    className={`w-4 h-4 ml-auto flex-shrink-0 mt-0.5 ${colorMap[s.color].split(" ").find((c) => c.startsWith("text-"))}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Warning for CANCELLED */}
        {selected === "CANCELLED" && (
          <div className="mx-5 mb-1 flex gap-2 items-start text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Cancelling this delivery is irreversible and may trigger a refund if payment was collected.</span>
          </div>
        )}

        {/* Warning for DELIVERED */}
        {selected === "DELIVERED" && (
          <div className="mx-5 mb-1 flex gap-2 items-start text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Marking as Delivered will finalize earnings, close the order, and cannot be reversed.</span>
          </div>
        )}

        {/* Footer */}
        <div className="p-5 border-t border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            className="px-5 py-2 text-sm font-bold bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-yellow-500/10"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Update
          </button>
        </div>
      </div>
    </div>
  );
}
