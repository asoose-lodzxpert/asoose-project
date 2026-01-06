import React from 'react';

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse`} />
);

export default function OrdersPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <SkeletonText width="w-48" height="h-8" />
            <SkeletonText width="w-64" height="h-4" />
          </div>
          
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <SkeletonBox className="flex-1 sm:flex-none w-32 h-10 rounded-lg" />
            <SkeletonBox className="flex-1 sm:flex-none w-32 h-10 rounded-lg" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <SkeletonText width="w-32" height="h-3" />
                <SkeletonBox className="w-10 h-10 rounded-lg" />
              </div>
              <SkeletonText width="w-24" height="h-8" />
              <SkeletonText width="w-40" height="h-3" />
            </div>
          ))}
        </div>

        {/* Filters Section Skeleton */}
        <div className="bg-[#1E293B] p-3 md:p-4 rounded-xl border border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <SkeletonText width="w-32" height="h-6" />
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <SkeletonBox className="flex-1 md:w-64 h-10 rounded-lg" />
              <SkeletonBox className="w-24 h-10 rounded-lg" />
            </div>
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
                  {/* Order ID */}
                  <SkeletonText width="w-20" height="h-4" />
                  
                  {/* Status */}
                  <SkeletonBox className="w-24 h-6 rounded" />
                  
                  {/* Customer */}
                  <SkeletonText width="w-28" height="h-4" />
                  
                  {/* Vendor */}
                  <SkeletonText width="w-32" height="h-4" />
                  
                  {/* Rider */}
                  <SkeletonText width="w-24" height="h-4" />
                  
                  {/* Amount */}
                  <SkeletonText width="w-20" height="h-4" />
                  
                  {/* Type */}
                  <SkeletonText width="w-24" height="h-4" />
                  
                  {/* Placed At */}
                  <SkeletonText width="w-32" height="h-4" />
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <SkeletonBox className="w-8 h-8 rounded-lg" />
                    <SkeletonBox className="w-8 h-8 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="border-t border-gray-800 px-4 py-3">
            <div className="flex justify-between items-center">
              <SkeletonText width="w-32" height="h-4" />
              <div className="flex gap-2">
                <SkeletonBox className="w-20 h-8 rounded" />
                <SkeletonBox className="w-20 h-8 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3, 4, 5].map((card) => (
            <div key={card} className="bg-[#1E293B] border border-gray-800 rounded-lg p-4">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <SkeletonText width="w-24" height="h-5" />
                <SkeletonBox className="w-24 h-6 rounded" />
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <SkeletonText width="w-20" height="h-4" />
                  <SkeletonText width="w-28" height="h-4" />
                </div>
                <div className="flex justify-between">
                  <SkeletonText width="w-20" height="h-4" />
                  <SkeletonText width="w-32" height="h-4" />
                </div>
                <div className="flex justify-between">
                  <SkeletonText width="w-20" height="h-4" />
                  <SkeletonText width="w-24" height="h-4" />
                </div>
                <div className="flex justify-between">
                  <SkeletonText width="w-20" height="h-4" />
                  <SkeletonText width="w-20" height="h-4" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-800">
                <SkeletonBox className="flex-1 h-10 rounded-lg" />
                <SkeletonBox className="w-10 h-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}