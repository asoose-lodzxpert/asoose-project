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
  Info,
  Send,
  User,
} from "lucide-react";
import Swal from "sweetalert2";

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorAdded: () => void;
}

export default function AddVendorModal({
  isOpen,
  onClose,
  onVendorAdded,
}: AddVendorModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Distinguish between the Company (Store) and the Person (Owner)
  const [formData, setFormData] = useState({
    ownerName: "",
    storeName: "",
    email: "",
    category: "General Goods",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Generate Slug
      const slug =
        formData.storeName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Math.random().toString(36).substring(2, 5);

      // 2. Map Frontend Category to Backend Enum
      // Enum: RESTAURANT | GROCERY | PHARMACY | MARKET
      let type = formData.category.toUpperCase();
      if (type === "GENERAL GOODS") type = "MARKET"; // Mapping fallback

      // 3. Prepare Payload
      // Note: We send a dummy password to satisfy DTO validation if required,
      // but the backend logic we just wrote overwrites it with a secure random one
      // OR uses this one. To be safe, let's let backend generate it by NOT sending it
      // if validation allows, or sending a complex random string here.
      // Based on DTO, 'password' is required.
      const payload = {
        name: formData.ownerName,
        storeName: formData.storeName,
        email: formData.email,
        phone: formData.phone,
        slug: slug,
        type: type,
        password: "INIT-PASSWORD-" + Math.random().toString(36).slice(-8), // Backend will hash this
      };

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/super-admin/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = Array.isArray(errorData.message)
          ? errorData.message.join(", ")
          : errorData.message || "Failed to add vendor";
        throw new Error(errorMessage);
      }

      Swal.fire({
        icon: "success",
        title: "Invitation Sent",
        text: `Vendor account created. Login details sent to ${formData.email}.`,
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#eab308",
        timer: 2000,
        showConfirmButton: false,
      });

      onVendorAdded();
      onClose();
      setFormData({
        ownerName: "",
        storeName: "",
        email: "",
        category: "General Goods",
        phone: "",
        address: "",
      });
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: error.message,
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-gray-800 w-full max-w-lg rounded-xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-800 bg-[#1E293B] shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-yellow-500" />
            Invite New Vendor
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 items-start">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm text-blue-200">
              <p className="font-bold mb-1">Email Invitation</p>
              The vendor will receive an email with their temporary login
              credentials immediately after creation.
            </div>
          </div>

          <form
            id="add-vendor-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Store Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  required
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  placeholder="e.g. Joe's Pizza"
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Owner Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  required
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="e.g. Joe Doe"
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="vendor@email.com"
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 appearance-none cursor-pointer"
                >
                  <option value="Restaurant">Restaurant</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Market">Market</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main St, City, Country"
                  className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-800 bg-[#1E293B] shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-vendor-form"
            disabled={isLoading}
            className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors text-sm flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending Invite...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send Invite
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
