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

interface Props {
  onSelect: (data: { address: string; lat: number; lng: number }) => void;
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

  // State
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Visibility State
  const [isFocused, setIsFocused] = useState(false);

  // Google Maps Objects
  const [placesLib, setPlacesLib] = useState<any>(null);
  const [geocodingLib, setGeocodingLib] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<any>(null);

  // Debounced input for API calls
  const debouncedInputValue = useDebounce(inputValue, 300);
  const prevInitialValueRef = useRef(initialValue);

  // 1. Initialize Libraries (New Places API)
  useEffect(() => {
    if (isMapsScriptReady && !placesLib) {
      google.maps.importLibrary("places").then((lib) => {
        const places = lib as any;
        setPlacesLib(places);
        setSessionToken(new places.AutocompleteSessionToken());
      });
      google.maps
        .importLibrary("geocoding")
        .then((lib) => setGeocodingLib(lib));
    }
  }, [isMapsScriptReady, placesLib]);

  // 2. Sync Initial Value
  useEffect(() => {
    if (initialValue !== prevInitialValueRef.current) {
      setInputValue(initialValue);
      prevInitialValueRef.current = initialValue;
    }
  }, [initialValue]);

  // 3. Fetch Suggestions (New API)
  useEffect(() => {
    const fetchSuggestions = async () => {
      // If input is empty, clear suggestions (but don't hide dropdown if focused)
      if (!debouncedInputValue || debouncedInputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      if (!placesLib) return;

      try {
        const request = {
          input: debouncedInputValue,
          sessionToken: sessionToken,
          includedRegionCodes: ["ng"], // Restrict to Nigeria
        };

        const { suggestions: results } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request,
          );
        setSuggestions(results || []);
        setError(null);
      } catch (err) {
        console.error("Autocomplete Error:", err);
      }
    };

    fetchSuggestions();
  }, [debouncedInputValue, placesLib, sessionToken]);

  // 4. Handle Selection
  const handleSelect = async (suggestion: any) => {
    const placeId = suggestion.placePrediction?.placeId;

    if (!placeId) {
      console.error("No place ID found");
      return;
    }

    const addressText =
      suggestion.placePrediction?.text?.text ||
      suggestion.placePrediction?.mainText?.text ||
      "Selected Address";

    setInputValue(addressText);
    setIsFocused(false);
    setError(null);

    try {
      const place = new placesLib.Place({ id: placeId });
      await place.fetchFields({ fields: ["location", "formattedAddress"] });

      const lat = place.location.lat();
      const lng = place.location.lng();
      const formattedAddress = place.formattedAddress;

      onSelect({ address: formattedAddress, lat, lng });

      if (placesLib) {
        setSessionToken(new placesLib.AutocompleteSessionToken());
      }
    } catch (error) {
      console.error("Place Details Error:", error);
      setError("Unable to get location details. Please try again.");
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    setError(null);
    setIsFocused(true); // Keep focus to show "Use Current Location"
    if (placesLib) {
      setSessionToken(new placesLib.AutocompleteSessionToken());
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    if (!isMapsScriptReady || !geocodingLib) {
      setError("Maps service is still loading...");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const geocoder = new geocodingLib.Geocoder();
          const response = await geocoder.geocode({ location: { lat, lng } });

          if (!response.results || response.results.length === 0) {
            throw new Error("No address found");
          }

          const address = response.results[0].formatted_address;
          setInputValue(address);
          setIsFocused(false);
          onSelect({ address, lat, lng });
        } catch (err) {
          console.error("Reverse Geocoding Error:", err);
          setError("Unable to get address for your location");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        setError("Unable to get your location. Please try again.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 },
    );
  };

  // Logic to determine if dropdown should show
  const showDropdown =
    isFocused &&
    !error &&
    (suggestions.length > 0 || (inputValue.length === 0 && showPinpoint));

  return (
    <div className="w-full relative group">
      <div className="relative z-10">
        {isLocating ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 w-5 h-5 animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-yellow-500 transition-colors" />
        )}

        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay hiding to allow click event to register on the list items
            setTimeout(() => setIsFocused(false), 200);
          }}
          disabled={!isMapsScriptReady && !isLocating}
          placeholder={
            !isMapsScriptReady
              ? "Loading maps..."
              : isLocating
                ? "Locating..."
                : placeholder
          }
          className="w-full bg-transparent border-none py-3 pl-12 pr-10 text-base font-medium outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />

        {inputValue && !isLocating && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-zinc-900 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 z-50 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">
            {error}
          </p>
        </div>
      )}

      {showDropdown && (
        <ul className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 z-[100] overflow-hidden max-h-60 overflow-y-auto">
          {/* OPTION 1: Use Current Location (Shows when empty) */}
          {inputValue.length === 0 && showPinpoint && (
            <li
              onMouseDown={handleCurrentLocation}
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

          {/* OPTION 2: Search Suggestions */}
          {suggestions.map((suggestion, index) => {
            const mainText = suggestion.placePrediction?.mainText?.text;
            const secondaryText =
              suggestion.placePrediction?.secondaryText?.text;

            return (
              <li
                key={suggestion.placePrediction?.placeId || index}
                onMouseDown={() => handleSelect(suggestion)}
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
