import React from "react";
import {
  MapPin,
  Star,
  Mail,
  Phone,
  Store,
  Calendar,
  Clock,
  Tag,
} from "lucide-react";
import { LocationInput } from "@/components/shared/LocationInput";
import { formatDateOnly } from "@/utils/formatDate";

interface BusinessInfoCardProps {
  vendor: any;
  formData: any;
  isEditing: boolean;
  storeTypes: string[];
  cities: any[];
  onFormChange: (data: any) => void;
  addressCoords: { lat: number; lng: number } | null;
  onAddressChange: (text: string, coords: { lat: number; lng: number } | null) => void;
}

const BusinessInfoCard = ({
  vendor,
  formData,
  isEditing,
  storeTypes,
  cities,
  onFormChange,
  addressCoords,
  onAddressChange,
}: BusinessInfoCardProps) => {

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-6 relative overflow-hidden h-fit">
      <div className="flex flex-col items-center text-center">
        {/* Profile Image Section */}
        <div className="w-24 h-24 rounded-full border-4 border-gray-700 bg-gray-800 flex items-center justify-center mb-4 overflow-hidden relative">
          <img
            src={vendor.image || "https://via.placeholder.com/150"}
            alt={vendor.name}
            className="w-full h-full object-cover"
          />
          {vendor.status === "ACTIVE" && (
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-green-500 rounded-full border border-[#1E293B]">
              <div className="w-full h-full bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
          )}
        </div>

        {/* Store Name */}
        <div className="w-full mb-1">
          {isEditing ? (
            <input
              type="text"
              value={formData.storeName || ""}
              onChange={(e) =>
                onFormChange({ ...formData, storeName: e.target.value })
              }
              className="bg-transparent border-b border-gray-700 text-white text-center text-xl font-bold w-full focus:border-yellow-500 focus:outline-none pb-1 placeholder-gray-600"
              placeholder="Store Name"
            />
          ) : (
            <h2 className="text-xl font-bold text-white">{vendor.name}</h2>
          )}
        </div>

        {/* ID */}
        <p className="text-gray-500 text-xs font-mono mb-2">{vendor.id}</p>

        {/* Rating Badge (Integrated subtly) */}
        <div className="flex items-center gap-1.5 mb-6 px-3 py-1 bg-[#0F172A] rounded-full border border-gray-800">
          <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
          <span className="text-white text-xs font-bold">
            {vendor.rating || 0}
          </span>
          <span className="text-gray-500 text-[10px]">
            ({vendor.reviewsCount || 0} reviews)
          </span>
        </div>

        {/* Info List Container */}
        <div className="w-full space-y-3 text-left bg-[#0F172A] p-4 rounded-lg border border-gray-800">
          {/* Email (Read Only) */}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Mail className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="truncate">{vendor.email}</span>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Phone className="w-4 h-4 text-gray-500 shrink-0" />
            {isEditing ? (
              <input
                value={formData.phone || ""}
                onChange={(e) =>
                  onFormChange({ ...formData, phone: e.target.value })
                }
                className="bg-[#1E293B] border border-gray-700 text-white text-xs rounded px-2 py-1 w-full focus:border-yellow-500 focus:outline-none"
                placeholder="Phone Number"
              />
            ) : (
              <span>{vendor.phone || "No phone provided"}</span>
            )}
          </div>

          {/* Store Category */}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Tag className="w-4 h-4 text-gray-500 shrink-0" />
            {isEditing ? (
              <select
                value={formData.storeType || ""}
                onChange={(e) =>
                  onFormChange({ ...formData, storeType: e.target.value })
                }
                className="bg-[#1E293B] border border-gray-700 text-white text-xs rounded px-2 py-1.5 w-full focus:border-yellow-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  Select category…
                </option>
                {storeTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            ) : (
              <span>
                {vendor.storeType
                  ? vendor.storeType.charAt(0) + vendor.storeType.slice(1).toLowerCase()
                  : "No category set"}
              </span>
            )}
          </div>

          {/* Address */}
          <div className="flex items-start gap-3 text-sm text-gray-300">
            <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            {isEditing ? (
              <div className="flex-1">
                <LocationInput
                  value={formData.address || ""}
                  onValueChange={(text) => onAddressChange(text, null)}
                  onLocationSelect={(loc, address) =>
                    onAddressChange(address, { lat: loc.lat, lng: loc.lng })
                  }
                  placeholder="Search vendor address…"
                  showGeolocation
                  className="[&_input]:bg-slate-800/50 [&_input]:border-gray-700 [&_input]:text-white [&_input]:text-xs [&_input]:py-1"
                />
                {addressCoords && (
                  <div className="mt-1 flex items-center gap-1 text-emerald-400 text-[10px] font-medium">
                    <MapPin className="w-3 h-3" /> Location pinned
                  </div>
                )}
                {!addressCoords && formData.address && (
                  <p className="mt-1 text-[10px] text-yellow-500">
                    Select a suggestion to pin coordinates.
                  </p>
                )}
              </div>
            ) : (
              <span className="leading-tight">
                {vendor.address || "No address set"}
              </span>
            )}
          </div>

          {/* City */}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Store className="w-4 h-4 text-gray-500 shrink-0" />
            {isEditing ? (
              <select
                value={formData.cityId || ""}
                onChange={(e) =>
                  onFormChange({ ...formData, cityId: e.target.value })
                }
                className="bg-[#1E293B] border border-gray-700 text-white text-xs rounded px-2 py-1.5 w-full focus:border-yellow-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  Select city…
                </option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            ) : (
              <span>{vendor.city?.name || "No city set"}</span>
            )}
          </div>

          {/* Joined Date */}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
            <span>Joined {formatDateOnly(vendor.createdAt)}</span>
          </div>

          {/* Updated Date */}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Clock className="w-4 h-4 text-gray-500 shrink-0" />
            <span>Updated {formatDateOnly(vendor.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessInfoCard;
