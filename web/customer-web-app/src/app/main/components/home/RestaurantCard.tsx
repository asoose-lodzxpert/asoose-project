import { Star, Clock, Bike } from 'lucide-react';
import Image from 'next/image';

interface RestaurantProps {
  name: string;
  image?: string | null;
  banner?: string | null;   // ✅ Added banner prop
  logo?: string | null;      // ✅ Added logo prop
  rating: number;
  time: string;
  delivery?: string;
  deliveryFee?: string | number;
  tags?: string[];
  discount?: string | null;
}

export const RestaurantCard = ({ 
  name, 
  image, 
  banner,     // ✅ Destructure banner
  logo,       // ✅ Destructure logo
  rating, 
  time, 
  delivery,
  deliveryFee,
  tags = [], 
  discount 
}: RestaurantProps) => {
  
  const deliveryText = delivery || (deliveryFee ? `₦${deliveryFee}` : 'Free');
  
  // ✅ Use banner for main image, fallback to image/logo, then placeholder
  const mainImage = banner || image || logo || '/placeholder-store.jpg';
  
  // ✅ Use logo for overlay, fallback to image/banner, then placeholder
  const logoImage = logo || image || banner || '/placeholder-logo.png';

  return (
    <div className="group relative bg-white dark:bg-[#151515] rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-all duration-300 hover:shadow-md cursor-pointer h-full flex flex-col">
      
      {/* Image Area - ✅ Using banner as main image */}
      <div className="aspect-[4/3] w-full bg-gray-100 dark:bg-white/5 rounded-xl relative overflow-hidden mb-3">
        <Image 
          src={mainImage} 
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Gradient Overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {discount && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm z-10 animate-in zoom-in">
            {discount}
          </div>
        )}
        
        {/* Logo Overlay - ✅ Using logo prop for circular overlay */}
        <div className="absolute -bottom-3 left-3 w-10 h-10 bg-white dark:bg-[#222] rounded-full p-1 shadow-md z-10 flex items-center justify-center">
          <div className="w-full h-full bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-[8px] font-bold overflow-hidden relative">
             <Image 
               src={logoImage} 
               alt={`${name} logo`} 
               fill 
               className="object-cover" 
             />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-2 pl-1 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-base truncate pr-2 text-gray-900 dark:text-gray-100">{name}</h4>
          <div className="flex items-center gap-1 text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-md">
            <Star className="w-3 h-3 fill-current" /> {rating?.toFixed(1) || 'New'}
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {time}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
          <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> {deliveryText}</span>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};