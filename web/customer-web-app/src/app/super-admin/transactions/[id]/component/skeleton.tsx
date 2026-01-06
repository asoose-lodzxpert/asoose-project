const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
);

// Skeleton Box Component
const SkeletonBox = ({ className = "", children = null }) => (
  <div className={`relative overflow-hidden bg-gray-800/50 rounded ${className}`}>
    <Shimmer />
    {children}
  </div>
);

export const TransactionDetailSkeleton = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <SkeletonBox className="h-4 w-40" />
          <SkeletonBox className="h-9 w-64" />
        </div>
        
        <div className="flex gap-3">
          <SkeletonBox className="h-10 w-40 rounded-lg" />
          <SkeletonBox className="h-10 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Main Status Card Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-1">
                 <SkeletonBox className="h-3 w-32 mb-2" />
                 <SkeletonBox className="h-12 w-48 mb-2" />
                 <SkeletonBox className="h-4 w-64" />
              </div>

              <div className="text-right space-y-2">
                 <SkeletonBox className="h-8 w-32 rounded-full mx-auto md:ml-auto" />
                 <SkeletonBox className="h-3 w-40" />
              </div>
           </div>

           {/* Financial Breakdown Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <SkeletonBox className="h-5 w-5 rounded" />
                <SkeletonBox className="h-5 w-48" />
              </div>
              
              <div className="space-y-4">
                 {[1, 2, 3, 4].map((i) => (
                   <div key={i} className="flex justify-between items-center">
                     <SkeletonBox className="h-4 w-24" />
                     <SkeletonBox className="h-4 w-16" />
                   </div>
                 ))}
                 <div className="pt-4 border-t border-gray-700 flex justify-between items-center">
                   <SkeletonBox className="h-5 w-16" />
                   <SkeletonBox className="h-5 w-20" />
                 </div>
              </div>
           </div>

           {/* Timeline Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <SkeletonBox className="h-5 w-5 rounded" />
                <SkeletonBox className="h-5 w-48" />
              </div>
              
              <div className="space-y-6 relative border-l border-gray-700 ml-2 pl-6">
                 {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="relative">
                       <div className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-[#1E293B] ${
                          i === 4 ? 'bg-green-500' : 'bg-gray-600'
                       }`}></div>
                       <SkeletonBox className="h-4 w-40 mb-1" />
                       <SkeletonBox className="h-3 w-32 mb-1" />
                       <SkeletonBox className="h-3 w-56" />
                    </div>
                 ))}
              </div>
           </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* Payment Method Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <SkeletonBox className="h-3 w-32 mb-4" />
              <div className="flex items-center gap-3 mb-4">
                 <SkeletonBox className="w-12 h-12 rounded-lg" />
                 <div className="flex-1 space-y-2">
                    <SkeletonBox className="h-4 w-32" />
                    <SkeletonBox className="h-3 w-40" />
                 </div>
              </div>
           </div>

           {/* User Info Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <SkeletonBox className="h-3 w-32 mb-4" />
              <div className="flex items-center gap-3 mb-4">
                 <SkeletonBox className="w-10 h-10 rounded-full" />
                 <div className="flex-1 space-y-2">
                    <SkeletonBox className="h-4 w-28" />
                    <SkeletonBox className="h-3 w-20" />
                 </div>
              </div>
              <div className="space-y-3 border-t border-gray-700 pt-3">
                 <div className="flex justify-between">
                    <SkeletonBox className="h-4 w-8" />
                    <SkeletonBox className="h-4 w-20" />
                 </div>
                 <div className="flex justify-between">
                    <SkeletonBox className="h-4 w-12" />
                    <SkeletonBox className="h-4 w-40" />
                 </div>
              </div>
           </div>

           {/* Related Entity Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <SkeletonBox className="h-3 w-32 mb-4" />
              <div className="flex items-center gap-3 mb-4">
                 <SkeletonBox className="w-10 h-10 rounded-lg" />
                 <div className="flex-1 space-y-2">
                    <SkeletonBox className="h-4 w-24" />
                    <SkeletonBox className="h-5 w-20 rounded" />
                 </div>
              </div>
              <SkeletonBox className="h-10 w-full rounded-lg" />
           </div>

           {/* Support Skeleton */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <SkeletonBox className="h-3 w-24 mb-2" />
              <SkeletonBox className="h-3 w-full mb-1" />
              <SkeletonBox className="h-3 w-full mb-4" />
              <SkeletonBox className="h-10 w-full rounded-lg" />
           </div>

        </div>
      </div>
    </div>
  );
};
