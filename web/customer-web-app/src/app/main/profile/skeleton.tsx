import { Loader2 } from "lucide-react";

const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24 font-sans animate-pulse">
      
      {/* 1. Enhanced Header Skeleton */}
      <div className="bg-white dark:bg-[#151515] border-b border-gray-100 dark:border-white/5 pt-10 pb-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            
            {/* Avatar Skeleton */}
            <div className="relative">
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full border-4 border-white dark:border-[#151515] shadow-xl" />
              <div className="absolute bottom-0 right-0 p-2 bg-gray-200 dark:bg-gray-800 rounded-full shadow-lg">
                <div className="w-4 h-4" />
              </div>
            </div>

            <div className="flex-1 w-full">
              {/* Greeting Skeleton */}
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto sm:mx-0" />
              
              {/* Name Skeleton */}
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mt-3 mb-2 mx-auto sm:mx-0" />
              
              {/* User Details Block Skeleton */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-y-1 gap-x-4 text-sm">
                <div className="h-3 w-40 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="hidden sm:inline h-3 w-3 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded-full" />
              </div>

              {/* Address Display Skeleton */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="h-3 w-56 bg-gray-200 dark:bg-gray-800 rounded-full" />
              </div>

              {/* Quick Stats Skeleton */}
              <div className="flex items-center justify-center sm:justify-start gap-6 mt-6 pt-4 border-t border-gray-100 dark:border-white/5 sm:border-0 sm:pt-0">
                <div className="text-center sm:text-left">
                  <div className="h-6 w-10 bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto sm:mx-0" />
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-full mt-2" />
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-800" />
                <div className="text-center sm:text-left">
                  <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto sm:mx-0" />
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded-full mt-2" />
                </div>
              </div>
            </div>
            
            {/* Sign Out Button Skeleton */}
            <div className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gray-200 dark:bg-gray-800 rounded-xl w-28 h-10" />
          </div>
        </div>
      </div>

      {/* 2. Sticky Pill Navigation Skeleton */}
      <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm px-4 pt-4 pb-2 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap bg-gray-200 dark:bg-gray-800"
            >
              <div className="w-4 h-4 bg-gray-300 dark:bg-gray-700 rounded-full" />
              <div className="h-3 w-16 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Main Content Area Skeleton */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-[400px]">
        
        {/* Orders Tab Skeleton */}
        <div className="space-y-4">
          {/* Empty State Skeleton */}
          <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-10 w-40 bg-gray-200 dark:bg-gray-800 rounded-xl mt-4" />
            </div>
          </div>

          {/* Order Cards Skeleton */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 p-5 hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
                  <div className="h-6 w-6 bg-gray-200 dark:bg-gray-800 rounded-full" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Loading Overlay */}
      <div className="fixed inset-0 bg-gray-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Loading your profile...
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable skeleton components for different content types
export const ContentSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Settings Tab Skeleton */}
      <div className="max-w-xl mx-auto space-y-6">
        {/* Personal Info Skeleton */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="p-2">
            {[1, 2].map((i) => (
              <div key={i} className="w-full flex items-center justify-between p-4">
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Security Skeleton */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-200 dark:bg-gray-800 rounded-full">
                <div className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full mt-3 mb-4" />
                <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-800 rounded-full" />
                <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg mt-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Additional skeleton components for different tabs
export const OrdersSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 p-5 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-6 w-6 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AddressesSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2">
        <div className="p-3 bg-gray-200 dark:bg-gray-800 rounded-full">
          <div className="w-6 h-6" />
        </div>
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>
      
      <div className="grid sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>
    </div>
  );
};

export default ProfileSkeleton;