import React from 'react';
import { Search, Filter, Download, Calendar } from 'lucide-react';

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 animate-pulse rounded ${className}`} />
);

const SkeletonTableRow = () => (
  <div className="flex items-center gap-4 p-4 border-b border-gray-800">
    {/* Ride ID Column */}
    <div className="flex-1 min-w-[120px]">
      <SkeletonBox className="h-4 w-20 mb-2" />
      <SkeletonBox className="h-3 w-16" />
    </div>

    {/* Driver Column */}
    <div className="flex-1 min-w-[160px] flex items-center gap-3">
      <SkeletonBox className="w-8 h-8 rounded-full" />
      <div className="flex-1">
        <SkeletonBox className="h-4 w-24 mb-1" />
        <SkeletonBox className="h-3 w-20" />
      </div>
    </div>

    {/* Passenger Column */}
    <div className="flex-1 min-w-[140px]">
      <SkeletonBox className="h-4 w-28" />
    </div>

    {/* Route Column */}
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
        <SkeletonBox className="h-3 w-24" />
      </div>
      <div className="w-0.5 h-3 bg-gray-700 ml-0.5 mb-2"></div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
        <SkeletonBox className="h-3 w-24" />
      </div>
    </div>

    {/* Status Column */}
    <div className="flex-1 min-w-[100px]">
      <SkeletonBox className="h-6 w-20 rounded" />
    </div>

    {/* Fare Column */}
    <div className="flex-1 min-w-[80px]">
      <SkeletonBox className="h-4 w-16" />
    </div>

    {/* Actions Column */}
    <div className="flex items-center gap-1 min-w-[80px]">
      <SkeletonBox className="w-8 h-8 rounded-lg" />
      <SkeletonBox className="w-8 h-8 rounded-lg" />
    </div>
  </div>
);

const SkeletonMobileCard = () => (
  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
    <div className="flex justify-between items-start mb-3">
      <SkeletonBox className="h-4 w-28" />
      <SkeletonBox className="h-6 w-20 rounded" />
    </div>
    <div className="space-y-2 mb-3">
      <div className="flex justify-between">
        <SkeletonBox className="h-4 w-20" />
        <SkeletonBox className="h-4 w-24" />
      </div>
      <div className="flex justify-between">
        <SkeletonBox className="h-4 w-16" />
        <SkeletonBox className="h-4 w-28" />
      </div>
      <div className="flex justify-between">
        <SkeletonBox className="h-4 w-12" />
        <SkeletonBox className="h-4 w-16" />
      </div>
    </div>
  </div>
);

export default function RidesPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <SkeletonBox className="h-8 w-48 mb-2" />
            <SkeletonBox className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <button className="md:hidden p-2 border border-gray-800 rounded-lg text-gray-300">
              <Filter className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-400 font-bold rounded-lg text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Filters Panel Skeleton */}
        <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
            
            {/* Search Skeleton */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <div className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-9 pr-4 py-2 h-10">
                <SkeletonBox className="h-4 w-48" />
              </div>
            </div>

            {/* Status Skeleton */}
            <div>
              <div className="w-full bg-[#0F172A] border border-gray-800 rounded-lg px-3 py-2 h-10">
                <SkeletonBox className="h-4 w-20" />
              </div>
            </div>

            {/* Date Range Skeleton */}
            <div className="flex gap-2 md:col-span-2 lg:col-span-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <div className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-9 pr-2 py-2 h-10">
                  <SkeletonBox className="h-4 w-24" />
                </div>
              </div>
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <div className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-9 pr-2 py-2 h-10">
                  <SkeletonBox className="h-4 w-24" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Desktop Table Skeleton */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden hidden md:block">
          {/* Table Header */}
          <div className="flex items-center gap-4 p-4 border-b border-gray-800 bg-[#0F172A]/50">
            <div className="flex-1 min-w-[120px]">
              <SkeletonBox className="h-4 w-16" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <SkeletonBox className="h-4 w-12" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <SkeletonBox className="h-4 w-20" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <SkeletonBox className="h-4 w-16" />
            </div>
            <div className="flex-1 min-w-[100px]">
              <SkeletonBox className="h-4 w-14" />
            </div>
            <div className="flex-1 min-w-[80px]">
              <SkeletonBox className="h-4 w-10" />
            </div>
            <div className="min-w-[80px]">
              <SkeletonBox className="h-4 w-16" />
            </div>
          </div>

          {/* Table Rows */}
          {[...Array(8)].map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}

          {/* Pagination Skeleton */}
          <div className="flex items-center justify-between p-4 border-t border-gray-800">
            <SkeletonBox className="h-4 w-32" />
            <div className="flex gap-2">
              <SkeletonBox className="h-8 w-8 rounded" />
              <SkeletonBox className="h-8 w-8 rounded" />
              <SkeletonBox className="h-8 w-8 rounded" />
              <SkeletonBox className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>

        {/* Mobile Cards Skeleton */}
        <div className="md:hidden">
          {[...Array(5)].map((_, i) => (
            <SkeletonMobileCard key={i} />
          ))}
        </div>

      </div>
    </div>
  );
}