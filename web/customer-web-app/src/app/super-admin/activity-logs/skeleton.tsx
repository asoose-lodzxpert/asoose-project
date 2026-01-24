export default function ActivityLogSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block bg-[#1E293B] rounded-xl border border-gray-800 overflow-hidden">
        <div className="h-12 bg-gray-800/50 border-b border-gray-700 w-full mb-1"></div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center h-16 px-6 border-b border-gray-800/50 gap-4">
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
            <div className="h-4 bg-gray-800 rounded w-1/4"></div>
          </div>
        ))}
      </div>

      {/* Mobile Card Skeleton */}
      <div className="md:hidden space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#1E293B] border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between mb-4">
              <div className="h-4 bg-gray-800 rounded w-24"></div>
              <div className="h-3 bg-gray-800 rounded w-16"></div>
            </div>
            <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    </div>
  );
}