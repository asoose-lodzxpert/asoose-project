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

export default function RiderDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section Skeleton */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Left: Back Button + Title */}
            <div className="flex items-center gap-4">
              <SkeletonBox className="w-10 h-10 rounded-lg" />
              <div className="space-y-2">
                <SkeletonText width="w-48" height="h-8" />
                <SkeletonText width="w-32" height="h-4" />
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <SkeletonBox className="flex-1 md:flex-none w-32 h-10 rounded-lg" />
              <SkeletonBox className="flex-1 md:flex-none w-32 h-10 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Profile Card */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-6">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center text-center mb-6">
                <SkeletonCircle size="w-24 h-24" />
                <SkeletonText width="w-40" height="h-6" />
                <SkeletonText width="w-32" height="h-4" />
                <SkeletonBox className="w-24 h-6 rounded mt-2" />
              </div>

              {/* Contact Info */}
              <div className="space-y-4 border-t border-gray-800 pt-4">
                <div className="flex items-center gap-3">
                  <SkeletonBox className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <SkeletonText width="w-20" height="h-3" />
                    <SkeletonText width="w-36" height="h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonBox className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <SkeletonText width="w-20" height="h-3" />
                    <SkeletonText width="w-40" height="h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonBox className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <SkeletonText width="w-20" height="h-3" />
                    <SkeletonText width="w-32" height="h-4" />
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="border-t border-gray-800 pt-4 mt-4">
                <SkeletonText width="w-32" height="h-5" />
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <SkeletonBox className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <SkeletonText width="w-24" height="h-3" />
                      <SkeletonText width="w-36" height="h-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <SkeletonBox className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <SkeletonText width="w-24" height="h-3" />
                      <SkeletonText width="w-28" height="h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="border-t border-gray-800 pt-4 mt-4">
                <SkeletonText width="w-28" height="h-5" />
                <div className="mt-3 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-gray-800">
                      <div className="flex items-center gap-2">
                        <SkeletonBox className="w-8 h-8 rounded" />
                        <SkeletonText width="w-32" height="h-4" />
                      </div>
                      <SkeletonBox className="w-20 h-6 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Stats & Tabs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[#1E293B] p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <SkeletonText width="w-20" height="h-3" />
                    <SkeletonBox className="w-8 h-8 rounded-lg" />
                  </div>
                  <SkeletonText width="w-16" height="h-8" />
                  <SkeletonText width="w-24" height="h-3" />
                </div>
              ))}
            </div>

            {/* Tabs Section */}
            <div className="bg-[#1E293B] border border-gray-800 rounded-xl">
              {/* Tab Headers */}
              <div className="flex border-b border-gray-800">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 p-4 border-r border-gray-800 last:border-r-0">
                    <SkeletonText width="w-24" height="h-5" />
                  </div>
                ))}
              </div>

              {/* Tab Content - Ride History Table */}
              <div className="p-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <SkeletonBox className="flex-1 h-10 rounded-lg" />
                  <SkeletonBox className="w-32 h-10 rounded-lg" />
                  <SkeletonBox className="w-32 h-10 rounded-lg" />
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block">
                  {/* Table Header */}
                  <div className="grid grid-cols-6 gap-4 p-3 bg-[#0F172A] rounded-t-lg border-b border-gray-800">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <SkeletonText key={i} width="w-20" height="h-4" />
                    ))}
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-gray-800">
                    {[1, 2, 3, 4, 5].map((row) => (
                      <div key={row} className="grid grid-cols-6 gap-4 p-3 items-center">
                        <SkeletonText width="w-24" height="h-4" />
                        <div className="space-y-1">
                          <SkeletonText width="w-28" height="h-4" />
                          <SkeletonText width="w-32" height="h-3" />
                        </div>
                        <SkeletonText width="w-20" height="h-4" />
                        <SkeletonBox className="w-20 h-6 rounded" />
                        <SkeletonText width="w-16" height="h-4" />
                        <div className="flex gap-2">
                          <SkeletonBox className="w-8 h-8 rounded-lg" />
                          <SkeletonBox className="w-8 h-8 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {[1, 2, 3].map((card) => (
                    <div key={card} className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <SkeletonText width="w-28" height="h-5" />
                        <SkeletonBox className="w-20 h-6 rounded" />
                      </div>
                      <div className="space-y-2 mb-3">
                        <SkeletonText width="w-full" height="h-4" />
                        <SkeletonText width="w-3/4" height="h-4" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1">
                          <SkeletonText width="w-16" height="h-3" />
                          <SkeletonText width="w-24" height="h-4" />
                        </div>
                        <div className="space-y-1">
                          <SkeletonText width="w-16" height="h-3" />
                          <SkeletonText width="w-20" height="h-4" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-gray-800">
                        <SkeletonBox className="flex-1 h-9 rounded-lg" />
                        <SkeletonBox className="flex-1 h-9 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800">
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
    </div>
  );
}