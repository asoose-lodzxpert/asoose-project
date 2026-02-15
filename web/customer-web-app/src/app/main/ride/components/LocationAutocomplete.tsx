"use client";

import {
  MapPin,
  Search,
  Navigation,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

export interface LocationSelection {
  address: string;
  placeId?: string;
  lat: number; // MADE MANDATORY
  lng: number; // MADE MANDATORY
}

interface Props {
  onSelect: (data: LocationSelection) => void;
  placeholder?: string;
  showPinpoint?: boolean;
  initialValue?: string;
  isLoaded?: boolean;
}

// Utility to create safe fallback labels
const formatCoordinateLabel = (lat: number, lng: number) => 
  `Pinned Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

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
  const { isLoaded: contextLoaded, loadError } = useGoogleMaps();
  const isMapsScriptReady = propLoaded ?? contextLoaded;
  const isMounted = useRef(true);

  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);

  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);

  const debouncedInputValue = useDebounce(inputValue, 300);
  
  // 1. STABILIZED INITIALIZATION
  useEffect(() => {
    if (isMapsScriptReady && window.google?.maps?.places && !autocompleteService && isMounted.current) {
      try {
        setAutocompleteService(new google.maps.places.AutocompleteService());
        setPlacesService(new google.maps.places.PlacesService(document.createElement('div')));
        setSessionToken(new google.maps.places.AutocompleteSessionToken());
      } catch (e) {
        console.error("Google Maps Services Init Failed:", e);
        setError("Map services failed to initialize. Please refresh.");
      }
    }
  }, [isMapsScriptReady, autocompleteService]);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // 2. FETCH SUGGESTIONS WITH ERROR HANDLING
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
          componentRestrictions: { country: "ng" },
          // OPTIMIZATION: Bias towards user's rough IP location if available in future
        };

        const response = await autocompleteService.getPlacePredictions(request);

        if (isMounted.current && !abortController.signal.aborted) {
          setSuggestions(response.predictions || []);
          setError(null);
        }
      } catch (err: any) {
        if (!abortController.signal.aborted && isMounted.current) {
          console.error("Autocomplete Error:", err);
          setSuggestions([]);
          // Map specific Google errors to user-friendly messages
          if (err?.message?.includes("REQUEST_DENIED")) {
             setError("Location search is currently unavailable.");
          }
        }
      }
    };

    fetchSuggestions();
    return () => abortController.abort();
  }, [debouncedInputValue, autocompleteService, sessionToken]);

  // 3. STRICT GET_DETAILS HANDLING
  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService) {
      setError("Map service not ready. Please try again.");
      return;
    }

    const addressText = prediction.description || prediction.structured_formatting.main_text;
    setInputValue(addressText);
    setSuggestions([]);
    setIsFocused(false);
    setError(null);

    placesService.getDetails({
        placeId: prediction.place_id,
        fields: ['geometry', 'formatted_address', 'name'],
        sessionToken: sessionToken || undefined
    }, (place, status) => {
        if (!isMounted.current) return;

        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            onSelect({
                address: place.formatted_address || place.name || addressText,
                placeId: prediction.place_id,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            });
        } else {
            console.error("Place Details Failed:", status);
            setError("Could not fetch coordinates for this location. Please try another.");
            // CRITICAL FIX: Do NOT call onSelect with missing lat/lng
        }
    });

    if (window.google) {
      setSessionToken(new window.google.maps.places.AutocompleteSessionToken());
    }
  };

  // 4. ROBUST GEOLOCATION + REVERSE GEOCODE FALLBACK
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
        const { latitude, longitude } = pos.coords;

        // Try Reverse Geocoding
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (!isMounted.current) return;
            setIsLocating(false);
            setIsFocused(false);

            if (status === "OK" && results && results[0]) {
              const addressText = results[0].formatted_address;
              setInputValue(addressText);
              onSelect({
                address: addressText,
                placeId: results[0].place_id,
                lat: latitude,
                lng: longitude
              });
            } else {
              // CRITICAL FALLBACK: API Failed (Quota/Disabled) -> Use Coordinates
              console.warn("Reverse Geocoding Failed:", status);
              const fallbackAddr = formatCoordinateLabel(latitude, longitude);
              setInputValue(fallbackAddr);
              
              onSelect({ 
                address: fallbackAddr, 
                // Explicitly undefined placeId forces backend to use LatLng
                placeId: undefined, 
                lat: latitude, 
                lng: longitude 
              });
            }
          });
        } else {
          // No Google Maps Loaded -> Raw Coordinates
          setIsLocating(false);
          const fallbackAddr = formatCoordinateLabel(latitude, longitude);
          setInputValue(fallbackAddr);
          onSelect({ address: fallbackAddr, lat: latitude, lng: longitude });
        }
      },
      (err) => {
        if (isMounted.current) {
          setIsLocating(false);
          setError(err.code === 1 ? "Location permission denied." : "Unable to retrieve location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const showDropdown = isFocused && !error && (suggestions.length > 0 || (inputValue.length === 0 && showPinpoint));

  return (
    <div className="w-full relative group">
      {/* Input UI remains largely the same, logic above is the fix */}
      <div className="relative z-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-yellow-500 transition-colors" />
        <input
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setError(null); }}
          onFocus={() => setIsFocused(true)}
          disabled={!isMapsScriptReady || isLocating}
          placeholder={!isMapsScriptReady ? "Loading maps..." : isLocating ? "Locating..." : placeholder}
          className="w-full bg-transparent border-none py-3 pl-12 pr-10 text-base font-medium outline-none placeholder:text-zinc-400 dark:text-white"
        />
        {/* ... Clear button & Loader ... */}
      </div>

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs flex items-center z-50">
           <AlertCircle className="w-4 h-4 mr-2"/> {error}
        </div>
      )}

      {showDropdown && (
        <ul className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border z-50 max-h-60 overflow-y-auto">
          {inputValue.length === 0 && showPinpoint && (
            <li onMouseDown={(e) => { e.preventDefault(); handleCurrentLocation(); }} className="p-3 hover:bg-yellow-50 cursor-pointer flex items-center gap-3">
              <Navigation size={16} className="text-yellow-600" />
              <span className="text-sm font-medium">Use current location</span>
            </li>
          )}
          {suggestions.map((s) => (
             <li key={s.place_id} onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }} className="p-3 hover:bg-gray-50 cursor-pointer border-t">
                <p className="text-sm font-medium text-zinc-900">{s.structured_formatting.main_text}</p>
                <p className="text-xs text-gray-500">{s.structured_formatting.secondary_text}</p>
             </li>
          ))}
        </ul>
      )}
    </div>
  );
}