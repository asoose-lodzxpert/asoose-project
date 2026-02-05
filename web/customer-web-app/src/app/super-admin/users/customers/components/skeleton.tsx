import React from "react";

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse`} />
);

export function CustomersPageSkeleton() {
  return (
    <div className="mins-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <SkeletonText width="w-48" height="h-8" />
            <SkeletonText width="w-40" height="h-4" />
          </div>

          {/* Summary Stats Skeleton */}
          <div className="grid grid-cols-1 w-full gap-3 sm:grid-cols-3 md:flex md:gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#1E293B] border border-gray-800 rounded-lg p-3 w-full"
              >
                <SkeletonText width="w-12" height="h-3" />
                <SkeletonText width="w-8" height="h-6" />
              </div>
            ))}
          </div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="bg-[#1E293B] p-3 md:p-4 rounded-xl border border-gray-800">
          <SkeletonBox className="w-full h-10 rounded-lg" />
        </div>

        {/* Desktop Table Skeleton */}
        <div className="hidden md:block bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="bg-[#0F172A] border-b border-gray-800 p-4">
            <div className="grid grid-cols-7 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <SkeletonText key={i} width="w-24" height="h-4" />
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-800">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
              <div key={row} className="p-4">
                <div className="grid grid-cols-7 gap-4 items-center">
                  {/* Customer ID */}
                  <SkeletonText width="w-20" height="h-4" />

                  {/* Customer Name/Email */}
                  <div className="space-y-2">
                    <SkeletonText width="w-32" height="h-4" />
                    <SkeletonText width="w-40" height="h-3" />
                  </div>

                  {/* Joined Date */}
                  <SkeletonText width="w-24" height="h-4" />

                  {/* Orders */}
                  <SkeletonText width="w-12" height="h-4" />

                  {/* Total Spent */}
                  <SkeletonText width="w-20" height="h-4" />

                  {/* Status */}
                  <SkeletonBox className="w-20 h-6 rounded" />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <SkeletonBox className="w-8 h-8 rounded-lg" />
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
        <div className="md:hidden space-y-3">
          {[1, 2, 3, 4, 5].map((card) => (
            <div
              key={card}
              className="bg-[#1E293B] border border-gray-800 rounded-lg p-4"
            >
              {/* Header: ID + Status */}
              <div className="flex justify-between items-start mb-3">
                <SkeletonText width="w-24" height="h-5" />
                <SkeletonBox className="w-20 h-6 rounded" />
              </div>

              {/* Customer Info */}
              <div className="mb-4 space-y-2">
                <SkeletonText width="w-40" height="h-6" />
                <SkeletonText width="w-48" height="h-4" />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[1, 2].map((stat) => (
                  <div key={stat} className="flex items-center gap-2">
                    <SkeletonBox className="w-8 h-8 rounded" />
                    <div className="space-y-1 flex-1">
                      <SkeletonText width="w-16" height="h-3" />
                      <SkeletonText width="w-20" height="h-4" />
                    </div>
                  </div>
                ))}

                <div className="col-span-2 flex items-center gap-2">
                  <SkeletonBox className="w-8 h-8 rounded" />
                  <div className="space-y-1 flex-1">
                    <SkeletonText width="w-24" height="h-3" />
                    <SkeletonText width="w-20" height="h-4" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-800">
                <SkeletonBox className="flex-1 h-10 rounded-lg" />
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
