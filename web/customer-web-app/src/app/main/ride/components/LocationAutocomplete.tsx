'use client';

import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin, Search, Navigation, Loader2, AlertCircle, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

interface Props {
  onSelect: (data: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  showPinpoint?: boolean;
  initialValue?: string;
  isLoaded?: boolean;
}

export default function LocationAutocomplete({ 
  onSelect, 
  placeholder, 
  showPinpoint = true, 
  initialValue = "",
  isLoaded: propLoaded 
}: Props) {
  // Fallback to context if prop isn't provided (backward compatibility)
  const { isLoaded: contextLoaded } = useGoogleMaps();
  const isMapsScriptReady = propLoaded ?? contextLoaded;

  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track previous initialValue to detect actual changes from parent
  const prevInitialValueRef = useRef(initialValue);
  
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    initOnMount: false,
    requestOptions: { componentRestrictions: { country: "ng" } },
    debounce: 300,
    defaultValue: initialValue,
  });

  // Initialize immediately when the script is reported ready
  useEffect(() => { 
    if (isMapsScriptReady) {
      init();
    }
  }, [isMapsScriptReady, init]);

  // Sync value ONLY when initialValue actually changes from parent
  useEffect(() => {
    if (initialValue !== prevInitialValueRef.current) {
      setValue(initialValue, false);
      prevInitialValueRef.current = initialValue;
    }
  }, [initialValue, setValue]);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    setError(null);
    
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      onSelect({ address: results[0].formatted_address, lat, lng });
    } catch (error) {
      console.error("Geocoding error: ", error);
      setError("Unable to get location details. Please try again.");
    }
  };

  const handleClear = () => {
    setValue("");
    clearSuggestions();
    setError(null);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    if (!isMapsScriptReady || !ready) {
      setError("Maps service is still loading. Please wait...");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const results = await getGeocode({ location: { lat, lng } });
          if (!results || results.length === 0) throw new Error("No address found");

          const address = results[0].formatted_address;
          setValue(address, false);
          clearSuggestions();
          onSelect({ address, lat, lng });
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setError("Unable to get address for your location");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        setError("Unable to get your location. Please try again.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  };

  return (
    <div className="w-full relative group">
      <div className="relative z-10">
        {isLocating ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 w-5 h-5 animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-yellow-500 transition-colors" />
        )}
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          disabled={!isMapsScriptReady && !isLocating}
          placeholder={!isMapsScriptReady ? "Loading maps..." : (isLocating ? "Locating..." : placeholder)}
          className="w-full bg-transparent border-none py-3 pl-12 pr-10 text-base font-medium outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {value && !isLocating && (
          <button onClick={handleClear} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-zinc-900 dark:hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 z-50 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      {!error && (status === "OK" || (ready && value.length === 0 && showPinpoint)) && (
        <ul className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 z-[100] overflow-hidden max-h-60 overflow-y-auto">
          {value.length === 0 && showPinpoint && (
            <li 
              onClick={handleCurrentLocation} 
              className="p-4 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 cursor-pointer border-b border-gray-50 dark:border-zinc-800/50 flex items-center gap-4"
            >
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full text-yellow-600">
                <Navigation size={16} fill="currentColor" />
              </div>
              <p className="font-bold text-xs text-zinc-900 dark:text-white">Use current location</p>
            </li>
          )}
          {data.map(({ place_id, description, structured_formatting }) => (
            <li 
              key={place_id} 
              onClick={() => handleSelect(description)} 
              className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-4"
            >
              <div className="bg-gray-100 dark:bg-zinc-700 p-2 rounded-full text-gray-400">
                <MapPin size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate text-zinc-900 dark:text-white">{structured_formatting.main_text}</p>
                <p className="text-[10px] text-gray-500 truncate">{structured_formatting.secondary_text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}