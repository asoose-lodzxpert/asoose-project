interface TabProps {
  categories: string[];
  activeTab: string;
  onSelect: (cat: string) => void;
}

export const MenuTabs = ({ categories, activeTab, onSelect }: TabProps) => {
  return (
    <div className="sticky top-[70px] z-30 bg-gray-50 dark:bg-[#0a0a0a] pt-2 pb-4 px-4 -mx-4">
      <div className="flex overflow-x-auto gap-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === cat
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};