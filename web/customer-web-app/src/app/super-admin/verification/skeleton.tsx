import React from 'react';

export default function VerificationSkeleton() {
  return (
    <div className="p-6 bg-[#0F172A] min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-8 w-64 bg-gray-800 rounded-lg animate-pulse" />
          </div>
          <div className="h-4 w-96 bg-gray-800/50 rounded animate-pulse" />
        </header>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="bg-[#1E293B] rounded-2xl border border-gray-800 overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="p-4 bg-black/20">
                <div className="flex justify-between items-start mb-3">
                  {/* Role Badge */}
                  <div className="w-16 h-5 bg-gray-700/50 rounded animate-pulse" />
                  {/* Status */}
                  <div className="w-12 h-3 bg-gray-800 rounded animate-pulse" />
                </div>
                {/* Name */}
                <div className="h-5 w-3/4 bg-gray-700 rounded mb-2 animate-pulse" />
                {/* Email */}
                <div className="h-3 w-1/2 bg-gray-800 rounded animate-pulse" />
              </div>

              {/* Document Image Placeholder */}
              <div className="aspect-video bg-gray-800/30 animate-pulse relative">
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-12 h-12 bg-gray-800 rounded-full" />
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-gray-800 flex flex-col gap-3">
                {/* Doc Type */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-700" />
                  <div className="h-3 w-1/3 bg-gray-700/50 rounded animate-pulse" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-1">
                  <div className="flex-1 h-10 bg-gray-800 rounded-xl animate-pulse" />
                  <div className="flex-1 h-10 bg-gray-800 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}