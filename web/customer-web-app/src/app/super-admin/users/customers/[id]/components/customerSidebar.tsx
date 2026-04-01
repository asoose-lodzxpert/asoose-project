import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Edit2,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { CustomerProfile } from "../types";
import { formatDateOnly } from "@/utils/formatDate";

interface CustomerSidebarProps {
  customer: CustomerProfile;
  onUpdate: (data: Partial<CustomerProfile>) => Promise<void>;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  customer,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: customer.name,
    email: customer.email,
    phone: customer.phone || "",
  });

  useEffect(() => {
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
    });
  }, [customer]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update", error);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FIX 1: Robust Date Formatter

  // ✅ FIX 2: Handle Backend Property Mismatch
  // The backend returns 'createdAt', but your interface might expect 'joinedAt'
  const joinDate = customer.joinedAt || (customer as any).createdAt;
  const updateDate = customer.updatedAt;

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
        {/* Edit Toggle Button */}
        <div className="absolute top-4 right-4 z-10">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg disabled:opacity-50"
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

        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full border-4 border-gray-700 bg-gray-800 flex items-center justify-center mb-4 overflow-hidden relative group">
            {customer.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={customer.image}
                alt={customer.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-gray-500">
                {customer.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="w-full mb-1 px-4">
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-[#0F172A] border border-gray-700 text-white text-center font-bold text-lg rounded px-2 py-1 focus:border-yellow-500 focus:outline-none"
                placeholder="Full Name"
              />
            ) : (
              <h2 className="text-xl font-bold text-white">{customer.name}</h2>
            )}
          </div>

          <p className="text-gray-500 text-xs font-mono mt-1 mb-6">
            {customer.id}
          </p>

          <div className="w-full space-y-3 text-left bg-[#0F172A] p-4 rounded-lg border border-gray-800">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="flex-1 bg-transparent border-b border-gray-700 text-white text-sm py-0.5 focus:border-yellow-500 focus:outline-none"
                />
              ) : (
                <span className="truncate">{customer.email}</span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Phone className="w-4 h-4 text-gray-500 shrink-0" />
              {isEditing ? (
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="flex-1 bg-transparent border-b border-gray-700 text-white text-sm py-0.5 focus:border-yellow-500 focus:outline-none"
                  placeholder="Phone Number"
                />
              ) : (
                <span>{customer.phone || "No phone provided"}</span>
              )}
            </div>

            {/* ✅ FIX 3: Use the resolved Date Variables */}
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Joined {formatDateOnly(joinDate)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Updated {formatDateOnly(updateDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Addresses Section */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Saved Addresses
        </h3>
        <div className="space-y-3">
          {customer.addresses && customer.addresses.length > 0 ? (
            customer.addresses.map((addr, i) => (
              <div
                key={i}
                className="flex gap-3 items-start p-3 bg-[#0F172A] rounded-lg border border-gray-800"
              >
                <div
                  className={`mt-1 w-2 h-2 rounded-full ${addr.isDefault ? "bg-yellow-500" : "bg-gray-600"}`}
                />
                <div>
                  <p className="text-xs font-bold text-gray-300 uppercase mb-0.5">
                    {addr.label}
                  </p>
                  <p className="text-sm text-gray-400 leading-tight">
                    {addr.city ? `${addr.street}, ${addr.city}` : addr.street}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              No addresses saved
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
