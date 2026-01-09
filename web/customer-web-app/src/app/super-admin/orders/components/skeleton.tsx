import React from 'react';

export default function OrdersPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. Header Section Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            {/* Title */}
            <div className="h-8 w-48 bg-gray-800 rounded-lg"></div>
            {/* Subtitle */}
            <div className="h-4 w-64 bg-gray-800/60 rounded-lg"></div>
          </div>
          <div className="flex gap-2">
            {/* Refresh Button */}
            <div className="w-10 h-10 bg-gray-800 rounded-lg border border-gray-700"></div>
            {/* Export Button */}
            <div className="w-32 h-10 bg-gray-800 rounded-lg border border-gray-700"></div>
          </div>
        </div>

        {/* 2. Quick Filter Tabs Skeleton */}
        <div className="flex items-center gap-4 border-b border-gray-800 pb-1 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-800 rounded-lg"></div>
          ))}
        </div>

        {/* 3. Filters Panel Skeleton */}
        <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800 space-y-4">
          <div className="hidden md:grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2 h-10 bg-gray-800 rounded-lg"></div>
            {/* Dropdowns */}
            <div className="h-10 bg-gray-800 rounded-lg"></div>
            <div className="h-10 bg-gray-800 rounded-lg"></div>
            {/* Date Inputs */}
            <div className="flex gap-2">
              <div className="w-full h-10 bg-gray-800 rounded-lg"></div>
              <div className="w-full h-10 bg-gray-800 rounded-lg"></div>
            </div>
          </div>
          {/* Mobile Filter Toggle placeholder */}
          <div className="md:hidden flex justify-between">
             <div className="h-6 w-32 bg-gray-800 rounded"></div>
             <div className="h-8 w-8 bg-gray-800 rounded"></div>
          </div>
        </div>

        {/* 4. Data Table Skeleton */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
          
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-7 gap-4 p-4 border-b border-gray-800 bg-[#1E293B]">
            {['ID', 'Type', 'Store', 'Customer', 'Payment', 'Status', 'Placed'].map((header, i) => (
              <div key={i} className="h-4 bg-gray-800 rounded w-full max-w-[80%]"></div>
            ))}
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-gray-800">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="p-4 flex flex-col md:grid md:grid-cols-7 gap-4 items-center">
                
                {/* ID Column */}
                <div className="w-full flex md:block justify-between items-center mb-2 md:mb-0">
                   <div className="h-4 w-20 bg-gray-700 rounded mb-1"></div>
                </div>

                {/* Type Badge */}
                <div className="w-full hidden md:block">
                  <div className="h-6 w-16 bg-gray-800 rounded border border-gray-700"></div>
                </div>

                {/* Store Name */}
                <div className="w-full hidden md:block">
                  <div className="h-4 w-24 bg-gray-700 rounded"></div>
                </div>

                {/* Customer Name */}
                <div className="w-full hidden md:block">
                  <div className="h-4 w-20 bg-gray-700/60 rounded"></div>
                </div>

                {/* Payment (Amount + Status) */}
                <div className="w-full hidden md:block space-y-1">
                  <div className="h-4 w-16 bg-gray-700 rounded"></div>
                  <div className="h-3 w-12 bg-gray-800 rounded"></div>
                </div>

                {/* Status Badge */}
                <div className="w-full hidden md:block">
                   <div className="h-6 w-24 bg-gray-800 rounded border border-gray-700"></div>
                </div>

                {/* Placed At */}
                <div className="w-full hidden md:block space-y-1">
                   <div className="h-3 w-16 bg-gray-700 rounded"></div>
                   <div className="h-3 w-12 bg-gray-800 rounded"></div>
                </div>

                {/* Mobile View Placeholder Card (Visible only on mobile) */}
                <div className="md:hidden w-full space-y-3">
                   <div className="flex justify-between">
                      <div className="h-4 w-24 bg-gray-700 rounded"></div>
                      <div className="h-6 w-20 bg-gray-800 rounded"></div>
                   </div>
                   <div className="h-10 w-full bg-gray-800/50 rounded"></div>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}