"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  Calendar,
  Star,
  ShieldCheck,
  Ban,
  CheckCircle,
  Edit2,
  Save,
  X,
  Loader2,
  Wallet,
} from "lucide-react";
import Swal from "sweetalert2";
import { AppAlert } from "../../../customers/[id]/alerts";
import { getSession } from "next-auth/react"; // ✅ Import NextAuth
import { Currency } from "@/app/main/components/Currency";

interface RiderSidebarProps {
  rider: any;
  onToggleStatus: () => void;
  onUpdate: (data: any) => Promise<void>;
  basePath?: string; // 'riders' | 'drivers' — defaults to 'riders'
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export const RiderSidebar: React.FC<RiderSidebarProps> = ({
  rider,
  onToggleStatus,
  onUpdate,
  basePath = "riders",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State for Profile Editing
  const [formData, setFormData] = useState({
    name: rider.name,
    email: rider.email,
    phone: rider.phone || "",
  });

  // Sync state when prop updates
  useEffect(() => {
    setFormData({
      name: rider.name,
      email: rider.email,
      phone: rider.phone || "",
    });
  }, [rider]);

  // --- Handlers ---

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await onUpdate(formData); // Parent handles the API call & Auth for this one
      setIsEditing(false);
    } catch (e) {
      console.error("Update failed", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageWallet = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Adjust Wallet Balance",
      html: `
        <div class="flex gap-4 mb-6 justify-center">
          <label class="flex items-center gap-2 cursor-pointer bg-gray-800 px-3 py-2 rounded border border-gray-700">
            <input type="radio" name="w_type" value="CREDIT" checked class="accent-green-500 w-4 h-4"> 
            <span class="text-green-500 font-bold text-sm">Credit (+)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer bg-gray-800 px-3 py-2 rounded border border-gray-700">
            <input type="radio" name="w_type" value="DEBIT" class="accent-red-500 w-4 h-4"> 
            <span class="text-red-500 font-bold text-sm">Debit (-)</span>
          </label>
        </div>
        <div class="space-y-3">
          <input id="w_amount" type="number" placeholder="Amount (₦)" class="w-full p-2 bg-[#0F172A] text-white border border-gray-600 rounded focus:ring-1 focus:ring-yellow-500 outline-none" min="1">
          <textarea id="w_reason" placeholder="Reason for adjustment..." class="w-full p-2 bg-[#0F172A] text-white border border-gray-600 rounded focus:ring-1 focus:ring-yellow-500 outline-none" rows="3"></textarea>
        </div>
      `,
      background: "#1E293B",
      color: "#fff",
      showCancelButton: true,
      confirmButtonText: "Process Adjustment",
      confirmButtonColor: "#eab308",
      cancelButtonColor: "#64748B",
      preConfirm: () => {
        const type = (
          document.querySelector(
            'input[name="w_type"]:checked',
          ) as HTMLInputElement
        ).value;
        const amount = (document.getElementById("w_amount") as HTMLInputElement)
          .value;
        const reason = (document.getElementById("w_reason") as HTMLInputElement)
          .value;

        if (!amount || !reason) {
          Swal.showValidationMessage("Please enter amount and reason");
          return false;
        }
        return { type, amount: Number(amount), reason };
      },
    });

    if (formValues) {
      try {
        // ✅ 1. Get Session via NextAuth
        const session = await getSession();
        const token = (session as any)?.accessToken;

        // ✅ 2. Send Request with Headers
        const res = await fetch(
          `${API_URL}/super-admin/${basePath}/${rider.id}/wallet`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token || ""}`, // ✅ Added Token
            },
            body: JSON.stringify(formValues),
          },
        );

        if (!res.ok) throw new Error("Transaction failed");

        AppAlert.success("Wallet Updated Successfully");
        // Reload page to reflect new balance
        window.location.reload();
      } catch (error) {
        AppAlert.error("Error", "Failed to adjust wallet");
      }
    }
  };

  const formatDate = (date: string) =>
    date
      ? new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";

  const isSuspended = rider.status === "SUSPENDED";

  return (
    <div className="space-y-6">
      {/* 1. Profile Card */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
        {/* Edit Toggle Buttons */}
        <div className="absolute top-4 left-4 z-10">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-all"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="p-2 text-red-400 bg-gray-800/80 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="p-2 text-green-400 bg-gray-800/80 hover:bg-green-500/10 rounded-lg transition-all"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Verification Badge */}
        {rider.verification === "VERIFIED" && (
          <div
            className="absolute top-4 right-4 text-blue-400"
            title="Verified Rider"
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
        )}

        <div className="flex flex-col items-center text-center mt-6">
          {/* Profile Image */}
          <div className="w-24 h-24 rounded-full border-4 border-gray-700 bg-gray-800 flex items-center justify-center mb-4 overflow-hidden relative shadow-lg">
            {rider.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rider.image}
                alt={rider.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-gray-500">
                {rider.name?.charAt(0)}
              </span>
            )}
          </div>

          {/* Name Input */}
          <div className="w-full px-2 mb-1">
            {isEditing ? (
              <input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-[#0F172A] border border-gray-600 text-white text-center font-bold text-lg rounded px-2 py-1 w-full focus:border-yellow-500 focus:outline-none"
                placeholder="Full Name"
              />
            ) : (
              <h2 className="text-xl font-bold text-white">{rider.name}</h2>
            )}
          </div>

          <p className="text-gray-500 text-xs font-mono mt-1 mb-4 bg-gray-800/50 px-2 py-0.5 rounded">
            {rider.id}
          </p>

          {/* Rating Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0F172A] rounded-full border border-gray-800 mb-6">
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            <span className="text-white text-xs font-bold">
              {rider.rating || 0}
            </span>
            <span className="text-gray-500 text-[10px]">
              ({rider.totalRides || 0} rides)
            </span>
          </div>

          {/* Contact Details */}
          <div className="w-full space-y-3 text-left bg-[#0F172A] p-4 rounded-lg border border-gray-800">
            {/* Email */}
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              {isEditing ? (
                <input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="bg-transparent border-b border-gray-600 text-white w-full focus:border-yellow-500 focus:outline-none py-0.5"
                  placeholder="Email Address"
                />
              ) : (
                <span className="truncate">{rider.email}</span>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Phone className="w-4 h-4 text-gray-500 shrink-0" />
              {isEditing ? (
                <input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="bg-transparent border-b border-gray-600 text-white w-full focus:border-yellow-500 focus:outline-none py-0.5"
                  placeholder="Phone Number"
                />
              ) : (
                <span>{rider.phone || "N/A"}</span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <span>
                Joined {formatDate(rider.joinedAt || rider.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Wallet Card */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
            Wallet Balance
          </h3>
          <button
            onClick={handleManageWallet}
            className="text-xs font-bold text-yellow-500 hover:text-white flex items-center gap-1 transition-colors bg-yellow-500/10 hover:bg-yellow-500 px-2 py-1 rounded"
          >
            <Wallet className="w-3 h-3" /> Manage
          </button>
        </div>
        <p
          className={`text-3xl font-black ${rider.walletBalance < 0 ? "text-red-500" : "text-green-500"}`}
        >
          <Currency amount={rider.walletBalance} />
        </p>
      </div>

      {/* 3. Action Buttons */}
      <button
        onClick={onToggleStatus}
        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-lg ${
          isSuspended
            ? "bg-green-600 text-white hover:bg-green-500 hover:shadow-green-500/20"
            : "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
        }`}
      >
        {isSuspended ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Ban className="w-4 h-4" />
        )}
        {isSuspended ? "Reactivate Account" : "Suspend Account"}
      </button>
    </div>
  );
};
