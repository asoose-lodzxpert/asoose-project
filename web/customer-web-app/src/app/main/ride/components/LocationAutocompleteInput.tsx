'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRideStore } from '../store/ride';
import { MapPin } from 'lucide-react';

interface LocationAutocompleteInputProps {
  onLocationSelect: (location: google.maps.LatLngLiteral, address: string) => void;
  type: 'pickup' | 'dropoff';
  initialValue?: string;
}

export function LocationAutocompleteInput({ onLocationSelect, type, initialValue = '' }: LocationAutocompleteInputProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  const debouncedInputValue = useDebounce(inputValue, 300);
  const { mapInstance } = useRideStore();
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | undefined>(undefined);

  useEffect(() => {
    if (mapInstance && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      placesService.current = new google.maps.places.PlacesService(mapInstance);
      sessionToken.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [mapInstance]);

  useEffect(() => {
    if (!debouncedInputValue || debouncedInputValue.length < 3 || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input: debouncedInputValue,
        componentRestrictions: { country: 'ng' },
        sessionToken: sessionToken.current,
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setIsDropdownOpen(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, [debouncedInputValue]);

  const handleSelect = (placeId: string, description: string) => {
    if (!placesService.current) return;

    setInputValue(description);
    setSuggestions([]);
    setIsDropdownOpen(false);

    placesService.current.getDetails(
      { placeId, sessionToken: sessionToken.current },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const location = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
          onLocationSelect(location, description || place.formatted_address || '');
          sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        }
      }
    );
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsDropdownOpen(true);
        }}
        placeholder={type === 'pickup' ? "Enter pickup location" : "Where to?"}
        className="w-full p-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-yellow-400 focus:outline-none transition-all text-sm font-medium border border-transparent focus:border-transparent"
      />
      
      {isDropdownOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-100 dark:border-zinc-800 max-h-60 overflow-y-auto overflow-hidden ring-1 ring-black/5">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion.place_id, suggestion.description)}
              className="p-3.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center space-x-3 transition-colors border-b border-zinc-50 dark:border-zinc-800/50 last:border-0"
            >
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400">
                <MapPin size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{suggestion.structured_formatting.main_text}</span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{suggestion.structured_formatting.secondary_text}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}