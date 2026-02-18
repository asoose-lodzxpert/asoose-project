'use client';

import React from 'react';
import { AlertCircle, MapPin, Navigation, Map as MapIcon, Zap } from 'lucide-react';
import { ALERT, SEMANTIC_COLORS, TEXT_COLORS, combineClasses } from '@/lib/design-system';

/**
 * Base Error State Component
 * Provides consistent error UI across all async operations
 */
export interface ErrorStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  isRetrying?: boolean;
  hideIcon?: boolean;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
}

export function ErrorState({
  title,
  message,
  icon,
  onRetry,
  isRetrying = false,
  hideIcon = false,
  variant = 'error',
  className = '',
}: ErrorStateProps) {
  const alertClass = variant === 'error' ? ALERT.error : ALERT.info;

  return (
    <div className={combineClasses(ALERT.base, alertClass, 'flex-col', className)}>
      <div className="flex items-start gap-3">
        {!hideIcon && (
          <div className="flex-shrink-0 mt-0.5">
            {icon || <AlertCircle className="w-5 h-5" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm mt-1">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={`
            mt-3 px-3 py-1.5 rounded-md text-sm font-medium
            transition-all disabled:opacity-50
            ${
              variant === 'error'
                ? 'bg-red-200 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-900/60 disabled:hover:bg-red-200 dark:disabled:hover:bg-red-900/40'
                : 'bg-blue-200 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-900/60 disabled:hover:bg-blue-200 dark:disabled:hover:bg-blue-900/40'
            }
          `}
        >
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </button>
      )}
    </div>
  );
}

/**
 * Geolocation Error State
 * Handles permission denied, timeout, unsupported browser
 */
export interface GeolocationErrorStateProps extends Omit<ErrorStateProps, 'title' | 'message' | 'icon'> {
  errorCode?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED' | 'UNKNOWN';
}

export function GeolocationErrorState({
  errorCode = 'UNKNOWN',
  onRetry,
  isRetrying,
  className,
  ...props
}: GeolocationErrorStateProps) {
  const errorDetails = {
    PERMISSION_DENIED: {
      title: 'Location Permission Denied',
      message: 'Enable location access in your browser settings to continue.',
      icon: <Navigation className="w-5 h-5" />,
    },
    POSITION_UNAVAILABLE: {
      title: 'Location Unavailable',
      message: 'Unable to determine your location. Please try again or enter manually.',
      icon: <Navigation className="w-5 h-5" />,
    },
    TIMEOUT: {
      title: 'Location Request Timeout',
      message: 'The request took too long. Please try again.',
      icon: <Navigation className="w-5 h-5" />,
    },
    UNSUPPORTED: {
      title: 'Location Not Supported',
      message: 'Your device or browser does not support location services.',
      icon: <Navigation className="w-5 h-5" />,
    },
    UNKNOWN: {
      title: 'Location Error',
      message: 'Failed to get your location. Please try again.',
      icon: <Navigation className="w-5 h-5" />,
    },
  };

  const error = errorDetails[errorCode];

  return (
    <ErrorState
      {...error}
      {...props}
      onRetry={onRetry}
      isRetrying={isRetrying}
      className={className}
    />
  );
}

/**
 * Reverse Geocoding Error State
 * Handles address lookup failures
 */
export interface ReverseGeocodeErrorStateProps extends Omit<ErrorStateProps, 'title' | 'message' | 'icon'> {
  errorCode?: 'API_ERROR' | 'INVALID_COORDS' | 'NO_RESULTS' | 'NETWORK_ERROR' | 'UNKNOWN';
}

export function ReverseGeocodeErrorState({
  errorCode = 'UNKNOWN',
  onRetry,
  isRetrying,
  className,
  ...props
}: ReverseGeocodeErrorStateProps) {
  const errorDetails = {
    API_ERROR: {
      title: 'Maps Service Error',
      message: 'Unable to look up address. Please check your connection and try again.',
      icon: <MapIcon className="w-5 h-5" />,
    },
    INVALID_COORDS: {
      title: 'Invalid Location',
      message: 'The selected location is not valid. Please try again.',
      icon: <MapIcon className="w-5 h-5" />,
    },
    NO_RESULTS: {
      title: 'No Address Found',
      message: 'No address found for this location. Please enter manually.',
      icon: <MapIcon className="w-5 h-5" />,
    },
    NETWORK_ERROR: {
      title: 'Network Error',
      message: 'Failed to connect to maps service. Please check your internet.',
      icon: <MapIcon className="w-5 h-5" />,
    },
    UNKNOWN: {
      title: 'Address Lookup Failed',
      message: 'Unable to get address. Please try again.',
      icon: <MapIcon className="w-5 h-5" />,
    },
  };

  const error = errorDetails[errorCode];

  return (
    <ErrorState
      {...error}
      {...props}
      onRetry={onRetry}
      isRetrying={isRetrying}
      className={className}
    />
  );
}

/**
 * Ride Fetch Error State
 * Handles ride data loading failures
 */
export interface RideFetchErrorStateProps extends Omit<ErrorStateProps, 'title' | 'message' | 'icon'> {
  errorCode?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'NETWORK_ERROR' | 'SERVER_ERROR' | 'UNKNOWN';
}

export function RideFetchErrorState({
  errorCode = 'UNKNOWN',
  onRetry,
  isRetrying,
  className,
  ...props
}: RideFetchErrorStateProps) {
  const errorDetails = {
    NOT_FOUND: {
      title: 'Ride Not Found',
      message: 'This ride could not be found. It may have been cancelled or deleted.',
      icon: <Zap className="w-5 h-5" />,
    },
    UNAUTHORIZED: {
      title: 'Access Denied',
      message: 'You do not have permission to view this ride.',
      icon: <Zap className="w-5 h-5" />,
    },
    NETWORK_ERROR: {
      title: 'Connection Error',
      message: 'Unable to connect. Please check your internet and try again.',
      icon: <Zap className="w-5 h-5" />,
    },
    SERVER_ERROR: {
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again.',
      icon: <Zap className="w-5 h-5" />,
    },
    UNKNOWN: {
      title: 'Failed to Load Ride',
      message: 'Unable to retrieve ride information. Please try again.',
      icon: <Zap className="w-5 h-5" />,
    },
  };

  const error = errorDetails[errorCode];

  return (
    <ErrorState
      {...error}
      {...props}
      onRetry={onRetry}
      isRetrying={isRetrying}
      className={className}
    />
  );
}

/**
 * Map Load Error State
 * Handles map initialization failures
 */
export interface MapLoadErrorStateProps extends Omit<ErrorStateProps, 'title' | 'message' | 'icon'> {
  errorCode?: 'API_KEY_INVALID' | 'API_QUOTA' | 'NETWORK_ERROR' | 'BROWSER_ERROR' | 'UNKNOWN';
}

export function MapLoadErrorState({
  errorCode = 'UNKNOWN',
  onRetry,
  isRetrying,
  className,
  ...props
}: MapLoadErrorStateProps) {
  const errorDetails = {
    API_KEY_INVALID: {
      title: 'Maps API Not Configured',
      message: 'The maps service is not properly configured. Please contact support.',
      icon: <MapIcon className="w-5 h-5" />,
    },
    API_QUOTA: {
      title: 'API Quota Exceeded',
      message: 'The maps service is temporarily unavailable. Please try later.',
      icon: <MapIcon className="w-5 h-5" />,
    },
    NETWORK_ERROR: {
      title: 'Network Error',
      message: 'Unable to load map. Please check your internet connection.',
      icon: <MapIcon className="w-5 h-5" />,
    },
    BROWSER_ERROR: {
      title: 'Browser Not Supported',
      message: 'Your browser does not support maps. Please use a modern browser.',
      icon: <MapIcon className="w-5 h-5" />,
    },
    UNKNOWN: {
      title: 'Failed to Load Map',
      message: 'Unable to display map. Please try again.',
      icon: <MapIcon className="w-5 h-5" />,
    },
  };

  const error = errorDetails[errorCode];

  return (
    <ErrorState
      {...error}
      {...props}
      onRetry={onRetry}
      isRetrying={isRetrying}
      className={className}
    />
  );
}
