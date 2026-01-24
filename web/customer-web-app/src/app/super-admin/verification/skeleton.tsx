import React from 'react';
import { FileText, Search, RefreshCw } from 'lucide-react';

export default function VerificationSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      
      {/* Header Skeleton */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
        <div className="space-y-2">
          <div className="h-8 sm:h-9 w-48 sm:w-56 bg-gray-800 rounded-lg animate-pulse"></div>
          <div className="h-3 sm:h-4 w-64 sm:w-80 bg-gray-800 rounded animate-pulse"></div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-700 animate-pulse" />
            <div className="w-full h-10 bg-[#1E293B] border border-slate-800 rounded-xl animate-pulse"></div>
          </div>
          <div className="p-2.5 sm:p-3 bg-slate-800 rounded-xl shrink-0">
            <RefreshCw className="w-4 h-4 text-gray-700 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs Skeleton */}
      <div className="flex gap-2 p-1 bg-slate-900 rounded-xl w-full sm:w-fit border border-slate-800">
        <div className="h-9 w-24 sm:w-32 bg-blue-600/20 rounded-lg animate-pulse"></div>
        <div className="h-9 w-24 sm:w-32 bg-gray-800 rounded-lg animate-pulse"></div>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Desktop Table Skeleton - Hidden on Mobile */}
        <div className="hidden md:block">
          {/* Table Header */}
          <div className="border-b border-slate-800 bg-slate-900/50">
            <div className="grid grid-cols-4 gap-4 px-6 py-4">
              <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-28 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-800">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 px-6 py-4 items-center">
                {/* Partner Identity Column */}
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-36 animate-pulse"></div>
                  <div className="h-3 bg-gray-800 rounded w-44 animate-pulse"></div>
                </div>

                {/* Entity Reference Column */}
                <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>

                {/* Documentation Column */}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400/20 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-700 rounded w-16 animate-pulse"></div>
                </div>

                {/* Action Column */}
                <div className="h-8 w-28 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Card Skeleton - Hidden on Desktop */}
        <div className="md:hidden p-4 space-y-3">
          {[...Array(5)].map((_, index) => (
            <div 
              key={index} 
              className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-4"
            >
              {/* Top Section: Icon + Name/Email + Chevron */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 bg-slate-800 rounded-lg animate-pulse shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-32 animate-pulse"></div>
                    <div className="h-3 bg-gray-800 rounded w-40 animate-pulse"></div>
                  </div>
                </div>
                <div className="w-5 h-5 bg-gray-800 rounded animate-pulse"></div>
              </div>

              {/* Middle Section: Entity + Documents Grid */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800/50">
                <div className="space-y-2">
                  <div className="h-2.5 w-12 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3.5 w-24 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 w-16 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3.5 w-20 bg-blue-400/20 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Bottom Section: Action Button */}
              <div className="h-9 w-full bg-slate-800 rounded-lg animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="border-t border-slate-800 px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="h-4 w-48 bg-gray-800 rounded animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="h-9 w-9 bg-blue-600/20 rounded-lg animate-pulse"></div>
              <div className="h-9 w-9 bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="h-9 w-9 bg-gray-800 rounded-lg animate-pulse"></div>
              <div className="h-9 w-24 bg-gray-800 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Indicator - Subtle pulsing effect */}
      <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="font-medium">Loading verifications...</span>
      </div>
    </div>
  );
}