import { Plus, Star } from 'lucide-react';

interface MenuItemProps {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  isPopular?: boolean;
}

export const MenuItem = ({ id, name, description, price, image, isPopular }: MenuItemProps) => {
  return (
    <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex gap-4 group active:scale-[0.99] transition-transform">
       {/* Image */}
       <div className="w-24 h-24 bg-gray-100 dark:bg-white/10 rounded-xl flex-shrink-0 relative overflow-hidden">
          {/* <Image src={image} fill className="object-cover" /> */}
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800" />
       </div>

       {/* Content */}
       <div className="flex-1 flex flex-col justify-between">
          <div>
             <div className="flex justify-between items-start">
               <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{name}</h3>
               {isPopular && (
                 <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    <Star className="w-3 h-3 fill-current" /> Popular
                 </div>
               )}
             </div>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
               {description}
             </p>
          </div>
          
          <div className="flex items-end justify-between mt-2">
             <span className="font-bold text-yellow-600 dark:text-yellow-500 text-lg">${price.toFixed(2)}</span>
             <button className="w-8 h-8 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/20 transition-colors">
                <Plus className="w-5 h-5" />
             </button>
          </div>
       </div>
    </div>
  );
};