"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

const RIDE_STATUSES = [
  "REQUESTED",
  "SEARCHING",
  "ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

interface Props {
  isOpen: boolean;
  currentStatus: string;
  onClose: () => void;
  onConfirm: (status: string, reason: string) => Promise<void>;
}

export default function ForceStatusModal({
  isOpen,
  currentStatus,
  onClose,
  onConfirm,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedStatus, reason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    REQUESTED: "text-blue-400",
    SEARCHING: "text-blue-400",
    ACCEPTED: "text-purple-400",
    ARRIVED: "text-yellow-400",
    IN_PROGRESS: "text-green-400",
    COMPLETED: "text-green-500",
    CANCELLED: "text-red-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-gray-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Force Status Override
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-400">
            Current status:{" "}
            <span
              className={`font-bold ${statusColors[currentStatus] ?? "text-white"}`}
            >
              {currentStatus.replace(/_/g, " ")}
            </span>
          </p>

          {/* Status Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              New Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RIDE_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold text-left border transition-all ${
                    selectedStatus === s
                      ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                      : "bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                  }`}
                >
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Reason{" "}
              <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Driver reported issue, system error..."
              className="w-full bg-[#0F172A] border border-gray-600 rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all resize-none placeholder:text-gray-600"
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400/80">
            ⚠️ This bypasses normal business logic. Use only for
            support/testing.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-800/30 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white font-bold text-sm hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !selectedStatus ||
              selectedStatus === currentStatus ||
              isSubmitting
            }
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-500/30 disabled:cursor-not-allowed text-black font-bold rounded-lg text-sm flex items-center gap-2 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Override"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
