import React from 'react';

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse`} />
);

const SkeletonCircle = ({ size = "w-5 h-5" }) => (
  <div className={`${size} bg-gray-700/30 rounded-full animate-pulse`} />
);

export default function OrderDetailsPageSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <SkeletonText width="w-64" height="h-8" />
          <SkeletonText width="w-48" height="h-4" />
        </div>
        
        <div className="flex flex-wrap gap-3">
          <SkeletonBox className="w-32 h-10 rounded-lg" />
          <SkeletonBox className="w-36 h-10 rounded-lg" />
          <SkeletonBox className="w-32 h-10 rounded-lg" />
          <SkeletonBox className="w-32 h-10 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN Skeleton */}
        <div className="lg:col-span-2 space-y-6">
           
          {/* Timeline Card Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <SkeletonText width="w-48" height="h-6" />
              <SkeletonBox className="w-32 h-6 rounded" />
            </div>
            <SkeletonText width="w-full" height="h-4" />

            {/* Timeline Steps */}
            <div className="space-y-6 relative border-l-2 border-gray-700 ml-3 pl-8 mt-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="relative">
                  <SkeletonCircle size="w-5 h-5 absolute -left-[41px] top-1" />
                  <SkeletonText width="w-40" height="h-5" />
                  <SkeletonText width="w-48" height="h-3" />
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <SkeletonBox className="w-36 h-10 rounded-lg" />
            </div>
          </div>

          {/* Customer Details Card Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <SkeletonText width="w-40" height="h-6" />
            <div className="space-y-4 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBox className="w-8 h-8 rounded" />
                  <SkeletonText width="w-48" height="h-4" />
                </div>
              ))}
              <div className="flex items-start gap-3">
                <SkeletonBox className="w-8 h-8 rounded" />
                <div className="flex-1 space-y-2">
                  <SkeletonText width="w-full" height="h-4" />
                  <SkeletonText width="w-3/4" height="h-3" />
                </div>
              </div>
            </div>
            <div className="mt-6">
              <SkeletonBox className="w-40 h-10 rounded-lg" />
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN Skeleton */}
        <div className="lg:col-span-1 space-y-6">
           
          {/* Rider Details Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <SkeletonText width="w-32" height="h-6" />
            <div className="space-y-3 my-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonText width="w-20" height="h-4" />
                  <SkeletonText width="w-32" height="h-4" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SkeletonBox className="h-10 rounded-lg" />
              <SkeletonBox className="h-10 rounded-lg" />
            </div>
          </div>

          {/* Payment Details Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <SkeletonText width="w-36" height="h-6" />
            <div className="space-y-3 my-6 border-b border-gray-800 pb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonText width="w-20" height="h-4" />
                  <SkeletonText width="w-28" height="h-4" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <SkeletonText width="w-24" height="h-4" />
                  <SkeletonText width="w-16" height="h-4" />
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gray-700 mt-2">
                <SkeletonText width="w-24" height="h-6" />
                <SkeletonText width="w-20" height="h-6" />
              </div>
            </div>
          </div>

          {/* Admin Action Log Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <SkeletonText width="w-36" height="h-6" />
            <div className="space-y-4 mt-4">
              {[1, 2].map((i) => (
                <div key={i} className="border-l-2 border-gray-700 pl-3 space-y-2">
                  <SkeletonText width="w-48" height="h-3" />
                  <SkeletonText width="w-full" height="h-3" />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}