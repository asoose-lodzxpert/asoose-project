import React from "react";
import {
  Mail,
  Phone,
  MapPin,
  Star,
  Car,
  Bike,
  FileText,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Rider } from "./types";
export default function RiderProfile({ rider }: { rider: Rider }) {
  return (
    <div className="space-y-6">
      {/* Rider Info Card */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-4 mb-4 md:mb-6">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-gray-700">
            <img
              src={rider.image}
              alt={rider.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{rider.name}</h2>
            <p className="text-gray-400 text-sm font-mono">{rider.id}</p>
            <div className="flex items-center gap-1 text-yellow-500 text-sm font-bold mt-1">
              {rider.rating} <Star className="w-3 h-3 fill-yellow-500" />
              <span className="text-gray-500 font-normal ml-1">
                ({rider.totalRides} rides)
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Mail className="w-4 h-4 text-gray-500" />{" "}
            <span className="truncate">{rider.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <Phone className="w-4 h-4 text-gray-500" /> {rider.phone}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <MapPin className="w-4 h-4 text-gray-500" /> Current:{" "}
            {rider.location}
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-4 md:p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          {rider.vehicle.type === "Car" ? (
            <Car className="w-5 h-5 text-blue-500" />
          ) : (
            <Bike className="w-5 h-5 text-orange-500" />
          )}
          Vehicle Details
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Model</span>
            <span className="text-white font-medium">
              {rider.vehicle.model}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">License Plate</span>
            <span className="text-white font-mono bg-gray-800 px-2 py-0.5 rounded text-xs">
              {rider.vehicle.plate}
            </span>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-4 md:p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" /> Documents
        </h3>
        <div className="space-y-4">
          {rider.documents.map((doc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-[#0F172A] rounded-xl border border-gray-800"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">{doc.name}</span>
                <span className="text-xs text-gray-500">Exp: {doc.expiry}</span>
              </div>
              <div className="text-right">
                {doc.status === "Verified" ? (
                  <span className="text-green-500 text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="text-yellow-500 text-xs font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
