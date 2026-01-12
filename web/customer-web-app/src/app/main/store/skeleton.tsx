// as/customer-web-app/src/app/store/skeleton.tsx
export const StoreSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 animate-pulse">
      {/* 1. Header Area */}
      <div className="h-[70px] bg-white dark:bg-[#151515] border-b border-gray-100 dark:border-white/5" />

      <main className="max-w-7xl mx-auto space-y-8">
        {/* 2. Dynamic Banner Placeholder */}
        <div className="px-4 pt-6">
          <div className="w-full h-44 sm:h-56 rounded-[2rem] bg-gray-200 dark:bg-white/5" />
        </div>

        {/* 3. Category Grid Placeholder */}
        <div className="px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col items-center p-5 rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5">
                <div className="w-14 h-14 rounded-2xl bg-gray-200 dark:bg-white/5" />
                <div className="mt-4 w-16 h-3 rounded bg-gray-200 dark:bg-white/5" />
              </div>
            ))}
          </div>
        </div>

        {/* 4. Vertical Sections (simulating multiple categories) */}
        {[1, 2].map((section) => (
          <div key={section} className="space-y-6">
            <div className="px-4 flex justify-between items-end">
              <div className="space-y-2">
                <div className="w-48 h-8 rounded-lg bg-gray-200 dark:bg-white/5" />
                <div className="w-32 h-3 rounded bg-gray-200 dark:bg-white/5" />
              </div>
              <div className="w-20 h-8 rounded-full bg-gray-200 dark:bg-white/5" />
            </div>

            <div className="px-4 flex gap-5 overflow-hidden">
              {[1, 2, 3].map((card) => (
                <div key={card} className="min-w-[300px] h-64 rounded-[2rem] bg-white dark:bg-[#151515] p-4 border border-gray-100 dark:border-white/5">
                   <div className="w-full h-40 rounded-2xl bg-gray-200 dark:bg-white/5 mb-4" />
                   <div className="w-3/4 h-5 rounded bg-gray-200 dark:bg-white/5 mb-2" />
                   <div className="w-1/2 h-3 rounded bg-gray-200 dark:bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};