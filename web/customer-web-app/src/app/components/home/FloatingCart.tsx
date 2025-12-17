import { ShoppingBag } from 'lucide-react';

interface CartProps {
    count: number;
    total: string;
    onClick?: () => void;
}

export const FloatingCart = ({ count, total, onClick }: CartProps) => {
    if (count === 0) return null;
    
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-8 md:bottom-8 md:w-96 animate-in slide-in-from-bottom-4 duration-500">
        <button 
            onClick={onClick}
            className="w-full bg-yellow-500 text-black py-3 px-4 rounded-xl shadow-xl shadow-yellow-500/20 flex items-center justify-between active:scale-[0.98] transition-transform hover:bg-yellow-400"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center relative">
               <ShoppingBag className="w-4 h-4" />
               <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold border border-yellow-500 shadow-sm">{count}</div>
            </div>
            <div className="text-sm font-bold">View Cart</div>
          </div>
          <div className="text-sm font-black">{total}</div>
        </button>
      </div>
    );
};