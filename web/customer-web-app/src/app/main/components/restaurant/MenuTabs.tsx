interface TabProps {
  categories: string[];
  activeTab: string;
  onSelect: (cat: string) => void;
}

export const MenuTabs = ({ categories, activeTab, onSelect }: TabProps) => {
  return (
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1 scrollbar-hide md:mx-0 md:px-0">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`min-h-10 snap-start whitespace-nowrap rounded-xl px-4 py-2 text-xs font-extrabold transition-all sm:text-sm ${
            activeTab === cat
              ? "bg-[#181816] text-white shadow-md shadow-black/10 dark:bg-yellow-400 dark:text-black"
              : "border border-black/[0.06] bg-white text-gray-600 hover:border-yellow-400/60 dark:border-white/[0.07] dark:bg-[#151515] dark:text-gray-300"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};
