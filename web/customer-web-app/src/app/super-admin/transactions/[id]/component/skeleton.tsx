'use client';

import React from 'react';

export function TransactionDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-4 w-32 bg-[#1E293B] rounded animate-pulse"></div>
            <div className="h-8 w-64 bg-[#1E293B] rounded animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-40 bg-[#1E293B] rounded-lg animate-pulse"></div>
            <div className="h-10 w-28 bg-[#1E293B] rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Summary Card Skeleton */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#0F172A] rounded-xl animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-10 w-48 bg-[#0F172A] rounded animate-pulse"></div>
                    <div className="h-4 w-64 bg-[#0F172A] rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="h-8 w-24 bg-[#0F172A] rounded-full animate-pulse"></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="space-y-2">
                    <div className="h-3 w-20 bg-[#0F172A] rounded animate-pulse"></div>
                    <div className="h-5 w-32 bg-[#0F172A] rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Details Skeleton */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0F172A] rounded-xl animate-pulse"></div>
                  <div className="h-6 w-32 bg-[#0F172A] rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-24 bg-[#0F172A] rounded animate-pulse"></div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="space-y-2">
                      <div className="h-3 w-20 bg-[#0F172A] rounded animate-pulse"></div>
                      <div className="h-4 w-32 bg-[#0F172A] rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>

                {/* Order Items Skeleton */}
                <div className="border-t border-gray-700 pt-6">
                  <div className="h-5 w-32 bg-[#0F172A] rounded mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg animate-pulse"></div>
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                            <div className="h-3 w-24 bg-gray-700 rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="h-5 w-16 bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Breakdown Skeleton */}
                <div className="border-t border-gray-700 pt-6">
                  <div className="h-5 w-40 bg-[#0F172A] rounded mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex justify-between">
                        <div className="h-4 w-32 bg-[#0F172A] rounded animate-pulse"></div>
                        <div className="h-4 w-20 bg-[#0F172A] rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Skeleton */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#0F172A] rounded-xl animate-pulse"></div>
                <div className="h-6 w-40 bg-[#0F172A] rounded animate-pulse"></div>
              </div>
              
              <div className="space-y-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-[#0F172A] rounded-full animate-pulse"></div>
                      {item < 3 && <div className="w-0.5 h-12 bg-gray-700 animate-pulse"></div>}
                    </div>
                    <div className="flex-1 pb-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-5 w-32 bg-[#0F172A] rounded animate-pulse"></div>
                        <div className="h-4 w-36 bg-[#0F172A] rounded animate-pulse"></div>
                      </div>
                      <div className="h-12 w-full bg-[#0F172A] rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Side Info Skeleton */}
          <div className="space-y-6">
            
            {/* Customer Info Skeleton */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#0F172A] rounded-xl animate-pulse"></div>
                <div className="h-6 w-32 bg-[#0F172A] rounded animate-pulse"></div>
              </div>
              
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="space-y-2">
                    <div className="h-3 w-20 bg-[#0F172A] rounded animate-pulse"></div>
                    <div className="h-5 w-full bg-[#0F172A] rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Account Info Skeleton */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#0F172A] rounded-xl animate-pulse"></div>
                <div className="h-6 w-40 bg-[#0F172A] rounded animate-pulse"></div>
              </div>
              
              <div className="space-y-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="space-y-2">
                    <div className="h-3 w-24 bg-[#0F172A] rounded animate-pulse"></div>
                    <div className="h-5 w-full bg-[#0F172A] rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity Skeleton */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#0F172A] rounded-xl animate-pulse"></div>
                <div className="h-6 w-32 bg-[#0F172A] rounded animate-pulse"></div>
              </div>
              
              <div className="space-y-4">
                <div className="h-4 w-48 bg-[#0F172A] rounded animate-pulse"></div>
                
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2].map((item) => (
                    <div key={item} className="bg-[#0F172A] p-3 rounded-lg space-y-2">
                      <div className="h-3 w-20 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-8 w-24 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-lg border border-green-500/20 space-y-2">
                  <div className="h-3 w-16 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-10 w-32 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Wallet Balance Skeleton */}
            <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#0F172A] rounded-xl animate-pulse"></div>
                <div className="h-6 w-32 bg-[#0F172A] rounded animate-pulse"></div>
              </div>
              
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex justify-between items-center">
                    <div className="h-4 w-16 bg-[#0F172A] rounded animate-pulse"></div>
                    <div className="h-5 w-20 bg-[#0F172A] rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}