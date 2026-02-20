"use client";

import React, { useState } from "react";
import { Truck, Edit2, Save, X, Loader2 } from "lucide-react";
import { AppAlert } from "../../../customers/[id]/alerts";
import { fetcher } from "@/app/super-admin/hooks/useSuperAdminFetch"; // ✅ Use standardized fetcher

interface VehicleCardProps {
  vehicle: any;
  riderId: string;
  onUpdate: () => void;
  basePath?: string; // 'riders' | 'drivers' — defaults to 'riders'
}

export const VehicleCard = ({
  vehicle,
  riderId,
  onUpdate,
  basePath = "riders",
}: VehicleCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    year: vehicle?.year || new Date().getFullYear(),
    color: vehicle?.color || "",
    plateNumber: vehicle?.plateNumber || "",
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // ✅ FIX: Use fetcher with a relative path.
      // This handles port 3001, /api/v1 prefix, and Auth tokens automatically.
      await fetcher(`/super-admin/${basePath}/${riderId}/vehicle`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      AppAlert.success("Vehicle Updated");
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error("Vehicle Update Error:", error);
      AppAlert.error(
        "Error",
        error.message || "Could not update vehicle details",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!vehicle && !isEditing) return null;

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden h-full shadow-sm">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0F172A]/50">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <Truck className="w-4 h-4 text-blue-500" /> Vehicle Details
        </h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-white bg-slate-700/50 rounded transition-all"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 text-red-400 bg-red-400/10 rounded hover:bg-red-400/20 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="p-1.5 text-green-400 bg-green-400/10 rounded hover:bg-green-400/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1 tracking-wider">
            Brand
          </label>
          {isEditing ? (
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="w-full bg-[#0F172A] border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 outline-none transition-all"
            />
          ) : (
            <div className="text-white font-medium">
              {vehicle?.brand || "N/A"}
            </div>
          )}
        </div>

        <div>
          <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1 tracking-wider">
            Model
          </label>
          {isEditing ? (
            <input
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full bg-[#0F172A] border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 outline-none transition-all"
            />
          ) : (
            <div className="text-white font-medium">
              {vehicle?.model || "N/A"}
            </div>
          )}
        </div>

        <div>
          <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1 tracking-wider">
            Color
          </label>
          {isEditing ? (
            <input
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full bg-[#0F172A] border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 outline-none transition-all"
            />
          ) : (
            <div className="text-white font-medium">
              {vehicle?.color || "N/A"}
            </div>
          )}
        </div>

        <div>
          <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1 tracking-wider">
            Plate Number
          </label>
          {isEditing ? (
            <input
              value={form.plateNumber}
              onChange={(e) =>
                setForm({ ...form, plateNumber: e.target.value.toUpperCase() })
              }
              className="w-full bg-[#0F172A] border border-gray-700 rounded px-2 py-1.5 text-white font-mono text-xs uppercase focus:border-blue-500 outline-none transition-all"
            />
          ) : (
            <div className="text-yellow-500 font-mono font-bold bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 w-fit text-xs">
              {vehicle?.plateNumber || "N/A"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
