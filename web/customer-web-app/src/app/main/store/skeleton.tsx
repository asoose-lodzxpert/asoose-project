// as/customer-web-app/src/app/store/skeleton.tsx
export const StoreSkeleton = () => {
  return (
    <div className="min-h-screen animate-pulse bg-[#f7f7f5] pb-24 dark:bg-[#0a0a0a]">
      <main className="mx-auto max-w-7xl space-y-10 sm:space-y-12">
        <div className="px-4 pt-4 sm:pt-6">
          <div className="h-[260px] w-full rounded-[1.75rem] bg-gray-200 sm:h-[330px] dark:bg-white/5" />
        </div>

        <div className="px-4">
          <div className="mb-5 space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-white/5" />
            <div className="h-7 w-64 max-w-full rounded-lg bg-gray-200 dark:bg-white/5" />
          </div>
          <div className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex min-w-[148px] items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 dark:border-white/5 dark:bg-[#151515]"
              >
                <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-200 dark:bg-white/5" />
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-white/5" />
              </div>
            ))}
          </div>
        </div>

        {[1, 2].map((section) => (
          <div key={section} className="space-y-6">
            <div className="px-4 flex justify-between items-end">
              <div className="space-y-2">
                <div className="w-48 h-8 rounded-lg bg-gray-200 dark:bg-white/5" />
                <div className="w-32 h-3 rounded bg-gray-200 dark:bg-white/5" />
              </div>
              <div className="w-20 h-8 rounded-full bg-gray-200 dark:bg-white/5" />
            </div>

            <div className="flex gap-4 overflow-hidden px-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="h-64 min-w-[82vw] overflow-hidden rounded-[1.35rem] border border-gray-100 bg-white sm:min-w-0 dark:border-white/5 dark:bg-[#151515]"
                >
                  <div className="h-40 w-full bg-gray-200 dark:bg-white/5" />
                  <div className="space-y-3 p-4">
                    <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-white/5" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};
