'use client';
import React from 'react';
import { X } from 'lucide-react';

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageLightbox({ imageUrl, onClose }: Props) {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>
      
      <img 
        src={imageUrl} 
        alt="Full Evidence" 
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
      />
    </div>
  );
}