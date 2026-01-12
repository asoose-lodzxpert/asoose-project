import React from 'react';
import Link from 'next/link';

interface CategoryScrollProps {
  categories: string[]; // Or { id, name, ... } based on your updated usage
  verticalId?: string;  // Make optional or required based on usage
}

// Updated to accept verticalId so we can link correctly
export const CategoryScroll: React.FC<CategoryScrollProps> = ({ categories, verticalId }) => {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
      {categories.map((category, index) => {
        // If verticalId is missing, default to just search or handle error
        const linkHref = verticalId 
          ? `/store/category/${verticalId}?filter=${encodeURIComponent(category)}` 
          : '#';

        return (
          <Link
            key={index}
            href={linkHref}
            className="flex-shrink-0"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5 rounded-full shadow-sm hover:border-yellow-500/50 hover:shadow-md transition-all cursor-pointer whitespace-nowrap">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {category}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
};