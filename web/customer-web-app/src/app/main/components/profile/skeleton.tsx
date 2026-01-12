import React from 'react';

export const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 animate-pulse">
    {/* Header Skeleton */}
    <div className="bg-white dark:bg-[#151515] border-b border-gray-100 dark:border-white/5 pt-10 pb-8 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="flex-1 space-y-3 w-full sm:w-auto">
            <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded mx-auto sm:mx-0" />
            <div className="h-8 w-48 bg-gray-300 dark:bg-white/20 rounded mx-auto sm:mx-0" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-white/10 rounded mx-auto sm:mx-0" />
            <div className="flex gap-4 justify-center sm:justify-start mt-4">
              <div className="h-10 w-16 bg-gray-200 dark:bg-white/10 rounded-lg" />
              <div className="h-10 w-24 bg-gray-200 dark:bg-white/10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Tabs Skeleton */}
    <div className="sticky top-0 bg-gray-50/95 dark:bg-[#0a0a0a]/95 border-b border-gray-200 dark:border-white/5 px-4 py-4">
      <div className="max-w-4xl mx-auto flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-28 bg-gray-200 dark:bg-white/10 rounded-full shrink-0" />
        ))}
      </div>
    </div>

    {/* Content Skeleton */}
    <main className="max-w-4xl mx-auto px-4 py-8">
      <ContentSkeleton />
    </main>
  </div>
);

export const ContentSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div 
        key={i} 
        className="h-32 bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5" 
      />
    ))}
  </div>
);