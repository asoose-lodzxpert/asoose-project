'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useParams } from 'next/navigation';  
import { toast } from 'react-toastify'; 

interface MenuItemProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  isPopular?: boolean;
}

export const MenuItem = ({ id, name, description, price, image, isPopular }: MenuItemProps) => {
  const params = useParams();
  const restaurantId = params.id as string;
  
  const addItem = useCartStore((state) => state.addItem); 

  const handleAdd = () => {
    addItem({
      id,
      name,
      price,
      quantity: 1,
      restaurantId: restaurantId 
    });
    toast.success(`Added ${name}`);
  };

  return (
    <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex gap-4 hover:border-yellow-500/30 transition-colors group">
      
      {/* Image */}
      <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-xl flex-shrink-0 overflow-hidden relative">
        {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
        )}
        {isPopular && (
           <span className="absolute top-0 left-0 bg-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-br-lg text-black">
             POPULAR
           </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{name}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{description}</p>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="font-black text-sm">₦{price.toLocaleString()}</span>
          
          <button 
            onClick={handleAdd} 
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};