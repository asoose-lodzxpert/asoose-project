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

// Helper to safely extract coordinates from API response
// Handles both function-based (.lat()) and property-based (.lat) versions
const getCoordinate = (value: number | (() => number) | undefined): number => {
  if (value === undefined) return 0;
  if (typeof value === "function") return value();
  return value;
};

// Minimal type definitions to avoid dependency on specific @types versions
interface PlacePrediction {
  toPlace: () => any; // Returns a Place object
  text: { text: string };
  mainText: { text: string };
  secondaryText: { text: string };
  placeId: string;
}

interface AutocompleteSuggestion {
  placePrediction: PlacePrediction;
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
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);

  // Loading States
  const [isLocating, setIsLocating] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Google Maps Objects (Typed as 'any' to fix namespace errors)
  const [placesLib, setPlacesLib] = useState<any>(null);
  const [geocodingLib, setGeocodingLib] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<any>(null);

  const debouncedInputValue = useDebounce(inputValue, 300);
  const prevInitialValueRef = useRef(initialValue);

  // 0. Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 1. Initialize Libraries
  useEffect(() => {
    if (isMapsScriptReady && !placesLib && isMounted.current) {
      google.maps.importLibrary("places").then((lib) => {
        if (!isMounted.current) return;
        setPlacesLib(lib);
        setSessionToken(new (lib as any).AutocompleteSessionToken());
      });
      google.maps.importLibrary("geocoding").then((lib) => {
        if (!isMounted.current) return;
        setGeocodingLib(lib);
      });
    }
  }, [isMapsScriptReady, placesLib]);

  // 2. Sync Initial Value
  useEffect(() => {
    if (initialValue !== prevInitialValueRef.current) {
      setInputValue(initialValue);
      prevInitialValueRef.current = initialValue;
    }
  }, [initialValue]);

  // 3. Fetch Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!debouncedInputValue || debouncedInputValue.length < 2) {
        if (isMounted.current) setSuggestions([]);
        return;
      }

      if (!placesLib || !sessionToken) return;

      try {
        const request = {
          input: debouncedInputValue,
          sessionToken: sessionToken,
          includedRegionCodes: ["ng"], // Restrict to Nigeria
        };

        // Use 'any' cast to bypass strict library type check
        const { suggestions: results } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request,
          );

        if (isMounted.current) {
          setSuggestions((results as AutocompleteSuggestion[]) || []);
          setError(null);
        }
      } catch (err) {
        console.error("Autocomplete Error:", err);
      }
    };

    fetchSuggestions();
  }, [debouncedInputValue, placesLib, sessionToken]);

  // 4. Handle Selection
  const handleSelect = async (suggestion: AutocompleteSuggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    if (isSelecting) return;

    const addressText =
      prediction.text?.text || prediction.mainText?.text || "Selected Address";
    setInputValue(addressText);
    setSuggestions([]);
    setIsFocused(false);
    setError(null);
    setIsSelecting(true);

    try {
      const place = prediction.toPlace();

      await place.fetchFields({ fields: ["location", "formattedAddress"] });

      if (!isMounted.current) return;

      const location = place.location;
      if (!location) throw new Error("Location coordinates missing");

      // FIX: Use helper to extract strictly typed numbers
      const lat = getCoordinate(location.lat);
      const lng = getCoordinate(location.lng);
      
      const formattedAddress = place.formattedAddress || addressText;

      onSelect({ address: formattedAddress, lat, lng });

      if (placesLib) {
        setSessionToken(new placesLib.AutocompleteSessionToken());
      }
    } catch (error) {
      console.error("Place Details Error:", error);
      if (isMounted.current) {
        setError("Unable to retrieve details. Please try again.");
      }
    } finally {
      if (isMounted.current) setIsSelecting(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    setError(null);
    setIsFocused(true);
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
        if (!isMounted.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;

        try {
          const geocoder = new geocodingLib.Geocoder();
          const response = await geocoder.geocode({ location: { lat, lng } });

          if (!isMounted.current) return;

          if (!response.results || response.results.length === 0) {
            throw new Error("No address found");
          }

          const address = response.results[0].formatted_address;
          setInputValue(address);
          setIsFocused(false);
          onSelect({ address, lat, lng });
        } catch (err) {
          console.error("Reverse Geocoding Error:", err);
          if (isMounted.current)
            setError("Unable to get address for your location");
        } finally {
          if (isMounted.current) setIsLocating(false);
        }
      },
      (error) => {
        if (isMounted.current) {
          setIsLocating(false);
          setError("Unable to get your location. Please check permissions.");
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 },
    );
  };

  const showDropdown =
    isFocused &&
    !error &&
    (suggestions.length > 0 || (inputValue.length === 0 && showPinpoint));

  const isLoading = isLocating || isSelecting;

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
          disabled={!isMapsScriptReady || isLoading}
          placeholder={
            !isMapsScriptReady
              ? "Loading maps..."
              : isLoading
                ? "Retrieving location..."
                : placeholder
          }
          className="w-full bg-transparent border-none py-3 pl-12 pr-10 text-base font-medium outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />

        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isLoading ? (
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

      {showDropdown && !isLoading && (
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
            const mainText = suggestion.placePrediction?.mainText?.text;
            const secondaryText =
              suggestion.placePrediction?.secondaryText?.text;

            if (!mainText) return null;

            return (
              <li
                key={suggestion.placePrediction?.placeId || index}
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
