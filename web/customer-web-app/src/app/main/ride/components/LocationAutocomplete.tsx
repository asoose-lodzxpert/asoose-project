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

// FIX 1: Helper to safely handle Google's inconsistent coordinate types
// This resolves "This expression is not callable" and "not assignable to number"
const getCoordinate = (value: any): number => {
  if (typeof value === "function") {
    return value(); // Call it if it's a function
  }
  if (typeof value === "number") {
    return value; // Return it if it's already a number
  }
  return 0; // Fallback
};

interface PlacePrediction {
  toPlace: () => any;
  text: { text: string };
  mainText: { text: string };
  secondaryText: { text: string };
  placeId: string;
}

interface AutocompleteSuggestion {
  placePrediction: PlacePrediction;
}

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
  placeholder = "Search for a location",
  showPinpoint = true,
  initialValue = "",
  isLoaded: propLoaded,
}: Props) {
  const { isLoaded: contextLoaded } = useGoogleMaps();
  const isMapsScriptReady = propLoaded ?? contextLoaded;
  
  const isMounted = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const isProgrammaticUpdate = useRef(false);
  const isInitializingLibs = useRef(false);

  // State
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);

  // Loading States
  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // FIX 2: Use 'any' to bypass "Namespace has no exported member" errors
  const [placesLib, setPlacesLib] = useState<any>(null);
  const [geocodingLib, setGeocodingLib] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<any>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const debouncedInputValue = useDebounce(inputValue, 300);
  const prevInitialValueRef = useRef(initialValue);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Initialize Libraries
  useEffect(() => {
    if (isMapsScriptReady && !placesLib && isMounted.current && !isInitializingLibs.current) {
      isInitializingLibs.current = true;
      setIsLibraryLoading(true);

      Promise.all([
        google.maps.importLibrary("places"),
        google.maps.importLibrary("geocoding"),
      ])
        .then(([placesResult, geocodingResult]) => {
          if (!isMounted.current) return;
          
          // Cast to any allows us to use the library without strict type definition checks
          const places = placesResult as any;
          setPlacesLib(places);
          setSessionToken(new places.AutocompleteSessionToken());
          setGeocodingLib(geocodingResult);
          setIsLibraryLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load Google Maps libraries:", err);
          if (isMounted.current) {
            setError("Failed to load maps. Please refresh.");
            setIsLibraryLoading(false);
          }
        })
        .finally(() => {
          isInitializingLibs.current = false;
        });
    }
  }, [isMapsScriptReady, placesLib]);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation({ lat: 9.082, lng: 8.6753 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isMounted.current) {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      () => {
        if (isMounted.current) {
          setUserLocation({ lat: 9.082, lng: 8.6753 });
        }
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  // Sync Initial Value
  useEffect(() => {
    if (initialValue !== prevInitialValueRef.current) {
      isProgrammaticUpdate.current = true;
      setInputValue(initialValue);
      prevInitialValueRef.current = initialValue;
    }
  }, [initialValue]);

  // Fetch Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (isProgrammaticUpdate.current) {
        isProgrammaticUpdate.current = false;
        return; 
      }

      if (!debouncedInputValue || debouncedInputValue.length < 2) {
        if (isMounted.current) setSuggestions([]);
        return;
      }

      if (!placesLib || !sessionToken) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;

      try {
        const request = {
          input: debouncedInputValue,
          sessionToken: sessionToken,
          includedRegionCodes: ["ng"],
          ...(userLocation && {
            locationBias: {
              center: userLocation,
              radius: 50000,
            },
          }),
        };

        const { suggestions: results } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (currentController.signal.aborted || !isMounted.current) return;

        setSuggestions((results as AutocompleteSuggestion[]) || []);
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError" || currentController.signal.aborted) return;
        if (isMounted.current) setSuggestions([]);
      }
    };

    fetchSuggestions();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedInputValue, placesLib, sessionToken, userLocation]);

  // Handle Selection
  const handleSelect = async (suggestion: AutocompleteSuggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction || isSelecting) return;

    setIsSelecting(true);
    setError(null);

    const addressText = prediction.text?.text || prediction.mainText?.text || "Selected Address";
    
    isProgrammaticUpdate.current = true;
    setInputValue(addressText);
    setSuggestions([]);

    try {
      const place = prediction.toPlace();

      await place.fetchFields({
        fields: ["location", "formattedAddress", "addressComponents", "name"],
      });

      if (!isMounted.current) return;

      const location = place.location;
      if (!location) throw new Error("Location coordinates missing");

      // FIX 3: Use the helper here
      const lat = getCoordinate(location.lat);
      const lng = getCoordinate(location.lng);

      let formattedAddress = place.formattedAddress;

      if (!formattedAddress && place.addressComponents) {
        formattedAddress = place.addressComponents
          .map((component: any) => component.longText)
          .join(", ");
      }

      if (!formattedAddress) {
        formattedAddress = addressText;
      }

      onSelect({ address: formattedAddress, lat, lng });

    } catch (error: any) {
      console.error("Place Details Error:", error);
      let userMessage = "Unable to retrieve location details.";

      if (error && error.message && error.message.includes("ZERO_RESULTS")) {
        userMessage = "Location not found.";
      }

      if (isMounted.current) {
        setError(userMessage);
      }
    } finally {
      if (isMounted.current) {
        setIsSelecting(false);
        if (placesLib) {
          setSessionToken(new placesLib.AutocompleteSessionToken());
        }
      }
    }
  };

  const handleClear = () => {
    isProgrammaticUpdate.current = false;
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
      setError("Geolocation is not supported");
      return;
    }
    if (!isMapsScriptReady || !geocodingLib) {
      setError("Maps service loading...");
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
          
          isProgrammaticUpdate.current = true;
          setInputValue(address);
          setSuggestions([]); 
          setIsFocused(false);

          onSelect({ address, lat, lng });
        } catch (err) {
          if (isMounted.current) {
            setError("Unable to get address");
          }
        } finally {
          if (isMounted.current) setIsLocating(false);
        }
      },
      (error) => {
        if (!isMounted.current) return;
        setIsLocating(false);
        setError("Unable to get location");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown =
    isFocused &&
    !error &&
    (suggestions.length > 0 || (inputValue.length === 0 && showPinpoint));

  const isLoading = isLocating || isSelecting;

  return (
    <div ref={containerRef} className="w-full relative group">
      <div className="relative z-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-yellow-500 transition-colors" />

        <input
          value={inputValue}
          onChange={(e) => {
            isProgrammaticUpdate.current = false;
            setInputValue(e.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          disabled={!isMapsScriptReady || isLoading || isLibraryLoading}
          placeholder={
            !isMapsScriptReady || isLibraryLoading
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
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">{error}</p>
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
            const secondaryText = suggestion.placePrediction?.secondaryText?.text;

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
                  <p className="text-[10px] text-gray-500 truncate">{secondaryText}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}