import { Star, Clock } from 'lucide-react';

interface RestaurantProps {
  name: string;
  image?: string; // Optional real image URL
  rating: number;
  time: string;
  delivery: string;
  tags: string[];
  discount?: string | null;
}

export const RestaurantCard = ({ data }: { data: RestaurantProps }) => {
  return (
    <div className="min-w-[260px] bg-white dark:bg-[#151515] rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-transform cursor-pointer group snap-start">
      {/* Image Area */}
      <div className="h-32 w-full bg-gray-100 dark:bg-white/5 rounded-xl relative overflow-hidden mb-3">
        {/* Placeholder for actual image */}
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse group-hover:scale-105 transition-transform duration-700"></div>
        
        {data.discount && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm z-10">
            {data.discount}
          </div>
        )}
        
        {/* Logo Overlay */}
        <div className="absolute -bottom-3 left-3 w-10 h-10 bg-white dark:bg-[#222] rounded-full p-1 shadow-md z-10 flex items-center justify-center">
          <div className="w-full h-full bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-[8px] font-bold">
            Logo
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-2 pl-1">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-base truncate pr-2">{data.name}</h4>
          <div className="flex items-center gap-1 text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
            <Star className="w-3 h-3 fill-current" /> {data.rating}
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {data.time}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span>{data.delivery}</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-2.5">
          {data.tags.map(tag => (
            <span key={tag} className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};