'use client';

import React from 'react';

const SkeletonBox = ({ className = "" }) => (
  <div className={`bg-gray-700/30 rounded animate-pulse ${className}`} />
);

const SkeletonText = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-700/30 rounded animate-pulse`} />
);

export default function DisputeDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <SkeletonText width="w-64" height="h-10" />
        <div className="flex gap-3">
          <SkeletonBox className="w-32 h-10 rounded-lg" />
          <SkeletonBox className="w-40 h-10 rounded-lg" />
          <SkeletonBox className="w-24 h-10 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Dispute Overview Card Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-6">
                <SkeletonText width="w-40" height="h-6" />
                <SkeletonBox className="w-20 h-6 rounded" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                 {[1, 2, 3, 4, 5, 6].map((item) => (
                   <div key={item} className="space-y-2">
                     <SkeletonText width="w-24" height="h-3" />
                     <SkeletonText width="w-32" height="h-4" />
                   </div>
                 ))}
              </div>
           </div>

           {/* Related Entities & Parties Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <SkeletonText width="w-32" height="h-5" className="mb-4" />
              
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <SkeletonText width="w-24" height="h-4" />
                  <SkeletonText width="w-20" height="h-4" />
                  <SkeletonBox className="w-16 h-4 rounded" />
                </div>
              </div>

              <SkeletonText width="w-40" height="h-5" className="mb-4" />
              
              <div className="space-y-4">
                 {[1, 2, 3].map((party) => (
                   <div key={party} className="flex justify-between items-center pb-3 border-b border-gray-800">
                     <div className="flex items-center gap-2">
                       <SkeletonText width="w-16" height="h-4" />
                       <SkeletonText width="w-36" height="h-4" />
                     </div>
                     <SkeletonText width="w-12" height="h-4" />
                   </div>
                 ))}
              </div>
           </div>

           {/* Communication & Notes Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <SkeletonText width="w-56" height="h-6" className="mb-6" />
              
              <div className="space-y-4 mb-6">
                 {/* Message 1 */}
                 <div className="bg-[#0F172A] p-4 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                       <SkeletonText width="w-32" height="h-4" />
                       <SkeletonText width="w-24" height="h-3" />
                    </div>
                    <SkeletonText width="w-full" height="h-3" className="mb-1" />
                    <SkeletonText width="w-3/4" height="h-3" />
                 </div>

                 {/* Message 2 */}
                 <div className="bg-[#0F172A]/50 p-4 rounded-xl border border-gray-800 ml-4">
                    <div className="flex justify-between items-center mb-2">
                       <SkeletonText width="w-24" height="h-4" />
                       <SkeletonText width="w-20" height="h-3" />
                    </div>
                    <SkeletonText width="w-2/3" height="h-3" />
                 </div>
              </div>

              {/* Input Skeleton */}
              <div className="relative">
                 <SkeletonBox className="w-full h-24 rounded-lg" />
                 <div className="absolute bottom-3 right-3 flex gap-2">
                    <SkeletonBox className="w-28 h-8 rounded" />
                    <SkeletonBox className="w-32 h-8 rounded" />
                 </div>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* Resolution Actions Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <SkeletonText width="w-48" height="h-6" className="mb-4" />
              <div className="space-y-3">
                 {[1, 2, 3, 4, 5, 6].map((action) => (
                   <SkeletonBox key={action} className="w-full h-12 rounded-lg" />
                 ))}
              </div>
           </div>

           {/* Audit Trail Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <SkeletonText width="w-56" height="h-6" className="mb-4" />
              
              <div className="space-y-6 relative border-l border-gray-700 ml-2 pl-6">
                 {[1, 2, 3].map((trail, index) => (
                   <div key={index} className="relative">
                     <div className="absolute -left-[29px] top-1 w-3 h-3 bg-gray-700 rounded-full border-2 border-[#1E293B]"></div>
                     <div className="space-y-2">
                       <SkeletonText width="w-full" height="h-3" />
                       <SkeletonText width="w-32" height="h-2" />
                       {index === 2 && (
                         <div className="bg-[#0F172A] p-2 rounded mt-2">
                           <SkeletonText width="w-full" height="h-2" className="mb-1" />
                           <SkeletonText width="w-3/4" height="h-2" />
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
              </div>
           </div>

        </div>

      </div>

    </div>
  );
}