'use client';

import React, { useState, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle, Navigation } from 'lucide-react';
import { requestGeolocation } from '@/services/geolocation.service';
import type { GeolocationCoordinates } from '@/services/geolocation.types';
import { reverseGeocode, formatGeocodeError } from '@/services/reverse-geocode.service';
import type { ReverseGeocodeResult } from '@/services/reverse-geocode.service';
import type { GeolocationError } from '@/services/geolocation.types';

export interface LocationInputProps {
  value: string;
  onChange: (address: string, details?: ReverseGeocodeResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  onError?: (error: string) => void;
}

interface LocationInputState {
  isLoading: boolean;
  error: string | null;
  selectedLocation?: ReverseGeocodeResult;
}

export default function LocationInput({
  value,
  onChange,
  placeholder = 'Enter location',
  label = 'Location',
  required = false,
  disabled = false,
  onError,
}: LocationInputProps) {
  const [state, setState] = useState<LocationInputState>({
    isLoading: false,
    error: null,
  });

  /**
   * Handle manual input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      setState((prev) => ({ ...prev, error: null }));
    },
    [onChange]
  );

  /**
   * Get current location and reverse geocode
   */
  const handleUseCurrentLocation = useCallback(async () => {
    setState({ isLoading: true, error: null });

    try {
      // Step 1: Get geolocation
      const { lat, lng } = await requestGeolocation() as GeolocationCoordinates;

      // Step 2: Reverse geocode to address
      const result = await reverseGeocode(lat, lng);

      // Step 3: Update state and parent
      setState({
        isLoading: false,
        error: null,
        selectedLocation: result,
      });
      onChange(result.address, result);
    } catch (error) {
      const errorMessage = formatLocationError(error as GeolocationError);
      setState({
        isLoading: false,
        error: errorMessage,
      });
      onError?.(errorMessage);
    }
  }, [onChange, onError]);

  /**
   * Clear location and errors
   */
  const handleClear = useCallback(() => {
    onChange('');
    setState({
      isLoading: false,
      error: null,
      selectedLocation: undefined,
    });
  }, [onChange]);

  /**
   * Retry after error
   */
  const handleRetry = useCallback(async () => {
    await handleUseCurrentLocation();
  }, [handleUseCurrentLocation]);

  const hasError = state.error !== null;
  const showSubtitle = state.selectedLocation && !value.includes(',');

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Main Input */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled || state.isLoading}
            className={`
              w-full pl-10 pr-40 py-2 rounded-lg border-2 transition-colors
              ${
                hasError
                  ? 'border-red-500 focus:border-red-600 focus:outline-none'
                  : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none'
              }
              bg-white dark:bg-gray-900
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:opacity-50
            `}
          />

          {/* Action Buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            {/* Loading Indicator */}
            {state.isLoading && (
              <button
                type="button"
                disabled
                className="p-1.5 text-blue-500 dark:text-blue-400"
                aria-label="Loading location"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
              </button>
            )}

            {/* Clear Button */}
            {!state.isLoading && value && (
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                aria-label="Clear location"
              >
                ✕
              </button>
            )}

            {/* Use Current Location Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={disabled || state.isLoading}
              className={`
                p-1.5 rounded transition-colors disabled:opacity-50
                ${
                  hasError
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }
              `}
              aria-label="Use current location"
              title="Use current location"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Subtitle: City, State */}
        {showSubtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {[state.selectedLocation?.city, state.selectedLocation?.state]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-800 dark:text-red-200">{state.error}</p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={state.isLoading}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-2 disabled:opacity-50"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Format location error for display
 */
function formatLocationError(error: GeolocationError): string {
  switch (error.code) {
    case 'PERMISSION_DENIED':
      return 'Location permission denied. Please enable it in settings and try again.';
    case 'POSITION_UNAVAILABLE':
      return 'Unable to determine your location. Please try again or enter address manually.';
    case 'TIMEOUT':
      return 'Location request timed out. Please try again.';
    case 'UNSUPPORTED':
      return 'Location services not available on this device.';
    default:
      return error.details || 'Failed to get location. Please try again.';
  }
}
