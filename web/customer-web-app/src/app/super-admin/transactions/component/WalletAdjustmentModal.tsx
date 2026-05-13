"use client";

"use client";

import React, { useState } from "react";
import { X, Search, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { getSession } from "next-auth/react";
import Swal from "sweetalert2";
import { validateWalletAdjustment, formatValidationErrors } from "@/utils/wallet-validation";

interface WalletAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TargetType = "VENDOR" | "RIDER";
type AdjustmentType = "CREDIT" | "DEBIT";

export default function WalletAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
}: WalletAdjustmentModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [targetType, setTargetType] = useState<TargetType>("VENDOR");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<AdjustmentType>("CREDIT");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search Logic
  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);

    try {
      // ✅ Get Session from NextAuth
      const session = await getSession();
      const token = (session as any)?.accessToken;
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const endpoint =
        targetType === "VENDOR"
          ? `/super-admin/vendors?search=${searchQuery}`
          : `/super-admin/riders?search=${searchQuery}`;

      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }, // ✅ Use NextAuth Token
      });
      const data = await res.json();
      setSearchResults(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntity || !amount || !description) return;

    // ✅ FIXED: Add validation for amount and description
    const validation = validateWalletAdjustment(parseFloat(amount), description);
    if (!validation.valid) {
      const errors = formatValidationErrors(validation.errors);
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: errors,
        background: "#1E293B",
        color: "#fff",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      if (!token) {
        throw new Error("Authentication required");
      }

      const res = await fetch(
        `${API_URL}/super-admin/transactions/adjust-wallet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // ✅ Use NextAuth Token
          },
          body: JSON.stringify({
            targetId: selectedEntity.id,
            targetType,
            type,
            amount: parseFloat(amount),
            description,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to adjust wallet");
      }

      const amountNum = parseFloat(amount);
      const formattedAmount = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amountNum);

      Swal.fire({
        icon: "success",
        title: "Wallet Adjusted",
        text: `Successfully ${type === "CREDIT" ? "credited" : "debited"} ${formattedAmount}`,
        background: "#1E293B",
        color: "#fff",
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message,
        background: "#1E293B",
        color: "#fff",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedEntity(null);
    setAmount("");
    setDescription("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1E293B] border border-gray-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="bg-yellow-500/10 p-1.5 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            </div>
            Manual Wallet Adjustment
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 ? (
            /* STEP 1: SELECT ENTITY */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-gray-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setTargetType("VENDOR")}
                  className={`py-2 text-sm font-bold rounded-md transition-all ${targetType === "VENDOR" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
                >
                  Vendor (Store)
                </button>
                <button
                  onClick={() => setTargetType("RIDER")}
                  className={`py-2 text-sm font-bold rounded-md transition-all ${targetType === "RIDER" ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
                >
                  Rider
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${targetType.toLowerCase()} by name...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs font-bold"
                >
                  Search
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {isSearching ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedEntity(item);
                        setStep(2);
                      }}
                      className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-blue-500 cursor-pointer transition-colors flex justify-between items-center group"
                    >
                      <div>
                        <p className="font-bold text-white">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.email}</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-gray-600 group-hover:text-blue-500" />
                    </div>
                  ))
                ) : (
                  searchQuery &&
                  !isSearching && (
                    <p className="text-center text-gray-500 text-sm py-2">
                      No results found
                    </p>
                  )
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: ENTER DETAILS */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">
                    Selected Entity
                  </p>
                  <p className="font-bold text-white text-lg">
                    {selectedEntity?.name}
                  </p>
                  <p className="text-xs text-gray-400">{selectedEntity?.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AdjustmentType)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CREDIT">Credit (Add Money)</option>
                    <option value="DEBIT">Debit (Remove Money)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max="100000000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: ₦100,000,000 | 2 decimal places</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Compensation for order #1234..."
                  minLength={5}
                  maxLength={200}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{description.length}/200 characters</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                    type === "CREDIT"
                      ? "bg-green-600 hover:bg-green-500 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirm Adjustment"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
