import React from 'react';

export const StoreDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] animate-pulse pb-24">
      <main className="max-w-7xl mx-auto md:px-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
             
             {/* Hero Skeleton */}
             <div className="h-[280px] w-full bg-gray-200 dark:bg-white/5 md:rounded-3xl relative overflow-hidden">
                <div className="absolute bottom-6 left-6 flex items-end gap-4">
                    <div className="w-16 h-16 bg-gray-300 dark:bg-white/10 rounded-2xl" />
                    <div className="space-y-2 mb-1">
                        <div className="w-48 h-8 bg-gray-300 dark:bg-white/10 rounded-lg" />
                        <div className="w-32 h-4 bg-gray-300 dark:bg-white/10 rounded" />
                    </div>
                </div>
             </div>

             {/* Search Bar Skeleton */}
             <div className="px-4 md:px-0">
                <div className="w-full h-12 bg-gray-200 dark:bg-white/5 rounded-xl" />
             </div>

             {/* Tabs Skeleton */}
             <div className="px-4 md:px-0 flex gap-3 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-20 h-9 bg-gray-200 dark:bg-white/5 rounded-full flex-shrink-0" />
                ))}
             </div>

             {/* Products Grid Skeleton */}
             <div className="px-4 md:px-0 space-y-4">
                <div className="w-32 h-6 bg-gray-200 dark:bg-white/5 rounded" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white dark:bg-[#151515] p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex gap-4">
                            <div className="w-24 h-24 bg-gray-200 dark:bg-white/5 rounded-xl flex-shrink-0" />
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div className="space-y-2">
                                    <div className="w-3/4 h-4 bg-gray-200 dark:bg-white/5 rounded" />
                                    <div className="w-full h-3 bg-gray-200 dark:bg-white/5 rounded" />
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="w-16 h-5 bg-gray-200 dark:bg-white/5 rounded" />
                                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/5" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>

          {/* RIGHT COLUMN (Desktop Sidebar) */}
          <div className="hidden lg:block lg:col-span-1">
             <div className="sticky top-8 h-[400px] w-full bg-gray-200 dark:bg-white/5 rounded-3xl" />
          </div>

        </div>
      </main>
    </div>
  );
};