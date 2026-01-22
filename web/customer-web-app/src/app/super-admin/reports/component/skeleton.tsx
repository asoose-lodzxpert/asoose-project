'use client';

import React from 'react';

// Interfaces for TypeScript type safety
interface SkeletonProps {
  className?: string;
}

interface SkeletonTextProps {
  width?: string;
  height?: string;
  className?: string;
}

interface SkeletonCircleProps {
  size?: string;
}

const SkeletonBox = ({ className = "" }: SkeletonProps) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

// FIX: Added className to the destructuring and applied it to the div
const SkeletonText = ({ width = "w-full", height = "h-4", className = "" }: SkeletonTextProps) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonCircle = ({ size = "w-12 h-12" }: SkeletonCircleProps) => (
  <div className={`${size} bg-gray-700/30 rounded-full animate-pulse`} />
);

export default function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <SkeletonText width="w-48" height="h-8" />
        </div>
        <div className="flex gap-3">
          <SkeletonBox className="w-36 h-10 rounded-lg" />
          <SkeletonBox className="w-44 h-10 rounded-lg" />
        </div>
      </div>

      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((card) => (
          <div key={card} className="bg-[#1E293B] p-6 rounded-xl border border-gray-800 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <SkeletonCircle size="w-12 h-12" />
              <SkeletonBox className="w-16 h-6 rounded-full" />
            </div>
            <div>
              {/* FIX: Corrected typo 'classNh' to 'className' */}
              <SkeletonText width="w-32" height="h-8" className="mb-2" />
              <SkeletonText width="w-24" height="h-4" />
              <SkeletonText width="w-28" height="h-3" className="mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Performance Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Order Volume Skeleton */}
        <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
          <SkeletonText width="w-56" height="h-6" className="mb-6" />
          <div className="h-[300px] relative">
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-8">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <SkeletonText key={day} width="w-8" height="h-3" />
              ))}
            </div>
            <div className="absolute top-8 bottom-8 left-0 flex flex-col justify-between py-4">
              {[1, 2, 3, 4].map((tick) => (
                <SkeletonText key={tick} width="w-8" height="h-3" />
              ))}
            </div>
            <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                <div key={bar} className="flex flex-col items-center gap-2" style={{ height: '100%' }}>
                  <div className="flex items-end gap-1 h-full">
                    <SkeletonBox className="w-6 h-3/4 rounded-t" />
                    <SkeletonBox className="w-6 h-1/2 rounded-t" />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute top-2 right-6 flex gap-4">
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-3 h-3 rounded-full" />
                <SkeletonText width="w-12" height="h-3" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-3 h-3 rounded-full" />
                <SkeletonText width="w-12" height="h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Growth Chart Skeleton */}
        <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
          <SkeletonText width="w-56" height="h-6" className="mb-6" />
          <div className="h-[300px] relative">
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-8">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month) => (
                <SkeletonText key={month} width="w-8" height="h-3" />
              ))}
            </div>
            <div className="absolute top-8 bottom-8 left-0 flex flex-col justify-between py-4">
              {[1, 2, 3, 4].map((tick) => (
                <SkeletonText key={tick} width="w-8" height="h-3" />
              ))}
            </div>
            <div className="absolute top-8 bottom-8 left-8 right-8">
              <div className="h-full flex flex-col justify-between">
                {[1, 2, 3, 4].map((line) => (
                  <div key={line} className="border-b border-gray-700/50 w-full"></div>
                ))}
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700/50 rounded-full mt-16"></div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700/50 rounded-full mt-32"></div>
            </div>
            <div className="absolute top-2 right-6 flex gap-4">
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-4 h-1 rounded-full" />
                <SkeletonText width="w-12" height="h-3" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBox className="w-4 h-1 rounded-full" />
                <SkeletonText width="w-12" height="h-3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
          <SkeletonText width="w-40" height="h-6" className="mb-6" />
          <div className="space-y-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item}>
                <div className="flex justify-between text-sm mb-2">
                  <SkeletonText width="w-24" height="h-4" />
                  <SkeletonText width="w-8" height="h-4" />
                </div>
                <SkeletonBox className="w-full h-2 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
          <SkeletonText width="w-56" height="h-6" className="mb-6" />
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-3">
                <SkeletonText width="w-4" height="h-4" />
                <SkeletonBox className="w-4 h-4 rounded-sm" />
                <SkeletonBox className="flex-1 h-2 rounded-full" />
                <SkeletonText width="w-8" height="h-3" />
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <SkeletonText width="w-16" height="h-10" className="mx-auto mb-2" />
            <div className="flex justify-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map(star => (
                <SkeletonBox key={star} className="w-4 h-4 rounded-sm" />
              ))}
            </div>
            <SkeletonText width="w-48" height="h-3" className="mx-auto" />
          </div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
          <SkeletonText width="w-56" height="h-6" className="mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((vendor) => (
              <div key={vendor} className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <SkeletonCircle size="w-8 h-8" />
                  <div>
                    <SkeletonText width="w-28" height="h-4" className="mb-1" />
                    <SkeletonText width="w-16" height="h-3" />
                  </div>
                </div>
                <SkeletonText width="w-20" height="h-4" />
              </div>
            ))}
          </div>
          <SkeletonBox className="w-full h-10 rounded-lg mt-6" />
        </div>
      </div>
    </div>
  );
}