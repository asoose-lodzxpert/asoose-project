export const AppFooter = () => {
  return (
    <footer className="hidden md:block py-12 mt-20 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-sm text-gray-500">
        <div className="flex items-center gap-8">
           <span className="font-bold text-black dark:text-white text-lg">Asoose Inc.</span>
           <div className="flex gap-6 font-medium">
             <a href="#" className="hover:text-yellow-500 transition-colors">Privacy Policy</a>
             <a href="#" className="hover:text-yellow-500 transition-colors">Terms of Service</a>
             <a href="#" className="hover:text-yellow-500 transition-colors">Help Center</a>
           </div>
        </div>
        <div className="opacity-70">
           © 2025 Asoose Technologies. Made in Nigeria.
        </div>
      </div>
    </footer>
  );
};