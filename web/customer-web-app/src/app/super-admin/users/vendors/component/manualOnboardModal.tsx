"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Store,
  Mail,
  Tag,
  Phone,
  MapPin,
  ShieldCheck,
  User,
  Info,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import Swal from "sweetalert2";
import { getSession } from "next-auth/react";

interface ManualOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STORE_TYPES = ["RESTAURANT", "GROCERY", "PHARMACY", "MARKET"] as const;

export default function ManualOnboardModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualOnboardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [vendorForm, setVendorForm] = useState({
    ownerName: "",
    storeName: "",
    email: "",
    phone: "",
    type: "RESTAURANT",
    address: "",
  });

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setVendorForm({
        ownerName: "",
        storeName: "",
        email: "",
        phone: "",
        type: "RESTAURANT",
        address: "",
      });
    }
  }, [isOpen]);

  const handleVendorChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setVendorForm((prev) => ({ ...prev, [name]: value }));
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 5);

  const validate = () => {
    const { ownerName, storeName, email } = vendorForm;
    if (!ownerName.trim() || !storeName.trim() || !email.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Owner Name, Store Name, and Email are required.",
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#10b981",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      const API_URL = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      ).replace(/\/$/, "");

      const slug = generateSlug(vendorForm.storeName);

      const payload = {
        name: vendorForm.ownerName.trim(),
        storeName: vendorForm.storeName.trim(),
        email: vendorForm.email.trim(),
        phone: vendorForm.phone.trim() || undefined,
        slug,
        type: vendorForm.type,
        address: vendorForm.address.trim() || undefined,
      };

      const res = await fetch(`${API_URL}/super-admin/vendors/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        const msg = Array.isArray(err.message)
          ? err.message.join(", ")
          : err.message || "Failed to onboard vendor";
        throw new Error(msg);
      }

      const data = await res.json();

      Swal.fire({
        icon: "success",
        title: "Vendor Onboarded!",
        html: `<p><strong>${vendorForm.storeName}</strong> is now <span style="color:#10b981">ACTIVE & VERIFIED</span>.</p>`,
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#10b981",
        timer: 3000,
        showConfirmButton: false,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Onboarding Failed",
        text: error.message,
        background: "#0F172A",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-slate-700/50 backdrop-blur-xl bg-slate-900/90 flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Onboard Vendor
            </h2>
            <p className="text-sm text-slate-400">
              Create an active, verified vendor instantly
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-all duration-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-6 space-y-6">
            
            {/* Info Alert */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4 flex gap-3 items-start">
              <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-200 leading-relaxed">
                This vendor will be <span className="font-semibold">immediately active and verified</span>. They'll receive login credentials via email.
              </p>
            </div>

            {/* Form Grid */}
            <div className="space-y-5">
              
              {/* Primary Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Store Name */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Store Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
                    <Store className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-200" />
                    <input
                      required
                      type="text"
                      name="storeName"
                      value={vendorForm.storeName}
                      onChange={handleVendorChange}
                      onFocus={() => setFocusedField("storeName")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. Joe's Pizza"
                      className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Owner Name */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-200" />
                    <input
                      required
                      type="text"
                      name="ownerName"
                      value={vendorForm.ownerName}
                      onChange={handleVendorChange}
                      onFocus={() => setFocusedField("ownerName")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="e.g. Joe Doe"
                      className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-200" />
                    <input
                      required
                      type="email"
                      name="email"
                      value={vendorForm.email}
                      onChange={handleVendorChange}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="vendor@email.com"
                      className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Phone <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-200" />
                    <input
                      type="tel"
                      name="phone"
                      value={vendorForm.phone}
                      onChange={handleVendorChange}
                      onFocus={() => setFocusedField("phone")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="+234 800 000 0000"
                      className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Store Type */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Store Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
                    <Tag className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-200" />
                    <select
                      name="type"
                      value={vendorForm.type}
                      onChange={handleVendorChange}
                      onFocus={() => setFocusedField("type")}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all duration-200"
                    >
                      {STORE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-3 w-4 h-4 text-slate-500 pointer-events-none rotate-90 opacity-50" />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Address <span className="text-slate-500 font-normal">(optional)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-l-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-200" />
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-200" />
                    <input
                      type="text"
                      name="address"
                      value={vendorForm.address}
                      onChange={handleVendorChange}
                      onFocus={() => setFocusedField("address")}
                      onBlur={() => setFocusedField(null)}
                      placeholder="123 Main St, Lagos"
                      className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer with Floating Buttons */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-slate-700/50 backdrop-blur-xl bg-slate-900/90 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 text-slate-300 font-medium text-sm hover:bg-slate-700/50 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Onboard Vendor
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}