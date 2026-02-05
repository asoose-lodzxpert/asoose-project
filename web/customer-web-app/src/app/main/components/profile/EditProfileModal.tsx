"use client";
import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  initialData: { name: string; phone: string };
  onClose: () => void;
  onSave: (data: { name: string; phone: string }) => Promise<void>;
}

export const EditProfileModal = ({
  isOpen,
  initialData,
  onClose,
  onSave,
}: EditProfileModalProps) => {
  const [loading, setLoading] = useState(false);
  // Ensure fields are empty strings, not null/undefined
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    phone: initialData.phone || "",
  });
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">Edit Profile</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full mt-1 p-3 bg-gray-50 dark:bg-white/5 rounded-xl outline-none focus:ring-2 ring-yellow-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone || ""} // <--- Add "|| ''"
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full mt-1 p-3 bg-gray-50 dark:bg-white/5 rounded-xl outline-none focus:ring-2 ring-yellow-500"
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-bold mt-2"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5 mx-auto" />
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
