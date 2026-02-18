'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRideStore } from '../store/ride';
import { MapPin, Navigation, Loader2, AlertCircle, X } from 'lucide-react';
import { requestGeolocation } from '@/services/geolocation.service';
import { validateGeolocationCoordinates } from '@/services/validate-geolocation-coordinates';
import type { GeolocationError, GeolocationCoordinates } from '@/services/geolocation.types';
import { reverseGeocode } from '@/services/reverse-geocode.service';
import { toast } from 'react-toastify';

interface LocationAutocompleteInputProps {
  onLocationSelect: (location: google.maps.LatLngLiteral, address: string) => void;
  type: 'pickup' | 'dropoff';
  initialValue?: string;
  onFocus?: () => void;
}

export function LocationAutocompleteInput({ onLocationSelect, type, initialValue = '', onFocus }: LocationAutocompleteInputProps) {
  const [suggestions, setSuggestions] = React.useState<google.maps.places.AutocompletePrediction[]>([]);
  
  // --- FIX 1: Explicit boolean for dropdown visibility (not derived from address length) ---
  const [showDropdown, setShowDropdown] = React.useState(false);
  
  // --- FIX 2: Selection guard — blocks debounced fetches after selection ---
  const justSelectedRef = useRef(false);

  // Zustand selectors for input
  const inputValue = useRideStore((state) =>
    type === 'pickup' ? state.pickupAddress || '' : state.dropoffAddress || ''
  );
  const setInputValue = useCallback((val: string) => {
    if (type === 'pickup') {
      useRideStore.getState().setPickupAddress(val);
    } else {
      useRideStore.getState().setDropoffAddress(val);
    }
  }, [type]);

  const isGeolocating = useRideStore((state) => state.isConfiguring === type && !!state.geolocationError === false);
  const setIsGeolocating = (flag: boolean) => {
    useRideStore.getState().setIsConfiguring(flag ? type : null);
  };
  const geoError = useRideStore((state) => state.geolocationError);
  const setGeoError = (err: string | null) => {
    useRideStore.getState().setGeolocationError(err);
  };

  // --- FIX 3: Track whether input changes are from user typing (not external writes) ---
  const isUserTypingRef = useRef(false);

  useEffect(() => {
    // External value change (e.g. initialValue, reverse geocode) — do NOT open dropdown
    if (!isUserTypingRef.current) return;
    // Reset flag immediately
    isUserTypingRef.current = false;
  }, [inputValue]);

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

  // --- FIX 4: Debounced fetch only runs if user is actively typing, not after selection ---
  useEffect(() => {
    // Guard: skip if just selected or no user typing happened
    if (justSelectedRef.current) {
      return;
    }
    if (!debouncedInputValue || debouncedInputValue.length < 3 || !autocompleteService.current) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input: debouncedInputValue,
        componentRestrictions: { country: 'ng' },
        sessionToken: sessionToken.current,
      },
      (predictions, status) => {
        // Double-check guard in callback (async race protection)
        if (justSelectedRef.current) {
          return;
        }
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      }
    );
  }, [debouncedInputValue]);

  const handleSelect = (placeId: string, description: string) => {
    if (!placesService.current) return;

    // --- FIX 5: Immediately close dropdown and set selection guard ---
    justSelectedRef.current = true;
    setShowDropdown(false);
    setSuggestions([]);
    setInputValue(description);
    setGeoError(null);

    placesService.current.getDetails(
      { placeId, sessionToken: sessionToken.current },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const location = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
          onLocationSelect(location, description || place.formatted_address || '');
          sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        }
        // --- FIX 6: Release selection guard after a safe delay (longer than debounce) ---
        // This ensures the debounced value from before selection AND the reverse-geocode
        // write both pass without triggering a new fetch.
        setTimeout(() => {
          justSelectedRef.current = false;
        }, 600);
      }
    );
  };

  /**
   * Handle "Use Current Location" button click
   */
  const handleUseCurrentLocation = async () => {
    if (type !== 'pickup') return;
    setIsGeolocating(true);
    setGeoError(null);
    justSelectedRef.current = true; // Block dropdown during geolocation
    try {
      const coords = await requestGeolocation();
      try {
        validateGeolocationCoordinates(coords);
      } catch (validationError) {
        setGeoError(validationError instanceof Error ? validationError.message : 'Invalid geolocation result');
        toast.error(validationError instanceof Error ? validationError.message : 'Invalid geolocation result');
        setIsGeolocating(false);
        justSelectedRef.current = false;
        return;
      }
      const { lat, lng } = coords;
      const result = await reverseGeocode(lat, lng);
      setInputValue(result.address);
      setSuggestions([]);
      setShowDropdown(false);
      onLocationSelect({ lat, lng }, result.address);
      toast.success('Location detected successfully');
    } catch (error: any) {
      const errorMessage = formatGeolocationError(error);
      setGeoError(errorMessage);
      toast.error(errorMessage);
      console.warn('Geolocation error (handled):', error?.code || error?.message || error);
    } finally {
      setIsGeolocating(false);
      setTimeout(() => { justSelectedRef.current = false; }, 600);
    }
  };

  const formatGeolocationError = (error: any): string => {
    const code = error?.code;
    switch (code) {
      case 'PERMISSION_DENIED':
        return 'Location permission denied. Please enable it in settings.';
      case 'POSITION_UNAVAILABLE':
        return 'Unable to determine your location. Please try again.';
      case 'TIMEOUT':
        return 'Location request timed out. Please try again.';
      case 'UNSUPPORTED':
        return 'Location services not supported on this device.';
      case 'API_ERROR':
      case 'NETWORK_ERROR':
        return error?.details || 'Network error. Please check your connection.';
      case 'NO_RESULTS':
        return 'Could not find an address for this location.';
      case 'INVALID_COORDS':
        return 'Invalid location data received. Please try again.';
      default:
        return error?.message || error?.details || 'Failed to get your location. Please try again.';
    }
  };

  // --- FIX 7: Close dropdown on outside click ---
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input with "Use Current Location" Button */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onFocus={() => {
            onFocus?.();
            // Only reopen if there are existing suggestions and user didn't just select
            if (suggestions.length > 0 && !justSelectedRef.current) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            // Delay to allow click on suggestion to register before closing
            setTimeout(() => setShowDropdown(false), 200);
          }}
          onChange={(e) => {
            isUserTypingRef.current = true;
            justSelectedRef.current = false; // User is typing again — release guard
            setInputValue(e.target.value);
            setGeoError(null);
            if (e.target.value.length >= 3) {
              setShowDropdown(true);
            } else {
              setShowDropdown(false);
              setSuggestions([]);
            }
          }}
          placeholder={type === 'pickup' ? "Enter pickup location" : "Where to?"}
          className="w-full p-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-yellow-400 focus:outline-none transition-all text-sm font-medium border border-transparent focus:border-transparent pr-24"
        />

        {/* Action Buttons (only show for pickup) */}
        {type === 'pickup' && (
          <div className="absolute right-2 flex items-center gap-1">
            {/* Clear Button */}
            {inputValue && (
              <button
                onClick={() => {
                  justSelectedRef.current = false;
                  setInputValue('');
                  setSuggestions([]);
                  setShowDropdown(false);
                  setGeoError(null);
                }}
                className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors text-zinc-600 dark:text-zinc-400"
                aria-label="Clear location"
              >
                <X size={16} />
              </button>
            )}

            {/* Use Current Location Button */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGeolocating}
              className={`
                p-1.5 rounded transition-all
                ${
                  geoError
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title="Use current location"
              aria-label="Use current location"
            >
              {isGeolocating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Navigation size={18} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {geoError && (
        <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-800 dark:text-red-200">{geoError}</p>
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGeolocating}
              className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-2 disabled:opacity-50"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
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