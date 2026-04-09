"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Building2,
  Plus,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  MapPin,
  Store,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { getSession } from "next-auth/react";
import { fetcher } from "../../hooks/useSuperAdminFetch";

interface City {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  storeCount: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await getSession();
  const token = (session as any)?.accessToken;
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
      ...options.headers,
    },
  });
}

export default function CityManagementPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newState, setNewState] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: cities, isLoading } = useSWR<City[]>(
    "/super-admin/cities",
    fetcher
  );

  // Group cities by state
  const grouped = (cities || []).reduce<Record<string, City[]>>((acc, city) => {
    if (!acc[city.state]) acc[city.state] = [];
    acc[city.state].push(city);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!newName.trim() || !newState.trim()) {
      return toast.error("City name and state are required.");
    }
    setSaving(true);
    try {
      const res = await authFetch("/super-admin/cities", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), state: newState.trim(), isActive: false }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create city");
      }
      toast.success(`${newName} added. Toggle it on to activate.`);
      setNewName("");
      setNewState("");
      setShowAdd(false);
      mutate("/super-admin/cities");
    } catch (e: any) {
      toast.error(e.message || "Could not add city.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (city: City) => {
    setToggling(city.id);
    try {
      const res = await authFetch(`/super-admin/cities/${city.id}/toggle`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      toast.success(
        city.isActive
          ? `${city.name} deactivated — service disabled.`
          : `${city.name} activated — service is now live!`
      );
      mutate("/super-admin/cities");
    } catch {
      toast.error("Toggle failed. Try again.");
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (city: City) => {
    const result = await Swal.fire({
      title: `Remove ${city.name}?`,
      text: `This will unassign all ${city.storeCount} store(s) in this city. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, Remove",
      background: "#1E293B",
      color: "#fff",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await authFetch(`/super-admin/cities/${city.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(`${city.name} removed.`);
      mutate("/super-admin/cities");
    } catch {
      toast.error("Could not remove city.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-8 pb-20">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-yellow-500" />
            City Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Toggle a city to enable or disable all services in that area.
            No map drawing needed.
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 transition-colors font-bold text-sm shadow-lg shadow-yellow-500/20"
          >
            <Plus className="w-4 h-4" /> Add City
          </button>
        )}
      </div>

      {/* Add City Form */}
      {showAdd && (
        <div className="mb-6 bg-[#1E293B] border border-yellow-500/30 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              New City
            </h3>
            <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">City Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Lagos"
                className="w-full bg-[#0F172A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-yellow-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">State / Region</label>
              <input
                type="text"
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                placeholder="e.g. Lagos State"
                className="w-full bg-[#0F172A] border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-yellow-500 outline-none transition-colors"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 mb-4">
            City starts as <span className="text-gray-300 font-medium">inactive</span>. Use the toggle to go live.
          </p>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-black rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? "Adding..." : "Add City"}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center py-20 gap-3">
          <Loader2 className="animate-spin text-yellow-500 w-8 h-8" />
          <span className="text-gray-500 text-sm">Loading cities...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && Object.keys(grouped).length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-2xl">
          <MapPin className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No cities yet.</p>
          <p className="text-gray-600 text-sm mt-1">
            Add your first city to make services available.
          </p>
        </div>
      )}

      {/* Cities Grouped by State */}
      <div className="space-y-8">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([state, stateCities]) => (
            <div key={state}>
              {/* State Header */}
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {state}
                </span>
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-600">
                  {stateCities.filter((c) => c.isActive).length}/{stateCities.length} active
                </span>
              </div>

              {/* City Cards */}
              <div className="space-y-2">
                {stateCities.map((city) => (
                  <div
                    key={city.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                      city.isActive
                        ? "bg-[#1E293B] border-green-500/20 hover:border-green-500/40"
                        : "bg-[#1E293B]/60 border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    {/* City Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          city.isActive
                            ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]"
                            : "bg-gray-600"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm">{city.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-widest ${
                              city.isActive ? "text-green-400" : "text-gray-500"
                            }`}
                          >
                            {city.isActive ? "Live" : "Inactive"}
                          </span>
                          {city.storeCount > 0 && (
                            <>
                              <span className="text-gray-700">·</span>
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Store className="w-3 h-3" />
                                {city.storeCount} store{city.storeCount !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(city)}
                        disabled={toggling === city.id}
                        title={city.isActive ? "Deactivate city" : "Activate city"}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          city.isActive
                            ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                            : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
                        } disabled:opacity-50`}
                      >
                        {toggling === city.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : city.isActive ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                        {city.isActive ? "On" : "Off"}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(city)}
                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remove city"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Summary Footer */}
      {!isLoading && cities && cities.length > 0 && (
        <div className="mt-8 p-4 bg-[#1E293B] border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              <span className="font-bold text-white">{cities.filter((c) => c.isActive).length}</span>{" "}
              of{" "}
              <span className="font-bold text-white">{cities.length}</span>{" "}
              cities active
            </span>
            <span className="text-gray-500 text-xs">
              {cities.reduce((s, c) => s + c.storeCount, 0)} stores across all cities
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
