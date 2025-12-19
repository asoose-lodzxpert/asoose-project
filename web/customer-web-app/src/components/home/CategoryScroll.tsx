interface Category {
  id: string;
  label: string;
}

interface CategoryScrollProps {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const CategoryScroll = ({ categories, activeId, onSelect }: CategoryScrollProps) => {
  return (
    <div className="sticky top-[105px] z-20 bg-gray-50 dark:bg-[#0a0a0a] pt-4 pb-2">
      <div className="flex overflow-x-auto gap-2 px-4 pb-2 no-scrollbar scroll-smooth">
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeId === cat.id
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-105' 
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};