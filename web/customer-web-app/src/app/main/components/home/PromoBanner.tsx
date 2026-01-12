import { X, Bike, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// Type-safe interface matching backend response
interface BannerData {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
  image: string;
  type: 'PROMO' | 'AD';
  priority: number;
  isActive: boolean;
}

interface PromoBannerProps {
  banner: BannerData;
  onClose: () => void;
}

export const PromoBanner = ({ banner, onClose }: PromoBannerProps) => {
  // Don't render inactive banners
  if (!banner.isActive) {
    return null;
  }

  return (
    <section className="px-4 pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div 
        className={`w-full h-40 sm:h-48 rounded-3xl relative overflow-hidden flex items-center px-6 shadow-lg group
          ${banner.type === 'AD' 
            ? 'bg-indigo-600' 
            : 'bg-gradient-to-r from-yellow-500 to-orange-500'
          }`}
        style={banner.image ? {
          backgroundImage: `url(${banner.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {/* Overlay for better text readability when image is present */}
        {banner.image && (
          <div className="absolute inset-0 bg-black/30" />
        )}
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-20 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors"
          aria-label="Close banner"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 text-white max-w-md">
          <h2 className="text-2xl sm:text-3xl font-black mb-1">
            {banner.title}
          </h2>
          <p className="font-medium opacity-90 mb-4">
            {banner.subtitle}
          </p>
          <Link 
            href={banner.link}
            className="bg-white text-orange-600 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md inline-block hover:scale-105 transition-transform"
          >
            {banner.buttonText}
          </Link>
        </div>

        {/* Dynamic Icon based on type (only show if no background image) */}
        {!banner.image && (
          banner.type === 'AD' ? (
            <ExternalLink className="absolute right-8 bottom-8 w-24 h-24 text-white/10 -rotate-12" />
          ) : (
            <Bike className="absolute right-8 bottom-8 w-24 h-24 text-white/20 -rotate-12" />
          )
        )}
      </div>
    </section>
  );
};