export const StoreSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 animate-pulse">
      
      {/* 1. Header Area */}
      <div className="h-[70px] bg-white dark:bg-[#151515] border-b border-gray-100 dark:border-white/5" />

      <main className="max-w-7xl mx-auto space-y-8">
        
        {/* 2. Vertical Icons Grid */}
        <div className="px-4 pt-8">
          <div className="grid grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-200 dark:bg-white/5" />
                <div className="w-12 h-3 rounded-full bg-gray-200 dark:bg-white/5" />
              </div>
            ))}
          </div>
        </div>

        {/* 3. Banner Placeholder */}
        <div className="px-4">
          <div className="w-full h-40 sm:h-48 rounded-3xl bg-gray-200 dark:bg-white/5" />
        </div>

        {/* 4. Sections (simulating multiple verticals) */}
        {[1, 2].map((section) => (
          <div key={section} className="space-y-4">
            
            {/* Section Title */}
            <div className="px-4 flex justify-between items-end">
              <div className="space-y-2">
                <div className="w-32 h-6 rounded bg-gray-200 dark:bg-white/5" />
                <div className="w-20 h-3 rounded bg-gray-200 dark:bg-white/5" />
              </div>
              <div className="w-12 h-4 rounded bg-gray-200 dark:bg-white/5" />
            </div>

            {/* Category Chips */}
            <div className="px-4 flex gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5].map((chip) => (
                <div key={chip} className="w-24 h-8 rounded-full bg-gray-200 dark:bg-white/5 flex-shrink-0" />
              ))}
            </div>

            {/* Vendor Cards */}
            <div className="px-4 flex gap-4 overflow-hidden">
              {[1, 2, 3].map((card) => (
                <div key={card} className="min-w-[280px] sm:min-w-[320px] h-56 rounded-2xl bg-gray-200 dark:bg-white/5 flex-shrink-0 p-3">
                   <div className="w-full h-32 rounded-xl bg-gray-300 dark:bg-white/10 mb-3" />
                   <div className="w-3/4 h-4 rounded bg-gray-300 dark:bg-white/10 mb-2" />
                   <div className="w-1/2 h-3 rounded bg-gray-300 dark:bg-white/10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};