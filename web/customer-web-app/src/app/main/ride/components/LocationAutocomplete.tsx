'use client';

import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin, Search, Navigation, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

interface Props {
  onSelect: (data: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  showPinpoint?: boolean;
}

export default function LocationAutocomplete({ onSelect, placeholder, showPinpoint = true }: Props) {
  const { isLoaded } = useGoogleMaps();
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
  });

  useEffect(() => { 
    if (isLoaded) {
      init();
    }
  }, [isLoaded, init]);

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

  const handleCurrentLocation = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    // Check if Google Maps is ready
    if (!isLoaded || !ready) {
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
          
          if (!results || results.length === 0) {
            throw new Error("No address found for this location");
          }

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
        
        // Handle specific geolocation errors
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Location permission denied. Please enable location access in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("Location information unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            setError("Location request timed out. Please try again.");
            break;
          default:
            setError("Unable to get your location. Please try again.");
        }
      },
      { 
        enableHighAccuracy: false, // Changed to false for faster response
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 10000 // Allow 10 second old position for faster response
      }
    );
  };

  return (
    <div className="w-full relative">
      <div className="relative z-10">
        {isLocating ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500 w-5 h-5 animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        )}
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          disabled={!ready || isLocating}
          placeholder={isLocating ? "Locating..." : placeholder}
          className="w-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-100 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-[110%] left-0 right-0 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3 z-[100] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      {/* Dropdown */}
      {!error && (status === "OK" || (ready && value.length === 0 && showPinpoint)) && (
        <ul className="absolute top-[110%] left-0 right-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 z-[100] overflow-hidden max-h-60 overflow-y-auto">
          {value.length === 0 && showPinpoint && (
            <li 
              onClick={handleCurrentLocation} 
              disabled={isLocating || !ready}
              className="p-4 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 cursor-pointer border-b border-gray-50 dark:border-zinc-800/50 flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full text-yellow-600">
                <Navigation size={16} fill="currentColor" />
              </div>
              <p className="font-bold text-xs">Pinpoint current location</p>
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
                <p className="font-bold text-xs truncate">{structured_formatting.main_text}</p>
                <p className="text-[10px] text-gray-500 truncate">{structured_formatting.secondary_text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}