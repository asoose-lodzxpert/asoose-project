import { Star, Clock } from 'lucide-react';

interface RestaurantProps {
  name: string;
  image?: string | null;
  rating: number;
  time: string;
  // Make delivery optional or accept deliveryFee mapping
  delivery?: string; 
  deliveryFee?: string | number; // Add this to handle the backend data
  tags?: string[]; // Make optional to prevent errors if missing
  discount?: string | null;
}

// FIX: Destructure props directly instead of expecting { data }
export const RestaurantCard = ({ 
  name, 
  image, 
  rating, 
  time, 
  delivery,
  deliveryFee,
  tags = [], 
  discount 
}: RestaurantProps) => {
  
  // Handle display logic for delivery info
  const deliveryText = delivery || (deliveryFee ? `₦${deliveryFee}` : 'Free');

  return (
    <div className="min-w-[260px] bg-white dark:bg-[#151515] rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-transform cursor-pointer group snap-start">
      {/* Image Area */}
      <div className="h-32 w-full bg-gray-100 dark:bg-white/5 rounded-xl relative overflow-hidden mb-3">
        {/* Real Image or Placeholder */}
        {image ? (
            <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
        )}
        
        {discount && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm z-10">
            {discount}
          </div>
        )}
        
        {/* Logo Overlay */}
        <div className="absolute -bottom-3 left-3 w-10 h-10 bg-white dark:bg-[#222] rounded-full p-1 shadow-md z-10 flex items-center justify-center">
          <div className="w-full h-full bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-[8px] font-bold overflow-hidden">
             {image ? <img src={image} className="w-full h-full object-cover" /> : "Logo"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-2 pl-1">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-base truncate pr-2">{name}</h4>
          <div className="flex items-center gap-1 text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
            <Star className="w-3 h-3 fill-current" /> {rating || 0}
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {time}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span>{deliveryText}</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-2.5">
          {tags && tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};