'use client';

import React, { useState } from 'react';
import { ArrowLeft, Search, MapPin, Home, Briefcase, Star, Clock } from 'lucide-react';

interface SearchOverlayProps {
  onBack: () => void;
  onSelect: (place: { name: string; lat: number; lng: number }) => void;
  currentQuery: string;
}

export default function SearchOverlay({ onBack, onSelect, currentQuery }: SearchOverlayProps) {
  const [query, setQuery] = useState(currentQuery);

  // Mock Data
  const recentPlaces = [
    { id: 1, name: 'Oak Street Mall', address: '456 Oak Ave, Brooklyn, NY', dist: '2.1 mi' },
    { id: 2, name: 'Central Park', address: '59th St, New York, NY', dist: '3.5 mi' },
    { id: 3, name: 'Brooklyn Bridge', address: 'Brooklyn Bridge, NY', dist: '1.8 mi' },
  ];

  const savedPlaces = [
    { id: 'home', name: 'Home', address: '123 Main St, Brooklyn, NY', icon: <Home size={20} className="fill-white text-white" />, color: 'bg-emerald-500', dist: '0.5 mi' },
    { id: 'work', name: 'Work', address: '789 Business Plaza, New York, NY', icon: <Briefcase size={20} className="fill-white text-white" />, color: 'bg-amber-700', dist: '4.2 mi' },
    { id: 'gym', name: 'Gym', address: '456 Fitness Center, Brooklyn, NY', icon: <Star size={20} className="fill-white text-white" />, color: 'bg-yellow-400', dist: '1.2 mi' },
  ];

  return (
    <div className="flex flex-col h-full bg-white font-sans animate-in slide-in-from-bottom-10 duration-200">
      
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-center relative">
        <button 
          onClick={onBack} 
          className="absolute left-4 p-2 rounded-full hover:bg-gray-100 transition"
        >
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Where to?</h1>
      </div>

      {/* Input Section */}
      <div className="px-5 py-4">
        <div className="relative shadow-sm">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
             {/* Yellow/Blue Search Icon Mock */}
            <Search className="w-5 h-5 text-sky-500" strokeWidth={3} />
          </div>
          <input
            autoFocus
            type="text"
            placeholder="Search destination"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white border-2 border-yellow-400 rounded-xl py-3.5 pl-12 pr-4 text-lg text-gray-800 placeholder:text-gray-400 outline-none focus:ring-4 focus:ring-yellow-400/20 transition-all"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto">
        
        {/* RECENT */}
        <div className="px-5 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Recent</div>
        {recentPlaces.map((place) => (
          <button 
            key={place.id}
            onClick={() => onSelect({ name: place.name, lat: 40.7, lng: -74.0 })} // Mock coords
            className="w-full flex items-center px-5 py-3 hover:bg-gray-50 transition active:bg-gray-100"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mr-4 text-gray-500">
              <Clock size={20} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-bold text-gray-900 text-base">{place.name}</h3>
              <p className="text-sm text-gray-500 truncate">{place.address}</p>
            </div>
            <span className="text-sm text-gray-400 font-medium ml-2">{place.dist}</span>
          </button>
        ))}

        <div className="h-px bg-gray-100 mx-5 my-2" />

        {/* SAVED PLACES */}
        <div className="px-5 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Saved Places</div>
        {savedPlaces.map((place) => (
          <button 
            key={place.id}
            onClick={() => onSelect({ name: place.name, lat: 40.7, lng: -74.0 })}
            className="w-full flex items-center px-5 py-3 hover:bg-gray-50 transition active:bg-gray-100"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-4 ${place.color}`}>
              {place.icon}
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="font-bold text-gray-900 text-base">{place.name}</h3>
              <p className="text-sm text-gray-500 truncate">{place.address}</p>
            </div>
            <span className="text-sm text-gray-400 font-medium ml-2">{place.dist}</span>
          </button>
        ))}
      </div>
    </div>
  );
}