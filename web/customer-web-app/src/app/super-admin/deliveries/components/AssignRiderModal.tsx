"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { X, Search, UserCheck, Loader2, Bike } from "lucide-react";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import { toast } from "react-toastify";

// --- Types ---
interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
  isOnline: boolean;
  vehicle?: { model: string; color: string; plate: string } | null;
}

interface RiderApiResponse {
  data: Rider[];
  meta: { total: number };
}

interface AssignRiderModalProps {
  deliveryId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignRiderModal({
  deliveryId,
  onClose,
  onSuccess,
}: AssignRiderModalProps) {
  const [search, setSearch] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const { data, isLoading, error } = useSWR<RiderApiResponse>(
    `/super-admin/riders?status=ACTIVE&limit=100`,
    fetcher,
  );

  const riders = data?.data || [];

  const filtered = riders.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search),
  );

  const handleAssign = async () => {
    if (!selectedRiderId) return;
    setAssigning(true);
    try {
      await fetcher(`/super-admin/deliveries/${deliveryId}/assign-rider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId: selectedRiderId }),
      });
      toast.success("Rider assigned successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign rider");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-[#1E293B] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-lg">Assign Rider</h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Select an active rider for this delivery
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 outline-none focus:border-yellow-500 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Rider List */}
        <div className="overflow-y-auto max-h-72 p-2">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading riders...
            </div>
          )}

          {error && (
            <div className="py-10 text-center text-red-400 text-sm">
              Failed to load riders
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="py-10 text-center text-gray-500 text-sm">
              No active riders found
            </div>
          )}

          {filtered.map((rider) => {
            const isSelected = selectedRiderId === rider.id;
            const vehicleLabel = rider.vehicle
              ? `${rider.vehicle.color} ${rider.vehicle.model} • ${rider.vehicle.plate}`
              : "No vehicle info";

            return (
              <button
                key={rider.id}
                onClick={() => setSelectedRiderId(rider.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl mb-1 text-left transition-all border ${
                  isSelected
                    ? "bg-yellow-500/10 border-yellow-500/40 text-white"
                    : "border-transparent hover:bg-gray-800/60 text-gray-300"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    isSelected
                      ? "bg-yellow-500 text-black"
                      : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {rider.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{rider.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {rider.phone}
                  </p>
                  <p className="text-[10px] text-gray-600 truncate mt-0.5 flex items-center gap-1">
                    <Bike className="w-3 h-3" />
                    {vehicleLabel}
                  </p>
                </div>

                {/* Online dot */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${rider.isOnline ? "bg-green-400" : "bg-gray-600"}`}
                    title={rider.isOnline ? "Online" : "Offline"}
                  />
                  {isSelected && (
                    <UserCheck className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedRiderId || assigning}
            className="flex-1 py-2 rounded-lg bg-yellow-500 text-black text-sm font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {assigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Confirm Assignment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
