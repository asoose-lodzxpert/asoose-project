'use client'; // <--- Ensure this is at the top

import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export const HomeHeader = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* LEFT: Address Selector */}
        <div className="flex items-center gap-3 cursor-pointer group min-w-fit">
            <div className="p-2 bg-yellow-500/10 rounded-full group-hover:bg-yellow-500/20 transition-colors">
                <MapPin className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Deliver to</div>
              <div className="flex items-center gap-1 font-bold text-sm leading-none whitespace-nowrap">
                Home - 123 Main St <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>
        </div>

        {/* CENTER: Search Bar (Responsive) */}
        <div className="hidden md:block flex-1 max-w-xl mx-auto">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search for food, groceries, or items" 
                  className="w-full bg-gray-100 dark:bg-white/5 h-10 rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
            </div>
        </div>

        {/* RIGHT: Desktop Nav & Profile */}
        <div className="flex items-center gap-4 md:gap-6">
            
            {/* --- NEW: THEME TOGGLE BUTTON --- */}
            {mounted && (
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            {/* Desktop Links (Hidden on Mobile) */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-600 dark:text-gray-300">
               <a href="#" className="hover:text-yellow-500 transition-colors">Orders</a>
               <a href="#" className="hover:text-yellow-500 transition-colors">Wallet</a>
               <a href="#" className="hover:text-yellow-500 transition-colors">Support</a>
            </nav>

            {/* Profile Avatar */}
            <div className="w-9 h-9 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden border border-gray-200 dark:border-white/5 hover:border-yellow-500 transition-colors cursor-pointer">
               <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">JD</div>
            </div>
        </div>
      </div>

      {/* MOBILE SEARCH (Visible only on mobile below header) */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search for food, groceries..." 
              className="w-full bg-gray-100 dark:bg-white/5 h-10 rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
        </div>
      </div>
    </header>
  );
};