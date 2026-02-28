"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  User,
  Mail,
  Phone,
  Tag,
  MapPin,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Building2,
  Info,
  ImagePlus,
} from "lucide-react";
import Swal from "sweetalert2";
import { getSession } from "next-auth/react";
import { LocationInput } from "@/components/shared/LocationInput";

// ─── Constants ───────────────────────────────────────────────────────────────
const STORE_TYPES = ["RESTAURANT", "GROCERY", "PHARMACY", "MARKET"] as const;

type StoreType = (typeof STORE_TYPES)[number];

const TABS = [
  { id: "basic", label: "Basic Info", icon: Store },
  { id: "location", label: "Location", icon: MapPin },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Field Components ─────────────────────────────────────────────────────────
function FormField({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
        {optional && (
          <span className="text-slate-500 font-normal normal-case tracking-normal">
            (optional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ElementType;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
      {Icon && (
        <Icon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
      )}
      <input
        {...props}
        className={`w-full bg-slate-800/60 border border-slate-600/50 rounded-lg ${Icon ? "pl-11" : "pl-4"} pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all ${props.className ?? ""}`}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreateVendorPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    storeName: "",
    ownerName: "",
    email: "",
    phone: "",
    type: "RESTAURANT" as StoreType,
  });

  const [addressText, setAddressText] = useState("");
  const [addressCoords, setAddressCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const handleFileChange =
    (field: "logo" | "banner") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      const url = file ? URL.createObjectURL(file) : null;
      if (field === "logo") {
        setLogoFile(file);
        setLogoPreview(url);
      } else {
        setBannerFile(file);
        setBannerPreview(url);
      }
    };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 5);

  const validate = () => {
    if (
      !form.storeName.trim() ||
      !form.ownerName.trim() ||
      !form.email.trim()
    ) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Store Name, Owner Name and Email are required.",
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Email",
        text: "Please enter a valid email address.",
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      const API_URL = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      ).replace(/\/$/, "");

      const fd = new FormData();
      fd.append("name", form.ownerName.trim());
      fd.append("storeName", form.storeName.trim());
      fd.append("email", form.email.trim());
      if (form.phone.trim()) fd.append("phone", form.phone.trim());
      fd.append("slug", generateSlug(form.storeName));
      fd.append("type", form.type);
      if (addressText.trim()) fd.append("address", addressText.trim());
      if (addressCoords?.lat != null)
        fd.append("lat", String(addressCoords.lat));
      if (addressCoords?.lng != null)
        fd.append("lng", String(addressCoords.lng));
      if (logoFile) fd.append("logo", logoFile);
      if (bannerFile) fd.append("banner", bannerFile);

      const res = await fetch(`${API_URL}/super-admin/vendors/onboard`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          Array.isArray(err.message)
            ? err.message.join(", ")
            : err.message || "Failed to create vendor",
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Vendor Created!",
        html: `<p><strong>${form.storeName}</strong> is now <span style="color:#10b981">ACTIVE & VERIFIED</span>.</p><p style="font-size:13px;color:#94a3b8;margin-top:8px">Login credentials have been sent to <strong>${form.email}</strong></p>`,
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });

      router.push("/super-admin/users/vendors");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text: err.message,
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-8 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Create Vendor
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Onboard a new vendor as Active &amp; Verified immediately
            </p>
          </div>
        </div>

        {/* ── Info Banner ── */}
        <div className="flex gap-3 items-start bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-200 leading-relaxed">
            This vendor will be{" "}
            <span className="font-semibold">
              immediately active and verified
            </span>{" "}
            — no review flow. They will receive login credentials by email.
            Document upload is handled by the vendor.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit}>
          <div className="bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
            {/* ─── Tab: Basic Info ─── */}
            {activeTab === "basic" && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Store Name" required>
                    <TextInput
                      icon={Store}
                      type="text"
                      name="storeName"
                      value={form.storeName}
                      onChange={handleChange}
                      placeholder="e.g. Joe's Kitchen"
                      required
                    />
                  </FormField>

                  <FormField label="Owner Name" required>
                    <TextInput
                      icon={User}
                      type="text"
                      name="ownerName"
                      value={form.ownerName}
                      onChange={handleChange}
                      placeholder="e.g. Joe Doe"
                      required
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Email Address" required>
                    <TextInput
                      icon={Mail}
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="vendor@email.com"
                      required
                    />
                  </FormField>

                  <FormField label="Phone Number" optional>
                    <TextInput
                      icon={Phone}
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+234 800 000 0000"
                    />
                  </FormField>
                </div>

                <FormField label="Store Type" required>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <Tag className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all"
                    >
                      {STORE_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-slate-900">
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormField>

                {/* ── Media: Logo & Banner ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Logo */}
                  <FormField label="Store Logo" optional>
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-600/60 rounded-xl p-4 cursor-pointer hover:border-emerald-500/50 transition-colors relative overflow-hidden">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <>
                          <ImagePlus className="w-8 h-8 text-slate-500" />
                          <span className="text-xs text-slate-400">
                            Click to upload logo
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange("logo")}
                      />
                    </label>
                  </FormField>

                  {/* Banner */}
                  <FormField label="Store Banner" optional>
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-600/60 rounded-xl p-4 cursor-pointer hover:border-emerald-500/50 transition-colors relative overflow-hidden">
                      {bannerPreview ? (
                        <img
                          src={bannerPreview}
                          alt="Banner preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <>
                          <ImagePlus className="w-8 h-8 text-slate-500" />
                          <span className="text-xs text-slate-400">
                            Click to upload banner
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleFileChange("banner")}
                      />
                    </label>
                  </FormField>
                </div>

                {/* Tab Navigation Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab("location")}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-all"
                  >
                    Next: Location →
                  </button>
                </div>
              </div>
            )}

            {/* ─── Tab: Location ─── */}
            {activeTab === "location" && (
              <div className="p-6 space-y-5">
                <FormField label="Store Address" optional>
                  <LocationInput
                    value={addressText}
                    onValueChange={(val) => {
                      setAddressText(val);
                      setAddressCoords(null);
                    }}
                    onLocationSelect={(loc, address) => {
                      setAddressCoords({ lat: loc.lat, lng: loc.lng });
                      setAddressText(address);
                    }}
                    placeholder="Search street, area or landmark…"
                    showGeolocation
                    className="[&_input]:bg-slate-800/60 [&_input]:border-slate-600/50 [&_input]:text-white [&_input]:placeholder-slate-500 [&_input]:rounded-lg [&_ul]:bg-slate-800 [&_ul]:border-slate-700"
                  />
                  {addressCoords && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1 mt-2">
                      <MapPin className="w-3 h-3" />
                      Location pinned ({addressCoords.lat.toFixed(4)},{" "}
                      {addressCoords.lng.toFixed(4)})
                    </p>
                  )}
                </FormField>

                {/* Summary Preview */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Store", value: form.storeName },
                      { label: "Owner", value: form.ownerName },
                      { label: "Email", value: form.email },
                      { label: "Phone", value: form.phone || "—" },
                      {
                        label: "Type",
                        value:
                          form.type.charAt(0) +
                          form.type.slice(1).toLowerCase(),
                      },
                      { label: "Address", value: addressText || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-slate-500 w-20 shrink-0">
                          {label}
                        </span>
                        <span className="text-white font-medium truncate">
                          {value || (
                            <span className="text-slate-500 italic">empty</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("basic")}
                    className="px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm font-semibold rounded-lg transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Vendor…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Create &amp; Activate Vendor
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
