"use client";

import React from "react";
import {
  ArrowLeft,
  MapPin,
  Clock,
  FileText,
  User,
  CreditCard,
} from "lucide-react";

export default function RideDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto">
          <div className="flex items-center gap-1 mb-1">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
            <div className="h-4 w-24 bg-gray-700 rounded"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-40 bg-gray-700 rounded"></div>
            <div className="h-6 w-24 bg-gray-700 rounded-full"></div>
          </div>
          <div className="h-4 w-64 bg-gray-700 rounded mt-2"></div>
        </div>

        <div className="h-10 w-32 bg-gray-700 rounded-lg"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* Addresses Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <div className="space-y-8">
              {/* Pickup */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-3 h-3 rounded-full bg-gray-700 ring-4 ring-gray-700/20"></div>
                  <div className="w-0.5 h-12 bg-gray-700"></div>
                </div>
                <div className="flex-1">
                  <div className="h-3 w-32 bg-gray-700 rounded mb-2"></div>
                  <div className="h-5 w-full bg-gray-700 rounded"></div>
                </div>
              </div>

              {/* Dropoff */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-3 h-3 rounded-full bg-gray-700 ring-4 ring-gray-700/20"></div>
                </div>
                <div className="flex-1">
                  <div className="h-3 w-32 bg-gray-700 rounded mb-2"></div>
                  <div className="h-5 w-full bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-gray-700" />
              <div className="h-5 w-32 bg-gray-700 rounded"></div>
            </div>
            <div className="space-y-6 relative border-l-2 border-gray-700 ml-3 pl-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full border-2 border-gray-600 bg-[#1E293B]"></div>
                  <div className="flex justify-between items-start">
                    <div className="h-4 w-32 bg-gray-700 rounded"></div>
                    <div className="h-3 w-16 bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gray-700" />
              <div className="h-5 w-32 bg-gray-700 rounded"></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <div className="h-3 w-16 bg-gray-700 rounded"></div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="h-3 w-24 bg-gray-700 rounded"></div>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <div className="h-3 w-20 bg-gray-700 rounded"></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {[1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="h-4 w-32 bg-gray-700 rounded"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-gray-700 rounded"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-28 bg-gray-700 rounded"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN Skeleton */}
        <div className="lg:col-span-1 space-y-6">
          {/* Driver Card Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 w-16 bg-gray-700 rounded"></div>
              <div className="h-5 w-20 bg-gray-700 rounded-full"></div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-16 bg-gray-700 rounded"></div>
              </div>
            </div>
            <div className="space-y-2 bg-[#0F172A] p-3 rounded-xl">
              <div className="flex justify-between">
                <div className="h-4 w-16 bg-gray-700 rounded"></div>
                <div className="h-4 w-24 bg-gray-700 rounded"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-12 bg-gray-700 rounded"></div>
                <div className="h-4 w-20 bg-gray-700 rounded"></div>
              </div>
              <div className="flex justify-between pt-2 mt-2 border-t border-gray-700">
                <div className="h-4 w-14 bg-gray-700 rounded"></div>
                <div className="h-4 w-28 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>

          {/* Passenger Card Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="h-4 w-20 bg-gray-700 rounded"></div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-700"></div>
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-16 bg-gray-700 rounded"></div>
              </div>
            </div>
            <div className="flex justify-between bg-[#0F172A] p-3 rounded-xl">
              <div className="h-4 w-16 bg-gray-700 rounded"></div>
              <div className="h-4 w-28 bg-gray-700 rounded"></div>
            </div>
          </div>

          {/* Payment Breakdown Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <div className="h-4 w-32 bg-gray-700 rounded mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-20 bg-gray-700 rounded"></div>
                  <div className="h-4 w-16 bg-gray-700 rounded"></div>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-3 mt-2 flex justify-between items-center">
                <div className="h-6 w-16 bg-gray-700 rounded"></div>
                <div className="h-7 w-24 bg-gray-700 rounded"></div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-700 flex items-center gap-2">
              <CreditCard className="w-3 h-3 text-gray-700" />
              <div className="h-3 w-32 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
