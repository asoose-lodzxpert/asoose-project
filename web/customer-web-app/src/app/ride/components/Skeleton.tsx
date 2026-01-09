'use client';

import React from 'react';

// 1. Base Primitive
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

// 2. Main Screen Skeleton (Inputs + Ride List)
export function RideUiSkeleton() {
  return (
    <div className="flex flex-col h-full justify-between pointer-events-none font-sans bg-white md:p-6">
      
      {/* --- TOP: INPUTS --- */}
      <div className="p-4 md:p-0">
         {/* Input Box Container */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            {/* Pickup Input */}
            <div className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-10 flex-1" />
            </div>
            {/* Divider */}
            <div className="h-px bg-gray-100 ml-9" />
            {/* Destination Input */}
            <div className="flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-10 flex-1" />
            </div>
         </div>

         {/* Saved Places Chips */}
         <div className="flex gap-3 mt-4 overflow-hidden">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
         </div>
      </div>

      {/* Spacer for Mobile Map View */}
      <div className="flex-1 md:hidden" />

      {/* --- BOTTOM: RIDE LIST --- */}
      <div className="bg-white rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.05)] p-5 pb-8 md:shadow-none md:p-0">
        <Skeleton className="w-12 h-1.5 mx-auto mb-6 md:hidden" /> {/* Handle */}
        
        <Skeleton className="h-6 w-32 mb-4 hidden md:block" /> {/* Title */}

        {/* Ride Cards Row/Col */}
        <div className="flex gap-4 overflow-hidden md:flex-col">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[140px] md:w-full border border-gray-100 rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-3">
               <Skeleton className="w-10 h-6 md:w-12 md:h-8" /> {/* Car Icon */}
               <div className="flex-1 space-y-2">
                 <Skeleton className="h-4 w-20" /> {/* Type */}
                 <Skeleton className="h-3 w-16" /> {/* Time */}
               </div>
               <Skeleton className="h-5 w-16 md:text-right" /> {/* Price */}
            </div>
          ))}
        </div>

        {/* Bottom Button */}
        <div className="mt-6 pt-4 border-t border-gray-50">
           <div className="flex justify-between mb-4">
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-4 w-12" />
           </div>
           <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// 3. Driver Status Skeleton (For "Finding Driver" transition)
export function DriverStatusSkeleton() {
  return (
    <div className="h-full flex flex-col justify-end pointer-events-none md:p-6 bg-transparent md:bg-white">
       <div className="bg-white rounded-t-3xl shadow-2xl p-6 md:rounded-3xl md:shadow-none md:p-0 w-full">
          <Skeleton className="w-12 h-1.5 mx-auto mb-6 md:hidden" />
          
          <div className="flex gap-4 mb-6">
             <Skeleton className="w-14 h-14 rounded-full" />
             <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
             </div>
          </div>

          <div className="flex gap-4 mb-6">
             <Skeleton className="h-12 flex-1 rounded-xl" />
             <Skeleton className="h-12 flex-1 rounded-xl" />
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-50">
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-2/3" />
          </div>
       </div>
    </div>
  );
}