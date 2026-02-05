import React from "react";

export const DeliveryDetailsSkeleton = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 animate-pulse">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 py-4 border-b border-gray-800 -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="w-full md:w-auto space-y-3">
          <div className="h-4 w-24 bg-gray-800 rounded"></div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-48 bg-gray-800 rounded"></div>
            <div className="h-8 w-8 bg-gray-800 rounded"></div>
            <div className="h-6 w-16 bg-gray-800 rounded"></div>
          </div>
          <div className="h-4 w-32 bg-gray-800 rounded"></div>
        </div>

        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
          <div className="h-10 w-10 bg-gray-800 rounded-lg"></div>
          <div className="h-10 w-32 bg-gray-800 rounded-lg"></div>
        </div>
      </div>

      {/* 2. Stepper Skeleton */}
      <div className="w-full bg-[#1E293B] p-6 rounded-xl border border-gray-800 mb-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center w-full gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-800"></div>
              <div className="h-3 w-16 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          {/* Package Info Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
              <div className="h-5 w-40 bg-gray-800 rounded"></div>
              <div className="h-6 w-20 bg-gray-800 rounded"></div>
            </div>
            <div className="p-5 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-14 h-14 bg-gray-800 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-gray-800 rounded"></div>
                    <div className="h-3 w-1/2 bg-gray-800 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-900/50 p-5 border-t border-gray-800 space-y-3">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-gray-800 rounded"></div>
                <div className="h-3 w-16 bg-gray-800 rounded"></div>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-800">
                <div className="h-5 w-24 bg-gray-800 rounded"></div>
                <div className="h-6 w-32 bg-gray-800 rounded"></div>
              </div>
            </div>
          </div>

          {/* Timeline Skeleton */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl p-5">
            <div className="h-5 w-32 bg-gray-800 rounded mb-6"></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex-shrink-0"></div>
                  <div className="flex-1 bg-gray-900/40 p-4 rounded-xl border border-gray-800 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-32 bg-gray-800 rounded"></div>
                      <div className="h-3 w-16 bg-gray-800 rounded"></div>
                    </div>
                    <div className="h-3 w-48 bg-gray-800 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
          {/* Info Cards Skeleton */}
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="bg-[#1E293B] border border-gray-800 rounded-xl p-5 space-y-4"
            >
              <div className="h-4 w-40 bg-gray-800 rounded mb-2"></div>
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800 space-y-3">
                <div className="h-5 w-3/4 bg-gray-800 rounded"></div>
                <div className="h-3 w-1/2 bg-gray-800 rounded"></div>
                <div className="flex gap-2 mt-2">
                  <div className="h-8 flex-1 bg-gray-800 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
