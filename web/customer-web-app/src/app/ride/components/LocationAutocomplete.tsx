'use client';

import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin, Search } from "lucide-react";
import { useEffect } from "react";

interface Props {
  onSelect: (data: { address: string; lat: number; lng: number }) => void;
  autoFocus?: boolean;
  isScriptLoaded: boolean; // Ensure parent tells us when ready
}

export default function LocationAutocomplete({ onSelect, autoFocus, isScriptLoaded }: Props) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    initOnMount: false, // Wait for script
    requestOptions: {
      componentRestrictions: { country: "ng" }, 
    },
    debounce: 300,
  });

  // Initialize manually once script is loaded
  useEffect(() => {
    if (isScriptLoaded) {
        init();
    }
  }, [isScriptLoaded, init]);

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();
    
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      onSelect({ address: results[0].formatted_address, lat, lng });
    } catch (error) {
      console.error("Geocoding error: ", error);
    }
  };

  return (
    <div className="w-full relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder="Where to?"
          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-base font-medium outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:bg-gray-100"
        />
      </div>

      {status === "OK" && (
        <ul className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-60 overflow-y-auto">
          {data.map(({ place_id, description, structured_formatting }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="p-4 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors"
            >
              <div className="bg-gray-100 p-2 rounded-full shrink-0">
                <MapPin size={16} className="text-gray-500" />
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{structured_formatting.main_text}</p>
                <p className="text-xs text-gray-500 truncate">{structured_formatting.secondary_text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}