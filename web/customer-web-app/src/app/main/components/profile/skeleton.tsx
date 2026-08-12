import React from "react";

export const ProfileSkeleton = () => (
  <div className="min-h-screen animate-pulse bg-[#f7f7f5] pb-24 dark:bg-[#0a0a0a]">
    {/* Header Skeleton */}
    <div className="px-4 pb-4 pt-4 sm:pb-6 sm:pt-6">
      <div className="mx-auto max-w-5xl rounded-[1.75rem] bg-[#181816] p-5 sm:p-8">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/10 sm:h-24 sm:w-24 sm:rounded-3xl" />
          <div className="min-w-0 flex-1 space-y-3 pt-1">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-7 w-48 max-w-full rounded bg-white/15" />
            <div className="h-3 w-56 max-w-full rounded bg-white/10" />
            <div className="mt-5 grid max-w-lg grid-cols-2 gap-2 border-t border-white/10 pt-5">
              <div className="h-16 rounded-2xl bg-white/[0.07]" />
              <div className="h-16 rounded-2xl bg-white/[0.07]" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Tabs Skeleton */}
    <div className="sticky top-[64px] border-y border-black/[0.05] bg-[#f7f7f5]/95 px-4 py-3 dark:border-white/5 dark:bg-[#0a0a0a]/95">
      <div className="mx-auto flex max-w-5xl gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-10 w-28 shrink-0 rounded-xl bg-gray-200 dark:bg-white/10"
          />
        ))}
      </div>
    </div>

    {/* Content Skeleton */}
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <ContentSkeleton />
    </main>
  </div>
);

export const ContentSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-32 rounded-2xl border border-gray-100 bg-white sm:rounded-3xl dark:border-white/5 dark:bg-[#151515]"
      />
    ))}
  </div>
);
