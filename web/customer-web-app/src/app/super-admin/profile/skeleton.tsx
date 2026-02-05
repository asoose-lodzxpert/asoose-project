"use client";

import React from "react";

export default function AdminProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-10 w-64 bg-slate-800 rounded-lg" />
        <div className="h-4 w-96 bg-slate-800/50 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Identity Card Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#1E293B] border border-gray-800 rounded-3xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800" />

            {/* Avatar Circle */}
            <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto" />

            <div className="space-y-3">
              <div className="h-6 w-32 bg-slate-800 mx-auto rounded" />
              <div className="h-3 w-48 bg-slate-800/50 mx-auto rounded" />
            </div>

            {/* Info Badges */}
            <div className="space-y-2">
              <div className="h-12 w-full bg-[#0F172A] rounded-2xl border border-gray-800" />
              <div className="h-12 w-full bg-[#0F172A] rounded-2xl border border-gray-800" />
            </div>
          </div>
        </div>

        {/* RIGHT: Form Sections Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          {[1, 2].map((section) => (
            <div
              key={section}
              className="bg-[#1E293B] border border-gray-800 rounded-3xl overflow-hidden shadow-xl"
            >
              {/* Section Header */}
              <div className="p-6 border-b border-gray-800 bg-white/5">
                <div className="h-5 w-40 bg-slate-800 rounded" />
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Field Pulses */}
                  {[1, 2].map((field) => (
                    <div key={field} className="space-y-2">
                      <div className="h-3 w-24 bg-slate-800/50 rounded ml-1" />
                      <div className="h-14 w-full bg-[#0F172A] rounded-2xl border border-gray-800" />
                    </div>
                  ))}
                </div>

                {/* Button Pulse */}
                <div className="flex justify-end pt-4">
                  <div className="h-14 w-44 bg-slate-800 rounded-2xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
