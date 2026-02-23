"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Package,
  Plus,
  Trash2,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Info,
} from "lucide-react";
import Swal from "sweetalert2";
import { getSession } from "next-auth/react";

interface Category {
  id: string;
  name: string;
}

interface ProductRow {
  id: string; // client-side key only
  name: string;
  price: string;
  categoryId: string;
  description: string;
  stock: string;
}

interface ManualOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STORE_TYPES = ["RESTAURANT", "GROCERY", "PHARMACY", "MARKET"] as const;

const emptyProduct = (): ProductRow => ({
  id: Math.random().toString(36).slice(2),
  name: "",
  price: "",
  categoryId: "",
  description: "",
  stock: "0",
});

export default function ManualOnboardModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualOnboardModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [vendorForm, setVendorForm] = useState({
    ownerName: "",
    storeName: "",
    email: "",
    phone: "",
    type: "RESTAURANT",
    address: "",
  });

  const [products, setProducts] = useState<ProductRow[]>([emptyProduct()]);

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
      setStep(1);
      setVendorForm({
        ownerName: "",
        storeName: "",
        email: "",
        phone: "",
        type: "RESTAURANT",
        address: "",
      });
      setProducts([emptyProduct()]);
    }
  }, [isOpen]);

  // Fetch categories on open
  useEffect(() => {
    if (!isOpen) return;
    const API_URL =
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(
        /\/$/,
        "",
      );
    getSession().then((session) => {
      const token = (session as any)?.accessToken;
      fetch(`${API_URL}/categories`, {
        headers: {
          Authorization: `Bearer ${token || ""}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setCategories(data);
          else if (Array.isArray(data?.data)) setCategories(data.data);
        })
        .catch(() => setCategories([]));
    });
  }, [isOpen]);

  const handleVendorChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setVendorForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (
    id: string,
    field: keyof ProductRow,
    value: string,
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  const addProductRow = () => setProducts((prev) => [...prev, emptyProduct()]);
  const removeProductRow = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id));

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 5);

  const validateStep1 = () => {
    const { ownerName, storeName, email } = vendorForm;
    if (!ownerName.trim() || !storeName.trim() || !email.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Owner Name, Store Name, and Email are required.",
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#eab308",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Email",
        text: "Please enter a valid email address.",
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#eab308",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep1()) return;

    setIsLoading(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      const API_URL = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      ).replace(/\/$/, "");

      const slug = generateSlug(vendorForm.storeName);

      // Only include products where name + price + category are filled
      const validProducts = products
        .filter((p) => p.name.trim() && p.price && p.categoryId)
        .map((p) => ({
          name: p.name.trim(),
          price: parseFloat(p.price),
          categoryId: p.categoryId,
          description: p.description.trim() || undefined,
          stock: parseInt(p.stock) || 0,
        }));

      const payload = {
        name: vendorForm.ownerName.trim(),
        storeName: vendorForm.storeName.trim(),
        email: vendorForm.email.trim(),
        phone: vendorForm.phone.trim() || undefined,
        slug,
        type: vendorForm.type,
        address: vendorForm.address.trim() || undefined,
        initialProducts: validProducts.length > 0 ? validProducts : undefined,
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
        html: `<p><strong>${vendorForm.storeName}</strong> is now <span style="color:#22c55e">ACTIVE & VERIFIED</span>.</p>${validProducts.length > 0 ? `<p class="mt-2 text-sm">${validProducts.length} product(s) created.</p>` : ""}`,
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#eab308",
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
        background: "#1E293B",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-gray-800 w-full max-w-2xl rounded-xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-yellow-500" />
              Manual Vendor Onboarding
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Creates vendor as <span className="text-green-400 font-bold">ACTIVE</span> &amp; <span className="text-blue-400 font-bold">VERIFIED</span> — no approval needed
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-gray-800 shrink-0">
          <button
            onClick={() => setStep(1)}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${step === 1 ? "text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/5" : "text-gray-500 hover:text-gray-300"}`}
          >
            <User className="w-4 h-4" />
            Step 1: Vendor Info
          </button>
          <button
            onClick={() => { if (validateStep1()) setStep(2); }}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${step === 2 ? "text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/5" : "text-gray-500 hover:text-gray-300"}`}
          >
            <Package className="w-4 h-4" />
            Step 2: Initial Products
            <span className="text-[10px] text-gray-500 font-normal">(optional)</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* ── STEP 1: Vendor Info ─────────────────────────────── */}
          {step === 1 && (
            <div className="p-4 md:p-6 space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3 items-start">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">
                  This bypasses the normal signup flow. The vendor will receive login credentials via email and their store will be immediately live.
                </p>
              </div>

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
                    value={vendorForm.storeName}
                    onChange={handleVendorChange}
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
                    value={vendorForm.ownerName}
                    onChange={handleVendorChange}
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
                      value={vendorForm.email}
                      onChange={handleVendorChange}
                      placeholder="vendor@email.com"
                      className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      name="phone"
                      value={vendorForm.phone}
                      onChange={handleVendorChange}
                      placeholder="+234 800 000 0000"
                      className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Store Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Store Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <select
                    name="type"
                    value={vendorForm.type}
                    onChange={handleVendorChange}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 appearance-none cursor-pointer"
                  >
                    {STORE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Address <span className="text-gray-600 normal-case text-[10px]">(optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    name="address"
                    value={vendorForm.address}
                    onChange={handleVendorChange}
                    placeholder="123 Main St, Lagos"
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Initial Products ─────────────────────────── */}
          {step === 2 && (
            <div className="p-4 md:p-6 space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-3 items-start">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-200">
                  Add initial products to populate the store immediately after onboarding. Incomplete rows (missing name, price, or category) will be skipped.
                </p>
              </div>

              <div className="space-y-3">
                {products.map((product, idx) => (
                  <div
                    key={product.id}
                    className="bg-[#0F172A] border border-gray-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-400 uppercase">
                        Product {idx + 1}
                      </span>
                      {products.length > 1 && (
                        <button
                          onClick={() => removeProductRow(product.id)}
                          className="p-1 hover:bg-red-500/10 rounded text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Name & Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Name *</label>
                        <div className="relative">
                          <Package className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-600" />
                          <input
                            type="text"
                            value={product.name}
                            onChange={(e) => handleProductChange(product.id, "name", e.target.value)}
                            placeholder="Product name"
                            className="w-full bg-[#1E293B] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Price (₦) *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-600" />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.price}
                            onChange={(e) => handleProductChange(product.id, "price", e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#1E293B] border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Category & Stock */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Category *</label>
                        <select
                          value={product.categoryId}
                          onChange={(e) => handleProductChange(product.id, "categoryId", e.target.value)}
                          className="w-full bg-[#1E293B] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500 appearance-none cursor-pointer"
                        >
                          <option value="">Select category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Stock</label>
                        <input
                          type="number"
                          min="0"
                          value={product.stock}
                          onChange={(e) => handleProductChange(product.id, "stock", e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#1E293B] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Description <span className="text-gray-600 normal-case">(optional)</span></label>
                      <input
                        type="text"
                        value={product.description}
                        onChange={(e) => handleProductChange(product.id, "description", e.target.value)}
                        placeholder="Short product description"
                        className="w-full bg-[#1E293B] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-500 placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addProductRow}
                className="w-full py-2.5 border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-yellow-500 hover:border-yellow-500/50 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Another Product
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-800 shrink-0 flex gap-3">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (validateStep1()) setStep(2); }}
                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors text-sm flex justify-center items-center gap-2"
              >
                Next: Add Products <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-4 py-2.5 border border-gray-600 rounded-lg text-gray-300 font-medium hover:bg-gray-800 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors text-sm flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Onboarding...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Onboard Vendor
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
