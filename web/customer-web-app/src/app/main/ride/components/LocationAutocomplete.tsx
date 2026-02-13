"use client";

import {
  MapPin,
  Search,
  Navigation,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

// Define the exact payload the parent component will receive
export interface LocationSelection {
  address: string; // Used for UI display
  placeId?: string; // Standard Autocomplete Selection
  lat?: number; // ONLY used for "Current Location" fallback
  lng?: number; // ONLY used for "Current Location" fallback
}

interface Props {
  onSelect: (data: LocationSelection) => void;
  placeholder?: string;
  showPinpoint?: boolean;
  initialValue?: string;
  isLoaded?: boolean;
}

// Helper to debounce API calls
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function LocationAutocomplete({
  onSelect,
  placeholder,
  showPinpoint = true,
  initialValue = "",
  isLoaded: propLoaded,
}: Props) {
  const { isLoaded: contextLoaded } = useGoogleMaps();
  const isMapsScriptReady = propLoaded ?? contextLoaded;
  const isMounted = useRef(true);

  // State
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);

  // Loading & UX States
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Strictly Typed Google Maps Services
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);

  const debouncedInputValue = useDebounce(inputValue, 300);
  const prevInitialValueRef = useRef(initialValue);

  // 0. Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 1. Initialize Autocomplete Libraries
  useEffect(() => {
    if (isMapsScriptReady && !autocompleteService && isMounted.current && window.google) {
      setAutocompleteService(new google.maps.places.AutocompleteService());
      setSessionToken(new google.maps.places.AutocompleteSessionToken());
    }
  }, [isMapsScriptReady, autocompleteService]);

  // 2. Sync Initial Value
  useEffect(() => {
    if (initialValue !== prevInitialValueRef.current) {
      setInputValue(initialValue);
      prevInitialValueRef.current = initialValue;
    }
  }, [initialValue]);

  // 3. Fetch Suggestions (With Race-Condition Prevention)
  useEffect(() => {
    const abortController = new AbortController();

    const fetchSuggestions = async () => {
      if (!debouncedInputValue || debouncedInputValue.length < 2) {
        if (isMounted.current) setSuggestions([]);
        return;
      }

      if (!autocompleteService || !sessionToken) return;

      try {
        const request: google.maps.places.AutocompletionRequest = {
          input: debouncedInputValue,
          sessionToken: sessionToken,
          componentRestrictions: { country: "ng" }, // Restrict to Nigeria
        };

        const response = await autocompleteService.getPlacePredictions(request);

        if (isMounted.current && !abortController.signal.aborted) {
          setSuggestions(response.predictions || []);
          setError(null);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Autocomplete Error:", err);
          if (isMounted.current) setSuggestions([]);
        }
      }
    };

    fetchSuggestions();
    return () => abortController.abort(); // Cancel stale network state
  }, [debouncedInputValue, autocompleteService, sessionToken]);

  // 4. Handle Selection (Handoff to Backend)
  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const addressText = prediction.description || prediction.structured_formatting.main_text;
    
    setInputValue(addressText);
    setSuggestions([]);
    setIsFocused(false);
    setError(null);

    // SECURE HANDOFF: Pass placeId to the backend. No client-side coordinates.
    onSelect({
      address: addressText,
      placeId: prediction.place_id,
    });

    // Refresh token for next billing session
    if (window.google) {
      setSessionToken(new window.google.maps.places.AutocompleteSessionToken());
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    setError(null);
    setIsFocused(true);
    if (window.google) {
      setSessionToken(new window.google.maps.places.AutocompleteSessionToken());
    }
  };

  // 5. Handle Current Location Fallback
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isMounted.current) return;
        
        setInputValue("Current Location");
        setIsFocused(false);
        setIsLocating(false);

        // SECURE HANDOFF: Pass raw GPS. Backend MUST reverse-geocode this.
        onSelect({ 
          address: "Current Location", 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude 
        });
      },
      (error) => {
        if (isMounted.current) {
          setIsLocating(false);
          setError("Unable to get your location. Please check permissions.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const showDropdown =
    isFocused &&
    !error &&
    (suggestions.length > 0 || (inputValue.length === 0 && showPinpoint));

  return (
    <div className="w-full relative group">
      <div className="relative z-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-yellow-500 transition-colors" />

        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => {
              if (isMounted.current) setIsFocused(false);
            }, 200);
          }}
          disabled={!isMapsScriptReady || isLocating}
          placeholder={
            !isMapsScriptReady
              ? "Loading maps..."
              : isLocating
                ? "Retrieving location..."
                : placeholder
          }
          className="w-full bg-transparent border-none py-3 pl-12 pr-10 text-base font-medium outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />

        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isLocating ? (
            <Loader2 className="text-yellow-500 w-5 h-5 animate-spin" />
          ) : inputValue ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              type="button"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">
            {error}
          </p>
        </div>
      )}

      {showDropdown && !isLocating && (
        <ul className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 z-[100] overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          {inputValue.length === 0 && showPinpoint && (
            <li
              onMouseDown={(e) => {
                e.preventDefault();
                handleCurrentLocation();
              }}
              className="p-4 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 cursor-pointer border-b border-gray-50 dark:border-zinc-800/50 flex items-center gap-4 transition-colors"
            >
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full text-yellow-600">
                <Navigation size={16} fill="currentColor" />
              </div>
              <p className="font-bold text-xs text-zinc-900 dark:text-white">
                Use current location
              </p>
            </li>
          )}

          {suggestions.map((suggestion, index) => {
            const mainText = suggestion.structured_formatting?.main_text || suggestion.description;
            const secondaryText = suggestion.structured_formatting?.secondary_text;

            if (!mainText) return null;

            return (
              <li
                key={suggestion.place_id || index}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(suggestion);
                }}
                className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-4 transition-colors"
              >
                <div className="bg-gray-100 dark:bg-zinc-700 p-2 rounded-full text-gray-400">
                  <MapPin size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate text-zinc-900 dark:text-white">
                    {mainText}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {secondaryText}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}