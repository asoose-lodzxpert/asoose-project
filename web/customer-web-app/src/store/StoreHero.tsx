'use client';

import { ArrowLeft, Share2, Star, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-toastify';

interface HeroProps {
  name: string;
  image?: string;
  rating: number;
  type: string; // RESTAURANT, GROCERY, etc.
  time: string;
  address: string;
}

export const StoreHero = ({ name, image, rating, type, time, address }: HeroProps) => {
  // Determine icon based on type
  const typeIcon = type === 'RESTAURANT' ? '🍔' : type === 'GROCERY' ? '🥦' : type === 'PHARMACY' ? '💊' : '🏪';
  const typeLabel = type === 'RESTAURANT' ? 'Restaurant' : type.charAt(0) + type.slice(1).toLowerCase();

  const handleShare = async () => {
    const shareData = {
      title: name,
      text: `Check out ${name} on Asoose!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        // Use native share on mobile/supported browsers
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="relative h-[280px] w-full bg-gray-900">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        {image && <img src={image} alt={name} className="w-full h-full object-cover opacity-60" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Nav */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-safe flex justify-between">
        <Link href="/main/store" className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <button 
          onClick={handleShare}
          className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 text-white">
        <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-xl flex-shrink-0">
                {typeIcon}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{typeLabel}</span>
                    <div className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                        <Star className="w-3 h-3 fill-current" /> {rating}
                    </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-2">{name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-300 font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {address}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};