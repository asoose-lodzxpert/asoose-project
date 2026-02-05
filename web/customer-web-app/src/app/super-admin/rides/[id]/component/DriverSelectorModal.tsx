"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/app/super-admin/hooks/useSuperAdminFetch";
import {
  X,
  Search,
  Bike,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

// 1. Define the shape of a Rider object
interface Rider {
  id: string;
  name: string;
  image?: string;
  plateNumber?: string;
  status: string; // 'ACTIVE', 'INACTIVE', etc.
  isOnline: boolean;
}

// 2. Define the shape of the API Response
interface RidersApiResponse {
  data: Rider[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (riderId: string) => Promise<void>;
}

export default function DriverSelectorModal({
  isOpen,
  onClose,
  onAssign,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3. Pass the Generic Type <RidersApiResponse> to useSWR
  // This tells TypeScript that 'data' will have a 'data' property containing the array
  const { data, isLoading } = useSWR<RidersApiResponse>(
    isOpen
      ? `/super-admin/riders?status=ONLINE&limit=50&search=${search}`
      : null,
    fetcher,
  );

  // Now TypeScript knows 'data' exists on the response object
  const riders = data?.data || [];

  const handleConfirm = async () => {
    if (!selectedRider) return;
    setIsSubmitting(true);
    await onAssign(selectedRider);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Bike className="w-5 h-5 text-blue-500" /> Assign Driver (Online)
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search by name or plate..."
              className="w-full bg-[#0F172A] border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Riders List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-blue-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm font-medium text-gray-400">
                Finding drivers...
              </span>
            </div>
          ) : riders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-gray-500 gap-2">
              <AlertCircle className="w-10 h-10 opacity-30" />
              <p>No online drivers found matching &quot;{search}&quot;</p>
            </div>
          ) : (
            riders.map((rider) => (
              <div
                key={rider.id}
                onClick={() => setSelectedRider(rider.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedRider === rider.id
                    ? "bg-blue-600/20 border-blue-500 ring-1 ring-blue-500/50"
                    : "bg-gray-800/30 border-gray-700 hover:border-gray-500 hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold overflow-hidden border border-gray-600">
                    {rider.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rider.image}
                        alt={rider.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      rider.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{rider.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {rider.plateNumber || "No Plate"}
                      </span>
                      <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                      <span className="text-xs text-green-400 font-medium">
                        Online
                      </span>
                    </div>
                  </div>
                </div>
                {selectedRider === rider.id && (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-800/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white font-bold text-sm hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedRider || isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Confirm Assignment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
