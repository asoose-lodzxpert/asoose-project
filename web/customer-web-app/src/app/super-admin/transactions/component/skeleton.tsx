'use client';

import React from 'react';

export function TransactionsListSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-[#1E293B] rounded animate-pulse"></div>
          <div className="h-4 w-64 bg-[#1E293B] rounded animate-pulse"></div>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <div className="md:hidden h-10 w-10 bg-[#1E293B] rounded-lg animate-pulse"></div>
          <div className="hidden md:block h-10 w-32 bg-[#1E293B] rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-[#1E293B] border border-gray-700 rounded-xl p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-[#0F172A] rounded"></div>
              <div className="h-5 w-5 bg-[#0F172A] rounded"></div>
            </div>
            <div className="h-8 w-32 bg-[#0F172A] rounded mt-2"></div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="hidden md:flex flex-col md:flex-row gap-3 mb-6 bg-[#1E293B] p-4 rounded-lg border border-gray-700">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 bg-[#0F172A] rounded"></div>
          <div className="w-full h-10 bg-[#0F172A] rounded-lg"></div>
        </div>
        <div className="h-10 w-32 bg-[#0F172A] rounded-lg"></div>
        <div className="h-10 w-40 bg-[#0F172A] rounded-lg"></div>
      </div>

      {/* Table Area Skeleton */}
      <div className="bg-[#1E293B] rounded-xl border border-gray-700 p-4">
        {/* Desktop Table Skeleton */}
        <div className="hidden md:block">
          {/* Table Header Skeleton */}
          <div className="grid grid-cols-7 gap-4 mb-4 px-4">
            {[1, 2, 3, 4, 5, 6, 7].map((item) => (
              <div key={item} className="h-6 bg-[#0F172A] rounded animate-pulse"></div>
            ))}
          </div>

          {/* Table Rows Skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
              <div key={row} className="grid grid-cols-7 gap-4 p-4 border-t border-gray-700">
                {/* ID */}
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-[#0F172A] rounded animate-pulse"></div>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-[#0F172A] rounded animate-pulse"></div>
                </div>
                
                {/* User */}
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-[#0F172A] rounded animate-pulse"></div>
                </div>
                
                {/* Amount */}
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-[#0F172A] rounded animate-pulse"></div>
                </div>
                
                {/* Status */}
                <div className="space-y-2">
                  <div className="h-6 w-16 bg-[#0F172A] rounded-full animate-pulse"></div>
                </div>
                
                {/* Date */}
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-[#0F172A] rounded animate-pulse"></div>
                </div>
                
                {/* Actions */}
                <div className="space-y-2">
                  <div className="h-4 w-4 bg-[#0F172A] rounded animate-pulse ml-auto"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between p-4 border-t border-gray-700">
            <div className="h-4 w-32 bg-[#0F172A] rounded animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-[#0F172A] rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-[#0F172A] rounded animate-pulse"></div>
              <div className="h-8 w-24 bg-[#0F172A] rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-[#0F172A] rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-[#0F172A] rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="bg-[#0F172A] border border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="h-4 w-32 bg-[#1E293B] rounded animate-pulse"></div>
                <div className="h-6 w-16 bg-[#1E293B] rounded-full animate-pulse"></div>
              </div>
              <div className="h-5 w-48 bg-[#1E293B] rounded animate-pulse"></div>
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-[#1E293B] rounded animate-pulse"></div>
                <div className="h-5 w-20 bg-[#1E293B] rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}