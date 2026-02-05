"use client";

import React from "react";

export function OrderListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-800 rounded-lg" />
          <div className="h-4 w-64 bg-slate-800/50 rounded-lg" />
        </div>
        <div className="h-10 w-32 bg-slate-800 rounded-lg" />
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-10 flex-1 min-w-[240px] bg-[#0F172A] border border-gray-700 rounded-lg" />
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-[#0F172A] border border-gray-700 rounded-lg" />
            <div className="h-10 w-32 bg-[#0F172A] border border-gray-700 rounded-lg" />
            <div className="h-10 w-10 bg-[#0F172A] border border-gray-700 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-[#1E293B] rounded-xl border border-gray-800 overflow-hidden">
        {/* Table Header Placeholder */}
        <div className="h-12 bg-slate-800/30 border-b border-gray-800" />

        {/* Table Rows */}
        <div className="p-4 space-y-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
            >
              <div className="flex gap-4 items-center">
                <div className="h-4 w-20 bg-slate-800 rounded" />
                <div className="h-6 w-24 bg-slate-800/50 rounded-full" />
                <div className="h-4 w-32 bg-slate-800 rounded" />
              </div>
              <div className="flex gap-8 items-center">
                <div className="h-4 w-16 bg-slate-800 rounded" />
                <div className="h-4 w-24 bg-slate-800 rounded" />
                <div className="h-8 w-8 bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
