"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { MapPin, Navigation, Loader2, AlertCircle, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { requestGeolocation } from "@/services/geolocation.service";
import { validateGeolocationCoordinates } from "@/services/validate-geolocation-coordinates";
import { reverseGeocode } from "@/services/reverse-geocode.service";
import {
  searchPlaces,
  geocodePlace,
  type PlaceSuggestion,
} from "@/services/maps-api.service";
import { toast } from "react-toastify";

interface LocationInputProps {
  /** Controlled input value */
  value: string;
  /** Called when the text changes (typing, clear, geolocation) */
  onValueChange: (value: string) => void;
  /** Called when a Place is resolved to coordinates */
  onLocationSelect: (
    location: google.maps.LatLngLiteral,
    address: string,
  ) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Show "Use Current Location" button */
  showGeolocation?: boolean;
  /** Extra CSS class on the wrapper */
  className?: string;
}

/**
 * Store-agnostic Google Places autocomplete input.
 * Works anywhere under <GoogleMapsProvider> — no map instance required.
 */
export function LocationInput({
  value,
  onValueChange,
  onLocationSelect,
  placeholder = "Search for a location",
  showGeolocation = false,
  className,
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const justSelectedRef = useRef(false);
  const isUserTypingRef = useRef(false);

  const debouncedValue = useDebounce(value, 300);

  // Fetch predictions from backend on debounced value
  useEffect(() => {
    if (justSelectedRef.current) return;
    if (!debouncedValue || debouncedValue.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    searchPlaces(debouncedValue).then((results) => {
      if (justSelectedRef.current) return;
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    });
  }, [debouncedValue]);

  // Select a suggestion — resolve place ID to coordinates via backend
  const handleSelect = useCallback(
    (placeId: string, description: string) => {
      justSelectedRef.current = true;
      setShowDropdown(false);
      setSuggestions([]);
      onValueChange(description);
      setGeoError(null);

      geocodePlace(placeId)
        .then((place) => {
          onLocationSelect(
            { lat: place.lat, lng: place.lng },
            description || place.address,
          );
        })
        .catch(() => {
          // Silently swallow — the text is already set
        })
        .finally(() => {
          setTimeout(() => {
            justSelectedRef.current = false;
          }, 600);
        });
    },
    [onLocationSelect, onValueChange],
  );

  // "Use Current Location"
  const handleUseCurrentLocation = useCallback(async () => {
    setIsGeolocating(true);
    setGeoError(null);
    justSelectedRef.current = true;

    try {
      const coords = await requestGeolocation();
      try {
        validateGeolocationCoordinates(coords);
      } catch (validationError) {
        const msg =
          validationError instanceof Error
            ? validationError.message
            : "Invalid geolocation result";
        setGeoError(msg);
        toast.error(msg);
        setIsGeolocating(false);
        justSelectedRef.current = false;
        return;
      }

      const { lat, lng } = coords;
      const result = await reverseGeocode(lat, lng);
      onValueChange(result.address);
      setSuggestions([]);
      setShowDropdown(false);
      onLocationSelect({ lat, lng }, result.address);
      toast.success("Location detected successfully");
    } catch (error: any) {
      const msg = formatGeolocationError(error);
      setGeoError(msg);
      toast.error(msg);
      console.warn(
        "Geolocation error (handled):",
        error?.code || error?.message || error,
      );
    } finally {
      setIsGeolocating(false);
      setTimeout(() => {
        justSelectedRef.current = false;
      }, 600);
    }
  }, [onLocationSelect, onValueChange]);

  // Close dropdown on outside click
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`relative w-full ${className || ""}`} ref={containerRef}>
      {/* Input row */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onFocus={() => {
            if (suggestions.length > 0 && !justSelectedRef.current) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 200);
          }}
          onChange={(e) => {
            isUserTypingRef.current = true;
            justSelectedRef.current = false;
            onValueChange(e.target.value);
            setGeoError(null);
            if (e.target.value.length >= 3) {
              setShowDropdown(true);
            } else {
              setShowDropdown(false);
              setSuggestions([]);
            }
          }}
          placeholder={placeholder}
          className="w-full p-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-yellow-400 focus:outline-none transition-all text-sm font-medium border border-transparent focus:border-transparent pr-24"
        />

        {/* Action buttons */}
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              onClick={() => {
                justSelectedRef.current = false;
                onValueChange("");
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

          {showGeolocation && (
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGeolocating}
              className={`
                p-1.5 rounded transition-all
                ${
                  geoError
                    ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
          )}
        </div>
      </div>

      {/* Geolocation error */}
      {geoError && (
        <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
          <AlertCircle
            size={16}
            className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-800 dark:text-red-200">{geoError}</p>
            {showGeolocation && (
              <button
                onClick={handleUseCurrentLocation}
                disabled={isGeolocating}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-2 disabled:opacity-50"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-100 dark:border-zinc-800 max-h-60 overflow-y-auto overflow-hidden ring-1 ring-black/5">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              onMouseDown={() => handleSelect(suggestion.id, suggestion.title)}
              className="p-3.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center space-x-3 transition-colors border-b border-zinc-50 dark:border-zinc-800/50 last:border-0"
            >
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400">
                <MapPin size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {suggestion.title}
                </span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {suggestion.subtitle}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────────
// Helpers
// ───────────────────────────

function formatGeolocationError(error: any): string {
  switch (error?.code) {
    case "PERMISSION_DENIED":
      return "Location permission denied. Please enable it in settings.";
    case "POSITION_UNAVAILABLE":
      return "Unable to determine your location. Please try again.";
    case "TIMEOUT":
      return "Location request timed out. Please try again.";
    case "UNSUPPORTED":
      return "Location services not supported on this device.";
    case "API_ERROR":
    case "NETWORK_ERROR":
      return error?.details || "Network error. Please check your connection.";
    case "NO_RESULTS":
      return "Could not find an address for this location.";
    case "INVALID_COORDS":
      return "Invalid location data received. Please try again.";
    default:
      return (
        error?.message ||
        error?.details ||
        "Failed to get your location. Please try again."
      );
  }
}
