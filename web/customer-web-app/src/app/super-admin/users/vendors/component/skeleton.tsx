import React from "react";

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse`} />
);

export default function VendorManagementPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <SkeletonText width="w-56" height="h-8" />
            <SkeletonText width="w-40" height="h-4" />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <SkeletonBox className="w-full sm:w-32 h-10 rounded-lg" />
            <SkeletonBox className="w-full sm:w-36 h-10 rounded-lg" />
          </div>
        </div>

        {/* Filters Section Skeleton */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Box */}
            <div className="lg:col-span-2">
              <SkeletonBox className="w-full h-10 rounded-lg" />
            </div>

            {/* Filter Dropdowns */}
            {[1, 2, 3].map((i) => (
              <SkeletonBox key={i} className="w-full h-10 rounded-lg" />
            ))}
          </div>

          {/* Clear Filters Button */}
          <div className="mt-3 flex justify-end">
            <SkeletonBox className="w-32 h-9 rounded-lg" />
          </div>
        </div>

        {/* Desktop Table Skeleton */}
        <div className="hidden md:block bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="bg-[#0F172A] border-b border-gray-800 p-4">
            <div className="grid grid-cols-9 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <SkeletonText key={i} width="w-20" height="h-4" />
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-800">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
              <div key={row} className="p-4">
                <div className="grid grid-cols-9 gap-4 items-center">
                  {/* Vendor ID */}
                  <SkeletonText width="w-20" height="h-4" />

                  {/* Name */}
                  <SkeletonText width="w-32" height="h-4" />

                  {/* Email */}
                  <SkeletonText width="w-36" height="h-4" />

                  {/* Category */}
                  <SkeletonText width="w-24" height="h-4" />

                  {/* Status */}
                  <SkeletonBox className="w-20 h-6 rounded" />

                  {/* Verification */}
                  <SkeletonBox className="w-24 h-6 rounded" />

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <SkeletonText width="w-8" height="h-4" />
                    <SkeletonBox className="w-4 h-4 rounded-full" />
                  </div>

                  {/* Total Orders */}
                  <SkeletonText width="w-12" height="h-4" />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <SkeletonBox className="w-8 h-8 rounded-lg" />
                    <SkeletonBox className="w-8 h-8 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="bg-[#0F172A] border-t border-gray-800 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <SkeletonText width="w-40" height="h-4" />
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-24 h-9 rounded" />
                <SkeletonText width="w-20" height="h-4" />
                <SkeletonBox className="w-24 h-9 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="md:hidden space-y-4">
          {[1, 2, 3, 4, 5].map((card) => (
            <div
              key={card}
              className="bg-[#1E293B] border border-gray-800 rounded-lg p-4"
            >
              {/* Header: ID + Status */}
              <div className="flex justify-between items-start mb-4">
                <SkeletonText width="w-24" height="h-5" />
                <SkeletonBox className="w-20 h-6 rounded" />
              </div>

              {/* Vendor Details Grid */}
              <div className="space-y-3 mb-4">
                {/* Name */}
                <div className="space-y-1">
                  <SkeletonText width="w-16" height="h-3" />
                  <SkeletonText width="w-40" height="h-4" />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <SkeletonText width="w-16" height="h-3" />
                  <SkeletonText width="w-48" height="h-4" />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <SkeletonText width="w-20" height="h-3" />
                  <SkeletonText width="w-32" height="h-4" />
                </div>

                {/* Verification & Rating Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                  <div className="space-y-1">
                    <SkeletonText width="w-20" height="h-3" />
                    <SkeletonBox className="w-24 h-6 rounded" />
                  </div>
                  <div className="space-y-1">
                    <SkeletonText width="w-16" height="h-3" />
                    <SkeletonText width="w-12" height="h-4" />
                  </div>
                </div>

                {/* Orders */}
                <div className="space-y-1">
                  <SkeletonText width="w-20" height="h-3" />
                  <SkeletonText width="w-16" height="h-4" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-800">
                <SkeletonBox className="flex-1 h-10 rounded-lg" />
                <SkeletonBox className="flex-1 h-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
