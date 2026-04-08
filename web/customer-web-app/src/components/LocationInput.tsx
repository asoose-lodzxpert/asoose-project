'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MapPin, Loader2, AlertCircle, Navigation, Search, X } from 'lucide-react';
import { requestGeolocation } from '@/services/geolocation.service';
import type { GeolocationCoordinates } from '@/services/geolocation.types';
import { reverseGeocode, formatGeocodeError } from '@/services/reverse-geocode.service';
import type { ReverseGeocodeResult } from '@/services/reverse-geocode.service';
import type { GeolocationError } from '@/services/geolocation.types';
import { searchPlaces, geocodePlace, PlaceSuggestion, PlaceLocation } from '@/services/maps-api.service';

export interface LocationInputProps {
  value: string;
  onChange: (address: string, details?: ReverseGeocodeResult & { lat?: number, lng?: number }) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  onError?: (error: string) => void;
}

interface LocationInputState {
  isLoading: boolean;
  error: string | null;
  suggestions: PlaceSuggestion[];
  showSuggestions: boolean;
}

export default function LocationInput({
  value,
  onChange,
  placeholder = 'Enter business address...',
  label = 'Location',
  required = false,
  disabled = false,
  onError,
}: LocationInputProps) {
  const [state, setState] = useState<LocationInputState>({
    isLoading: false,
    error: null,
    suggestions: [],
    showSuggestions: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, showSuggestions: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setState(prev => ({ ...prev, error: null, showSuggestions: true }));

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (newValue.length >= 3) {
      debounceTimer.current = setTimeout(async () => {
        const results = await searchPlaces(newValue);
        setState(prev => ({ ...prev, suggestions: results }));
      }, 500);
    } else {
      setState(prev => ({ ...prev, suggestions: [] }));
    }
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setState(prev => ({ ...prev, isLoading: true, showSuggestions: false }));
    onChange(suggestion.title + ", " + suggestion.subtitle);

    try {
      const details = await geocodePlace(suggestion.id);
      onChange(details.address, {
        address: details.address,
        lat: details.lat,
        lng: details.lng,
        city: "", // Backend doesn't split these easily
        state: "",
        country: "",
      });
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (err) {
      setState(prev => ({ ...prev, isLoading: false, error: "Failed to resolve location details." }));
    }
  };

  const handleUseCurrentLocation = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { lat, lng } = await requestGeolocation() as GeolocationCoordinates;
      const result = await reverseGeocode(lat, lng);
      setState(prev => ({ ...prev, isLoading: false }));
      onChange(result.address, { ...result, lat, lng });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Location blocked or unavailable";
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      onError?.(errorMessage);
    }
  };

  const handleClear = () => {
    onChange('');
    setState(prev => ({ ...prev, suggestions: [], error: null }));
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative group">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-yellow-500 transition-colors pointer-events-none" />
        
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || state.isLoading}
          className={`
            w-full pl-12 pr-24 py-3.5 rounded-2xl border transition-all text-sm
            ${state.error 
              ? 'border-red-500/50 bg-red-500/5 focus:ring-red-500/20' 
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 focus:ring-yellow-500/20 focus:border-yellow-500'
            }
            dark:text-white placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-4
            disabled:opacity-50
          `}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {state.isLoading && <Loader2 className="w-5 h-5 animate-spin text-yellow-500 mr-2" />}
          
          {value && !state.isLoading && (
            <button
              onClick={handleClear}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={18} />
            </button>
          )}

          <button
            onClick={handleUseCurrentLocation}
            disabled={disabled || state.isLoading}
            className="p-2 text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 rounded-lg transition-colors disabled:opacity-50"
            title="Use current location"
          >
            <Navigation size={20} />
          </button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {state.showSuggestions && state.suggestions.length > 0 && (
        <div className="absolute z-[100] mt-2 w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-3xl animate-in fade-in slide-in-from-top-2 duration-200">
          {state.suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5 last:border-0 flex items-start gap-3 transition-colors"
            >
              <Search size={16} className="text-gray-400 mt-1 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate dark:text-white">{suggestion.title}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{suggestion.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {state.error && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5 font-medium ml-1">
          <AlertCircle size={14} />
          {state.error}
        </p>
      )}
    </div>
  );
}
