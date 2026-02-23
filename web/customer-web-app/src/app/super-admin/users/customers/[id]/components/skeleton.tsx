import React from 'react';

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse`} />
);

const SkeletonCircle = ({ size = "w-12 h-12" }) => (
  <div className={`${size} bg-gray-700/30 rounded-full animate-pulse`} />
);

export function CustomerDetailPageSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <SkeletonText width="w-32" height="h-4" />
          <SkeletonText width="w-48" height="h-8" />
        </div>

        <div className="flex gap-3">
          <SkeletonBox className="w-36 h-10 rounded-lg" />
          <SkeletonBox className="w-40 h-10 rounded-lg" />
          <SkeletonBox className="w-10 h-10 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: User Info Skeleton */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Profile Card Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <SkeletonCircle size="w-24 h-24" />
            </div>
            
            {/* Name & ID */}
            <div className="text-center space-y-2 mb-4">
              <SkeletonText width="w-40 mx-auto" height="h-6" />
              <SkeletonText width="w-24 mx-auto" height="h-4" />
            </div>

            {/* Status Badge */}
            <div className="flex justify-center mb-8">
              <SkeletonBox className="w-20 h-6 rounded-full" />
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBox className="w-8 h-8 rounded" />
                  <SkeletonText width="w-full" height="h-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Saved Addresses Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <SkeletonText width="w-36" height="h-5" />
            
            <div className="space-y-4 mt-4">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 bg-[#0F172A] rounded-xl border border-gray-800">
                  <div className="flex gap-3">
                    <SkeletonBox className="w-8 h-8 rounded shrink-0" />
                    <div className="flex-1 space-y-2">
                      <SkeletonText width="w-16" height="h-3" />
                      <SkeletonText width="w-full" height="h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Stats & History Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1E293B] p-5 rounded-xl border border-gray-800">
                <SkeletonText width="w-24" height="h-3" />
                <div className="flex items-center gap-2 mt-2">
                  <SkeletonBox className="w-10 h-10 rounded-lg" />
                  <SkeletonText width="w-20" height="h-8" />
                </div>
              </div>
            ))}
          </div>

          {/* Tabs & Content Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl overflow-hidden">
            
            {/* Tabs Header Skeleton */}
            <div className="flex border-b border-gray-800">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 p-4 border-r border-gray-800 last:border-r-0">
                  <SkeletonText width="w-20" height="h-5" />
                </div>
              ))}
            </div>

            {/* Tab Content Skeleton */}
            <div className="p-6">
              
              {/* Desktop Table View */}
              <div className="hidden md:block">
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-4 p-3 bg-[#0F172A] rounded-t-lg border-b border-gray-800">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonText key={i} width="w-20" height="h-4" />
                  ))}
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-gray-800">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="grid grid-cols-5 gap-4 p-3 items-center">
                      <SkeletonText width="w-24" height="h-4" />
                      <SkeletonText width="w-28" height="h-4" />
                      <SkeletonText width="w-32" height="h-4" />
                      <SkeletonText width="w-20" height="h-4" />
                      <SkeletonBox className="w-24 h-6 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {[1, 2, 3].map((card) => (
                  <div key={card} className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <SkeletonText width="w-24" height="h-5" />
                      <SkeletonBox className="w-20 h-6 rounded" />
                    </div>
                    <div className="space-y-2 mb-3">
                      <SkeletonText width="w-32" height="h-4" />
                      <SkeletonText width="w-full" height="h-4" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <SkeletonText width="w-20" height="h-4" />
                      <SkeletonText width="w-24" height="h-4" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
                <SkeletonText width="w-32" height="h-4" />
                <div className="flex gap-2">
                  <SkeletonBox className="w-20 h-8 rounded" />
                  <SkeletonBox className="w-20 h-8 rounded" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}