"use client";

import React from "react";

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse`} />
);

export default function SettingsPageSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Title */}
      <SkeletonText width="w-48" height="h-8" />

      {/* General Settings Section */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <SkeletonBox className="w-5 h-5 rounded" />
          <SkeletonText width="w-24" height="h-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((input) => (
            <div key={input} className="space-y-2">
              <SkeletonText width="w-32" height="h-3" />
              <SkeletonBox className="w-full h-12 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Financial Settings Section */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <SkeletonBox className="w-5 h-5 rounded" />
          <SkeletonText width="w-48" height="h-6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((input) => (
            <div key={input} className="space-y-2">
              <SkeletonText width="w-32" height="h-3" />
              <SkeletonBox className="w-full h-12 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Operational Settings Section */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <SkeletonBox className="w-5 h-5 rounded" />
          <SkeletonText width="w-32" height="h-6" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((toggle) => (
            <div
              key={toggle}
              className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-gray-700"
            >
              <div className="space-y-2">
                <SkeletonText width="w-40" height="h-4" />
                <SkeletonText width="w-56" height="h-3" />
              </div>
              <SkeletonBox className="w-12 h-6 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <SkeletonBox className="w-48 h-12 rounded-xl" />
    </div>
  );
}
