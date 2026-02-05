"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import useSWR, { mutate } from "swr";
import {
  Trash2,
  Map as MapIcon,
  Save,
  Plus,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { getSession } from "next-auth/react";
import { fetcher } from "../../hooks/useSuperAdminFetch";

// --- Dynamic Map Import ---
const MapEditor = dynamic(() => import("../../component/mapEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#0F172A] border border-gray-800 rounded-xl text-gray-500">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Map...
    </div>
  ),
});

interface Zone {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  coordinates: any; // Stored as Json in Prisma
}

export default function ServiceZonesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [resetDrawing, setResetDrawing] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneDesc, setZoneDesc] = useState("");
  const [zoneCoords, setZoneCoords] = useState<{ lat: number; lng: number }[]>(
    [],
  );

  // Fetch from the backend ServiceZone controller
  const { data: zones, isLoading } = useSWR<Zone[]>(
    "/super-admin/zones",
    fetcher,
  );

  const handleStartCreating = () => {
    setIsCreating(true);
    setZoneName("");
    setZoneDesc("");
    setZoneCoords([]);
    setResetDrawing((prev) => !prev);
  };

  const handleCancelCreating = () => {
    setIsCreating(false);
    setResetDrawing((prev) => !prev);
  };

  const handleSaveZone = async () => {
    if (!zoneName.trim()) return toast.error("Zone name is required");
    if (zoneCoords.length < 3)
      return toast.error("Please draw a valid polygon (at least 3 points)");

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const session = await getSession();
      const token = (session as any)?.accessToken;

      const res = await fetch(`${API_URL}/super-admin/zones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          name: zoneName,
          description: zoneDesc,
          coordinates: zoneCoords, // Matches coordinates field in schema
          isActive: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to create zone");

      toast.success("Service Zone created successfully");
      mutate("/super-admin/zones");
      handleCancelCreating();
    } catch (e) {
      toast.error("Failed to create zone");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: `Delete ${name}?`,
      text: "Users in this area will no longer be able to request services.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Delete",
      background: "#1E293B",
      color: "#fff",
    });

    if (result.isConfirmed) {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const session = await getSession();
        const token = (session as any)?.accessToken;

        const res = await fetch(`${API_URL}/super-admin/zones/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token || ""}` },
        });

        if (!res.ok) throw new Error();

        mutate("/super-admin/zones");
        toast.success("Zone deleted");
      } catch (e) {
        toast.error("Could not delete zone");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20 flex flex-col h-screen">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapIcon className="w-6 h-6 text-blue-500" /> Service Zones
          </h1>
          <p className="text-gray-400 text-sm">
            Define geofenced areas for operations.
          </p>
        </div>

        {!isCreating && (
          <button
            onClick={handleStartCreating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Add New Zone
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {isCreating && (
            <div className="bg-[#1E293B] border border-blue-500/50 p-5 rounded-xl animate-in slide-in-from-left-5 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>{" "}
                  New Zone
                </h3>
                <button
                  onClick={handleCancelCreating}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Zone Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Abuja Central"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Area details..."
                    value={zoneDesc}
                    onChange={(e) => setZoneDesc(e.target.value)}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-start gap-3 text-xs text-blue-200">
                  <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">Drawing Instructions:</p>
                    <ul className="list-disc pl-4 space-y-1 opacity-80">
                      <li>Click map to add points.</li>
                      <li>Minimum 3 points required.</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleSaveZone}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm"
                >
                  <Save className="w-4 h-4" /> Save Zone
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 pb-10">
            {isLoading ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Loader2 className="animate-spin text-blue-500" />
                <span className="text-gray-500 text-sm">Loading zones...</span>
              </div>
            ) : zones?.length === 0 && !isCreating ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-800 rounded-xl">
                <MapIcon className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500">No zones defined yet.</p>
              </div>
            ) : (
              zones?.map((zone) => (
                <div
                  key={zone.id}
                  className="bg-[#1E293B] border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-gray-600"
                >
                  <div>
                    <h4 className="text-white font-bold text-sm">
                      {zone.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${zone.isActive ? "bg-green-500" : "bg-gray-500"}`}
                      ></span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                        {zone.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(zone.id, zone.name)}
                    className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden border border-gray-800 relative shadow-2xl min-h-[400px]">
          <MapEditor
            existingZones={zones || []}
            isDrawing={isCreating}
            onPolygonChange={setZoneCoords}
            resetDrawing={resetDrawing}
          />
        </div>
      </div>
    </div>
  );
}
