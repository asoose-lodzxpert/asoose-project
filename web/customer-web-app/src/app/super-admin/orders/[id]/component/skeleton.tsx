'use client';

import React from 'react';

export function OrderDetailsSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-pulse">
      {/* Sticky Header Skeleton */}
      <div className="flex justify-between items-start py-4 border-b border-gray-800">
        <div className="space-y-3">
          <div className="h-3 w-24 bg-slate-800 rounded" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 bg-slate-800 rounded-lg" />
            <div className="h-6 w-20 bg-slate-800/50 rounded-full" />
          </div>
          <div className="h-3 w-40 bg-slate-800/50 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-slate-800 rounded-lg" />
          <div className="h-10 w-32 bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* Stepper Skeleton */}
      <div className="w-full bg-[#1E293B] p-8 rounded-xl border border-gray-800">
        <div className="flex justify-between max-w-4xl mx-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-800 border-2 border-slate-700" />
              <div className="h-2 w-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ledger Card */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden">
            <div className="h-12 bg-slate-800/30 border-b border-slate-800" />
            <div className="p-6 space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 bg-slate-800 rounded-lg" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-800 rounded" />
                      <div className="h-3 w-20 bg-slate-800/50 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-16 bg-slate-800 rounded" />
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-900/50 border-t border-slate-800 space-y-2">
              <div className="h-4 w-full bg-slate-800/30 rounded" />
              <div className="h-8 w-full bg-slate-800/50 rounded" />
            </div>
          </div>

          {/* Timeline Card */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6">
            <div className="h-4 w-40 bg-slate-800 rounded mb-8" />
            <div className="space-y-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-slate-800" />
                  <div className="h-16 flex-1 bg-slate-900/40 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="h-4 w-32 bg-slate-800 rounded" />
              <div className="h-20 w-full bg-slate-900/50 rounded-lg" />
              <div className="space-y-2">
                <div className="h-10 w-full bg-slate-800/50 rounded-lg" />
                <div className="h-10 w-full bg-slate-800/50 rounded-lg" />
              </div>
            </div>
          ))}
          {/* Overrides Panel */}
          <div className="h-40 bg-red-500/5 border border-red-500/20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}