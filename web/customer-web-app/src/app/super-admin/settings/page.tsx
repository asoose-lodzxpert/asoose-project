"use client";

import React, { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "../hooks/useSuperAdminFetch";
import {
  Settings,
  Users,
  CreditCard,
  Shield,
  Truck,
  Save,
  Lock,
  Plus,
  Trash2,
  Smartphone,
  CheckCircle,
  X,
  Loader2,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

// --- Types ---
interface SystemSettingDef {
  category: string;
  key: string;
  label: string;
  type: "toggle" | "input" | "percentage" | "currency";
  description?: string;
  defaultValue: any;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

// --- Constants ---
const ROLES = [
  {
    value: "ADMIN_MANAGER",
    label: "Operations Manager",
    desc: "Can manage Riders, Vendors, and Orders.",
  },
  {
    value: "ADMIN_SUPPORT",
    label: "Support Agent",
    desc: "Can view Disputes and basic Order info.",
  },
  {
    value: "ADMIN_FINANCE",
    label: "Finance Officer",
    desc: "View Payouts and Transactions only.",
  },
  {
    value: "SUPER_ADMIN",
    label: "Super Admin",
    desc: "Full access to everything.",
  },
];

const SETTING_DEFINITIONS: SystemSettingDef[] = [
  {
    category: "General",
    key: "maintenance_mode",
    label: "Maintenance Mode",
    type: "toggle",
    description: "Disable customer apps temporarily",
    defaultValue: false,
  },
  {
    category: "General",
    key: "support_phone",
    label: "Support Phone",
    type: "input",
    defaultValue: "+234 800 000 0000",
  },
  {
    category: "Financials",
    key: "global_commission",
    label: "Global Commission",
    type: "percentage",
    description: "Platform fee per transaction",
    defaultValue: 10,
  },
  {
    category: "Financials",
    key: "min_withdrawal",
    label: "Min Payout Limit",
    type: "currency",
    defaultValue: 5000,
  },
  // ── Ride Pricing ────────────────────────────────────────────────────────────
  {
    category: "Logistics",
    key: "ride_base_fare",
    label: "Ride Base Fare (₦)",
    type: "currency",
    description: "Fixed starting fare charged on every ride",
    defaultValue: 1000,
  },
  {
    category: "Logistics",
    key: "ride_per_km",
    label: "Ride Rate Per KM (₦)",
    type: "currency",
    description: "Per-kilometre charge for rides (after 10 PM rate: ₦1,000/km)",
    defaultValue: 700,
  },
  // ── Delivery Pricing ─────────────────────────────────────────────────────────
  {
    category: "Logistics",
    key: "delivery_base_fare",
    label: "Delivery Base Fare (₦)",
    type: "currency",
    description: "Fixed starting fare charged on every delivery",
    defaultValue: 700,
  },
  {
    category: "Logistics",
    key: "delivery_per_km",
    label: "Delivery Rate Per KM (₦)",
    type: "currency",
    description: "Per-kilometre charge for parcel deliveries",
    defaultValue: 400,
  },
  // ── Operations ───────────────────────────────────────────────────────────────
  {
    category: "Logistics",
    key: "search_radius",
    label: "Driver Search Radius (KM)",
    type: "input",
    description: "Radius to search for nearby drivers when a ride is requested",
    defaultValue: 10,
  },
];

const TABS = [
  { id: "General", icon: Smartphone, label: "General" },
  { id: "Financials", icon: CreditCard, label: "Financials" },
  { id: "Logistics", icon: Truck, label: "Logistics & Pricing" },
  { id: "Team", icon: Users, label: "Team & Access" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [localSettings, setLocalSettings] = useState<
    { key: string; value: any }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  // --- Data Fetching ---
  const { data: admins, isLoading: isLoadingAdmins } = useSWR<AdminUser[]>(
    "/super-admin/admins",
    fetcher,
  );
  const { data: remoteSettings, mutate: mutateSettings } = useSWR<any[]>(
    "/super-admin/settings",
    fetcher,
  );

  // --- Synchronization Effect ---
  useEffect(() => {
    if (remoteSettings) {
      const merged = SETTING_DEFINITIONS.map((def) => {
        const remote = remoteSettings.find((r) => r.key === def.key);
        let value = def.defaultValue;

        if (remote) {
          if (def.type === "toggle") value = remote.value === "true";
          else if (def.type === "currency" || def.type === "percentage")
            value = Number(remote.value);
          else value = remote.value;
        }
        return { key: def.key, value };
      });
      setLocalSettings(merged);
    }
  }, [remoteSettings]);

  // --- Handlers: Settings ---
  const handleSettingChange = (key: string, newValue: any) => {
    setLocalSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value: newValue } : s)),
    );
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const payload = localSettings.map((s) => ({
        key: s.key,
        value: String(s.value),
      }));

      await fetcher("/super-admin/settings/bulk", {
        method: "PATCH",
        body: JSON.stringify({ settings: payload }),
      });

      toast.success("System settings updated");
      mutateSettings();
    } catch (error: any) {
      toast.error(error.message || "Could not sync settings");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Team Management ---
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN_SUPPORT",
  });

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAdmin(true);
    try {
      await fetcher("/super-admin/admins", {
        method: "POST",
        body: JSON.stringify(newAdmin),
      });

      toast.success("Admin added");
      mutate("/super-admin/admins");
      setIsTeamModalOpen(false);
      setNewAdmin({ name: "", email: "", password: "", role: "ADMIN_SUPPORT" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const result = await Swal.fire({
      title: "Revoke Access?",
      text: "This user will lose access immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      background: "#1E293B",
      color: "#fff",
    });

    if (result.isConfirmed) {
      try {
        await fetcher(`/super-admin/admins/${id}`, {
          method: "DELETE",
        });

        mutate("/super-admin/admins");
        toast.success("Access revoked");
      } catch (e) {
        toast.error("Failed to remove admin");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Responsive Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-white">
              Platform Settings
            </h1>
            <p className="text-gray-400 text-sm">
              Configure system logic and administrative access.
            </p>
          </div>
          {activeTab !== "Team" && (
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-yellow-500 text-black font-black rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-all "
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Tabs Sidebar - Scrollable on Mobile */}
          <aside className="lg:col-span-1">
            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border lg:border-transparent ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white  border-blue-500"
                      : "text-gray-400 border-gray-800 hover:bg-[#1E293B] hover:text-white"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-bold whitespace-nowrap">
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <main className="lg:col-span-3">
            {activeTab === "Team" ? (
              <section className="bg-[#1E293B] border border-gray-800 rounded-3xl p-4 md:p-6 ">
                {/* Responsive Section Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                  <div>
                    <h2 className="text-lg font-black text-white">
                      Administrative Team
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Authorized accounts for the admin panel.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTeamModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all font-black text-xs"
                  >
                    <Plus className="w-4 h-4" /> Add Member
                  </button>
                </div>

                <div className="space-y-4">
                  {isLoadingAdmins ? (
                    <div className="text-center py-10 text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      Loading team...
                    </div>
                  ) : (
                    admins?.map((admin) => (
                      // Responsive Admin Card
                      <div
                        key={admin.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#0F172A] border border-gray-800 rounded-2xl group hover:border-blue-500/50 transition-all gap-4"
                      >
                        {/* User Info - with min-w-0 for truncating */}
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-white border border-gray-700 shrink-0">
                            {admin.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-black text-sm truncate">
                              {admin.name}
                            </p>
                            <p className="text-gray-500 text-xs flex items-center gap-1 truncate">
                              <Mail size={12} className="shrink-0" />{" "}
                              <span className="truncate">{admin.email}</span>
                            </p>
                          </div>
                        </div>

                        {/* Actions - Stacked w/ border on mobile */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t border-gray-800 sm:border-0">
                          <span className="text-[10px] uppercase font-black px-2 py-1 rounded border bg-slate-800 text-gray-300 border-gray-700 whitespace-nowrap">
                            {admin.role.replace("ADMIN_", "")}
                          </span>
                          {admin.role !== "SUPER_ADMIN" && (
                            <button
                              onClick={() => handleDeleteAdmin(admin.id)}
                              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : (
              <section className="space-y-4">
                {SETTING_DEFINITIONS.filter(
                  (s) => s.category === activeTab,
                ).map((def) => {
                  const currentValue =
                    localSettings.find((s) => s.key === def.key)?.value ??
                    def.defaultValue;
                  return (
                    <div
                      key={def.key}
                      className="bg-[#1E293B] border border-gray-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 "
                    >
                      <div>
                        <h3 className="text-white font-black mb-1">
                          {def.label}
                        </h3>
                        {def.description && (
                          <p className="text-gray-400 text-sm">
                            {def.description}
                          </p>
                        )}
                      </div>
                      <div className="min-w-[180px]">
                        {def.type === "toggle" ? (
                          <button
                            onClick={() =>
                              handleSettingChange(def.key, !currentValue)
                            }
                            className={`relative w-12 h-6 rounded-full transition-colors ${currentValue ? "bg-green-500" : "bg-slate-700"}`}
                          >
                            <span
                              className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${currentValue ? "translate-x-6" : "translate-x-0"}`}
                            />
                          </button>
                        ) : (
                          <div className="relative">
                            {def.type === "currency" && (
                              <span className="absolute left-3 top-2.5 text-gray-500 text-sm">
                                ₦
                              </span>
                            )}
                            {def.type === "percentage" && (
                              <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                                %
                              </span>
                            )}
                            <input
                              type={def.type === "input" ? "text" : "number"}
                              value={currentValue}
                              onChange={(e) =>
                                handleSettingChange(def.key, e.target.value)
                              }
                              className={`w-full bg-[#0F172A] border border-gray-700 rounded-xl py-2.5 text-white text-sm focus:border-blue-500 outline-none transition-all ${def.type === "currency" ? "pl-8" : "pl-4"} ${def.type === "percentage" ? "pr-8" : "pr-4"}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}
          </main>
        </div>
      </div>

      {/* --- ADD ADMIN MODAL --- */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-gray-700 rounded-3xl w-full max-w-md  p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-white">Add Team Member</h2>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-gray-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none"
                  placeholder="John Doe"
                  value={newAdmin.name}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Work Email
                </label>
                <input
                  required
                  type="email"
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none"
                  placeholder="john@asoose.com"
                  value={newAdmin.email}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Temp Password
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none"
                  placeholder="••••••••"
                  value={newAdmin.password}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Assign Permission
                </label>
                <select
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none cursor-pointer"
                  value={newAdmin.role}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, role: e.target.value })
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-black text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAdmin}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm disabled:opacity-50"
                >
                  {isCreatingAdmin ? (
                    <Loader2 size={18} className="animate-spin mx-auto" />
                  ) : (
                    "Create Admin"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
