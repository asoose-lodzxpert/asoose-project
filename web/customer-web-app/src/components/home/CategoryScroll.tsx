import React from 'react';

// Define a union type for the input items
type CategoryItem = string | { id: string; label: string };

interface CategoryScrollProps {
  categories: CategoryItem[];
  activeId?: string;             // Made optional
  onSelect?: (id: string) => void; // Made optional
}

export const CategoryScroll = ({ categories, activeId, onSelect }: CategoryScrollProps) => {
  return (
    <div className="sticky top-[70px] z-20 bg-gray-50 dark:bg-[#0a0a0a] pt-2 pb-2">
      <div className="flex overflow-x-auto gap-2 px-4 pb-2 no-scrollbar scroll-smooth">
        {categories.map((cat, index) => {
          // Normalize the data whether it's a string or an object
          const isString = typeof cat === 'string';
          const label = isString ? cat : cat.label;
          const id = isString ? cat : cat.id; // Use label as ID if string
          
          const isActive = activeId === id;

          return (
            <button 
              key={`${id}-${index}`}
              onClick={() => onSelect && onSelect(id)}
              disabled={!onSelect} // Disable click if no handler provided
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-105' 
                  : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
              } ${!onSelect ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};