import React from 'react';

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse`} />
);

export default function SuperAdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <SkeletonText width="w-56" height="h-8" />
            <SkeletonText width="w-72" height="h-4" />
          </div>
          
          <SkeletonBox className="w-40 h-10 rounded-lg" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#1E293B] p-4 md:p-5 rounded-xl border border-gray-800">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-2 flex-1">
                  <SkeletonText width="w-32" height="h-3" />
                  <SkeletonText width="w-24" height="h-8" />
                </div>
                <SkeletonBox className="w-10 h-10 rounded-lg" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonText width="w-16" height="h-4" />
                <SkeletonText width="w-24" height="h-3" />
              </div>
            </div>
          ))}
        </div>

        {/* Real-time Activity Table Skeleton */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <SkeletonText width="w-40" height="h-5" />
            <SkeletonText width="w-24" height="h-4" />
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block">
            {/* Table Header */}
            <div className="p-4 bg-[#0F172A] border-b border-gray-800">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonText key={i} width="w-24" height="h-4" />
                ))}
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-800">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="p-4">
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <SkeletonBox className="w-6 h-6 rounded" />
                      <SkeletonText width="w-20" height="h-4" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <SkeletonBox className="w-6 h-6 rounded" />
                      <SkeletonText width="w-40" height="h-4" />
                    </div>
                    
                    <SkeletonText width="w-32" height="h-4" />
                    
                    <SkeletonBox className="w-24 h-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-3">
            {[1, 2, 3].map((card) => (
              <div key={card} className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <SkeletonText width="w-24" height="h-4" />
                  <SkeletonBox className="w-16 h-6 rounded" />
                </div>
                <div className="space-y-2 mb-4">
                  <SkeletonText width="w-full" height="h-4" />
                  <SkeletonText width="w-3/4" height="h-3" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <SkeletonText width="w-20" height="h-4" />
                  <SkeletonBox className="w-8 h-8 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-800 bg-[#0F172A]">
            <div className="flex justify-between items-center">
              <SkeletonText width="w-32" height="h-4" />
              <div className="flex gap-2">
                <SkeletonBox className="w-20 h-8 rounded" />
                <SkeletonBox className="w-20 h-8 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* System Health & Alerts Section */}
        <div className="space-y-4">
          <SkeletonText width="w-48" height="h-6" />
          
          {/* Status Indicators */}
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBox key={i} className="w-48 h-10 rounded-lg" />
            ))}
          </div>

          {/* Alerts Table */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-red-500/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-5 h-5 rounded" />
                <SkeletonText width="w-32" height="h-5" />
              </div>
              <SkeletonText width="w-28" height="h-4" />
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block">
              {/* Table Header */}
              <div className="p-4 bg-[#0F172A] border-b border-gray-800">
                <div className="grid grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonText key={i} width="w-20" height="h-4" />
                  ))}
                </div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-800">
                {[1, 2, 3, 4, 5].map((row) => (
                  <div key={row} className="p-4">
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <SkeletonBox className="w-20 h-6 rounded" />
                      
                      <div className="col-span-2 flex items-center gap-2">
                        <SkeletonBox className="w-6 h-6 rounded" />
                        <SkeletonText width="w-full" height="h-4" />
                      </div>
                      
                      <SkeletonText width="w-24" height="h-4" />
                      <SkeletonText width="w-20" height="h-4" />
                      <SkeletonBox className="w-20 h-6 rounded" />
                      
                      <div className="flex items-center gap-2">
                        <SkeletonBox className="w-8 h-8 rounded" />
                        <SkeletonBox className="w-20 h-8 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-3">
              {[1, 2, 3].map((card) => (
                <div key={card} className="bg-[#0F172A] border border-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <SkeletonBox className="w-16 h-6 rounded" />
                    <SkeletonBox className="w-20 h-6 rounded" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <SkeletonText width="w-full" height="h-4" />
                    <div className="flex items-center gap-3 mt-2">
                      <SkeletonText width="w-24" height="h-3" />
                      <SkeletonText width="w-20" height="h-3" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-800">
                    <SkeletonBox className="flex-1 h-10 rounded-lg" />
                    <SkeletonBox className="flex-1 h-10 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-800 bg-[#0F172A]">
              <div className="flex justify-between items-center">
                <SkeletonText width="w-32" height="h-4" />
                <div className="flex gap-2">
                  <SkeletonBox className="w-20 h-8 rounded" />
                  <SkeletonBox className="w-20 h-8 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2 flex-1">
                  <SkeletonText width="w-32" height="h-5" />
                  <SkeletonText width="w-16" height="h-8" />
                  <SkeletonText width="w-40" height="h-3" />
                </div>
                <SkeletonBox className="w-10 h-10 rounded-lg" />
              </div>
              <SkeletonBox className="w-full h-10 rounded-lg" />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}