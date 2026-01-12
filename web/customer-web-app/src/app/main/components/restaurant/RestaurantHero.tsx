// src/components/restaurant/RestaurantHero.tsx

import { ArrowLeft, Share2, Star, Clock } from 'lucide-react';
import Link from 'next/link';
// import Image from 'next/image'; // Keep commented until real images are used

interface HeroProps {
  name: string;
  // image: string; // Keep commented until real images are used
  rating: number;
  ratingCount: number;
  time: string;
  deliveryFee: string;
  tags: string[];
}

export const RestaurantHero = ({ name, rating, ratingCount, time, deliveryFee, tags }: HeroProps) => {
  return (
    <div className="relative h-[280px] w-full">
      {/* Background Image placeholder */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
        <div className="w-full h-full bg-gray-800 relative">
             {/* <Image src={image} fill className="object-cover" alt={name} priority /> */}
        </div>
      </div>

      {/* Header Buttons */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center pt-safe mt-2">
        <Link href="/dashboard" className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-transform active:scale-90">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-transform active:scale-90">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-12 text-white">
         <div className="w-14 h-14 bg-white rounded-xl p-1 mb-3 shadow-lg flex items-center justify-center text-2xl">
             😋
         </div>
         <h1 className="text-3xl font-black tracking-tight mb-1">{name}</h1>
         
         <div className="flex items-center gap-3 text-sm font-medium opacity-90 mb-3">
            <div className="flex items-center gap-1 bg-yellow-500 text-black px-1.5 py-0.5 rounded-md font-bold text-xs">
               <Star className="w-3 h-3 fill-current" />
               <span>{rating}</span>
            </div>
            <span>({ratingCount}+ ratings)</span>
            <span>•</span>
            <span>{tags.join(', ')}</span>
         </div>

         <div className="flex items-center gap-3 text-xs font-bold">
            <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                <Clock className="w-3.5 h-3.5" /> {time}
            </div>
            <div className="bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                Delivery: {deliveryFee}
            </div>
         </div>
      </div>
    </div>
  );
};