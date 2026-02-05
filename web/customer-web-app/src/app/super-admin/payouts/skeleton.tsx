import React from "react";

export default function PayoutsSkeleton() {
  return (
    <div className="p-6 bg-[#0F172A] min-h-screen text-white">
      {/* Header Skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-gray-800 rounded animate-pulse" />
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
      </div>

      <div className="grid gap-4">
        {/* Render 5 skeleton items */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-[#1E293B] p-5 rounded-xl border border-gray-800 flex justify-between items-center"
          >
            {/* Left Side: Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {/* Badge */}
                <div className="w-12 h-5 bg-gray-700/50 rounded animate-pulse" />
                {/* Name */}
                <div className="w-32 h-5 bg-gray-700/50 rounded animate-pulse" />
              </div>
              {/* Amount */}
              <div className="w-40 h-8 bg-gray-700 rounded animate-pulse" />
            </div>

            {/* Right Side: Buttons */}
            <div className="flex gap-2">
              {/* Reject Button Skeleton */}
              <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse" />
              {/* Approve Button Skeleton */}
              <div className="w-28 h-10 bg-gray-800 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
