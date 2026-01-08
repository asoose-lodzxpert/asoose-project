'use client';

import { Plus } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  storeId: string;
  onClick?: () => void; // <--- FIX 1: Add this optional prop definition
}

export const ProductCard = ({ id, name, description, price, image, storeId, onClick }: ProductProps) => {
  const addItem = useCartStore((state) => state.addItem);

  // FIX 2: Accept the event 'e' to stop propagation
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation(); // <--- Prevents the card click (Modal) from firing when clicking "Add"
    addItem({
      id,
      name,
      price,
      quantity: 1,
      image: image,
      restaurantId: storeId,
    });
  };

  return (
    <div 
      onClick={onClick} // <--- FIX 3: Attach the click handler to the main container
      className="bg-white dark:bg-[#151515] p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex gap-4 hover:border-yellow-500/30 transition-colors group cursor-pointer"
    >
      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 dark:bg-white/5 rounded-xl flex-shrink-0 overflow-hidden relative">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <h4 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-1">{name}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{description}</p>
        </div>

        <div className="flex justify-between items-end mt-2">
          <span className="font-black text-lg">₦{price.toLocaleString()}</span>
          <button 
            onClick={handleQuickAdd} // <--- Use the new handler that stops propagation
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white hover:bg-yellow-500 hover:text-black transition-colors z-10"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};