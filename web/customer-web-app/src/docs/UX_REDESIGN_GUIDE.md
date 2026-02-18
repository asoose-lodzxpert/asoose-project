# UX Redesign: Component Implementation Guide

## Overview

This guide explains how to use the new components and services for the redesigned ride request/details page. The new architecture enforces design system consistency and provides complete error handling coverage.

## Architecture Layers

```
UI Components (user sees)
    ↓
Sidebar + LocationInput + ErrorStates
    ↓
Geolocation + Reverse Geocoding Services
    ↓
Ride Service (API calls)
    ↓
Mapper (BackendRide → ViewModel)
    ↓
Google Maps API + Backend API
```

## Component Usage Examples

### 1. LocationInput Component

Standalone location selector with geolocation integration.

```tsx
'use client';
import { useState } from 'react';
import LocationInput from '@/components/LocationInput';
import type { ReverseGeocodeResult } from '@/services/reverse-geocode.service';

export default function MyComponent() {
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState<ReverseGeocodeResult>();
  const [error, setError] = useState('');

  const handleLocationChange = (
    newAddress: string,
    geocodeDetails?: ReverseGeocodeResult
  ) => {
    setAddress(newAddress);
    setDetails(geocodeDetails);
    setError(''); // Clear error on manual input
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  return (
    <div className="p-4">
      <LocationInput
        value={address}
        onChange={handleLocationChange}
        label="Pickup Location"
        placeholder="Enter pickup address"
        required
        onError={handleError}
      />

      {/* Show selected location details */}
      {details && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          📍 {details.city}, {details.state}
        </div>
      )}

      {/* Manual error display (if needed) */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
```

### 2. Sidebar Component for Ride Request

Complete page layout with sidebar and map area.

```tsx
'use client';
import { useState } from 'react';
import Sidebar, { SidebarSection, SidebarDivider } from '@/components/Sidebar';
import LocationInput from '@/components/LocationInput';
import { PrimaryButton, Card, Text } from '@/components/ui';
import type { ReverseGeocodeResult } from '@/services/reverse-geocode.service';

export default function RideRequestPage() {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [estimate, setEstimate] = useState<{ fare: string; duration: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestRide = async () => {
    if (!pickup || !dropoff) {
      alert('Please enter both locations');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call ride request API
      const response = await fetch('/api/rides/create', {
        method: 'POST',
        body: JSON.stringify({ picupLocation: pickup, dropoffLocation: dropoff }),
      });
      // Handle response...
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex">
      {/* Map container (appears behind/right of sidebar on desktop, below on mobile) */}
      <div className="hidden md:flex md:flex-1 bg-gray-200 dark:bg-gray-800">
        {/* Your Google Maps component here */}
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          Map Loading...
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar
        title="Request Ride"
        footer={
          <PrimaryButton
            onClick={handleRequestRide}
            disabled={isSubmitting || !pickup || !dropoff}
            className="w-full"
          >
            {isSubmitting ? 'Requesting...' : 'Request Ride'}
          </PrimaryButton>
        }
      >
        {/* Pickup Location Section */}
        <SidebarSection title="From">
          <LocationInput
            value={pickup}
            onChange={(address) => setPickup(address)}
            placeholder="Enter pickup location"
            label="Pickup"
          />
        </SidebarSection>

        <SidebarDivider />

        {/* Dropoff Location Section */}
        <SidebarSection title="To">
          <LocationInput
            value={dropoff}
            onChange={(address) => setDropoff(address)}
            placeholder="Enter destination"
            label="Dropoff"
          />
        </SidebarSection>

        <SidebarDivider />

        {/* Fare Estimate */}
        {estimate && (
          <SidebarSection title="Estimate">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center">
                <Text size="sm" weight="medium">
                  Estimated Fare
                </Text>
                <Text size="lg" weight="bold" className="text-blue-600 dark:text-blue-400">
                  {estimate.fare}
                </Text>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ⏱ {estimate.duration}
              </div>
            </Card>
          </SidebarSection>
        )}
      </Sidebar>
    </div>
  );
}
```

### 3. Error State Components

Handle different async operation failures.

```tsx
'use client';
import { useState } from 'react';
import { RideFetchErrorState, GeolocationErrorState } from '@/components/error-states';

export default function RideDetailsPage() {
  const [rideData, setRideData] = useState(null);
  const [rideError, setRideError] = useState<string | null>(null);
  const [rideErrorCode, setRideErrorCode] = useState<'NOT_FOUND' | 'NETWORK_ERROR' | 'SERVER_ERROR'>('NETWORK_ERROR');
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryFetch = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch(`/api/rides/${rideId}`);
      if (response.ok) {
        const data = await response.json();
        setRideData(data);
        setRideError(null);
      } else if (response.status === 404) {
        setRideErrorCode('NOT_FOUND');
        setRideError('not found');
      }
    } catch (error) {
      setRideErrorCode('NETWORK_ERROR');
      setRideError('network');
    } finally {
      setIsRetrying(false);
    }
  };

  if (rideError) {
    return (
      <div className="p-4">
        <RideFetchErrorState
          errorCode={rideErrorCode}
          onRetry={handleRetryFetch}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  return <div>{/* Show ride data */}</div>;
}
```

### 4. Design System Components

Use pre-built UI components that enforce design constraints.

```tsx
'use client';
import {
  PrimaryButton,
  SecondaryButton,
  SuccessButton,
  DangerButton,
  InputField,
  Card,
  Badge,
  SuccessAlert,
  ErrorAlert,
  Text,
} from '@/components/ui';

export default function ComponentShowcase() {
  return (
    <div className="p-4 space-y-6">
      {/* Buttons */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Buttons</h2>
        <PrimaryButton>Primary</PrimaryButton>
        <SecondaryButton>Secondary</SecondaryButton>
        <SuccessButton>Success</SuccessButton>
        <DangerButton>Danger</DangerButton>
      </div>

      {/* Input Fields */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Inputs</h2>
        <InputField label="Normal Input" placeholder="Enter text" />
        <InputField
          label="Input with Error"
          placeholder="Invalid input"
          error="This field is required"
        />
        <InputField
          label="Input with Success"
          placeholder="Valid input"
          success
          helper="This looks good!"
        />
      </div>

      {/* Cards and Badges */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Cards & Badges</h2>
        <Card>
          <div className="flex justify-between items-center">
            <Text weight="semibold">Card Title</Text>
            <Badge variant="success">Completed</Badge>
          </div>
        </Card>
        <Card>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </Card>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Alerts</h2>
        <SuccessAlert
          title="Success!"
          message="Your ride has been confirmed."
        />
        <ErrorAlert
          title="Error"
          message="Failed to book ride. Please try again."
        />
      </div>

      {/* Text Variants */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Text</h2>
        <Text variant="primary" size="lg" weight="bold">
          Primary Large Bold
        </Text>
        <Text variant="secondary" size="sm">
          Secondary Small
        </Text>
        <Text variant="tertiary" size="xs">
          Tertiary Extra Small
        </Text>
      </div>
    </div>
  );
}
```

## Service Integration Examples

### Geolocation Service

```typescript
import { requestGeolocation, formatGeolocationError } from '@/services/geolocation.service';

async function getCurrentLocation() {
  try {
    const { lat, lng, accuracy } = await requestGeolocation();
    console.log(`Current location: ${lat}, ${lng} (±${accuracy}m)`);
  } catch (error) {
    const message = formatGeolocationError(error);
    console.error(message);
  }
}
```

### Reverse Geocoding Service

```typescript
import { reverseGeocode, formatGeocodeError } from '@/services/reverse-geocode.service';

async function getAddressFromCoordinates(lat: number, lng: number) {
  try {
    const result = await reverseGeocode(lat, lng);
    console.log(`Address: ${result.address}`);
    console.log(`City: ${result.city}, State: ${result.state}`);
  } catch (error) {
    const message = formatGeocodeError(error);
    console.error(message);
  }
}
```

## Migration Path: Updating Existing Pages

### Before (Old Pattern)

```tsx
// Old: Mixed concerns, manual error handling, no design system
export default function OldRidePage() {
  const [ride, setRide] = useState(null);
  const [error, setError] = useState(false);

  return (
    <div>
      {error ? (
        <div className="p-4 bg-red-100 text-red-800">
          <p>Error loading ride</p>
          <button className="mt-2 px-3 py-1 bg-red-600 text-white rounded">
            Retry
          </button>
        </div>
      ) : (
        <div>{/* ride content */}</div>
      )}
    </div>
  );
}
```

### After (New Pattern)

```tsx
'use client';
import { useState } from 'react';
import Sidebar, { SidebarSection } from '@/components/Sidebar';
import { RideFetchErrorState } from '@/components/error-states';
import { Card, PrimaryButton, Badge } from '@/components/ui';
import { mapRideToViewModel } from '@/lib/ride.mapper';

export default function NewRidePage({ rideId }: { rideId: string }) {
  const [rideViewModel, setRideViewModel] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const backendRide = await fetchRide(rideId);
      const viewModel = mapRideToViewModel(backendRide);
      setRideViewModel(viewModel);
      setError(null);
    } catch (e) {
      setError('failed-to-load');
    } finally {
      setIsRetrying(false);
    }
  };

  if (error) {
    return (
      <div className="p-4">
        <RideFetchErrorState
          errorCode="NETWORK_ERROR"
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  return (
    <Sidebar
      title="Ride Details"
      subtitle={`#${rideViewModel?.id}`}
    >
      <SidebarSection title="Route">
        <Card>
          <div className="text-sm">
            <p className="font-medium">📍 {rideViewModel?.pickupAddress}</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              to {rideViewModel?.dropoffAddress}
            </p>
          </div>
        </Card>
      </SidebarSection>

      <SidebarSection title="Status">
        <Badge variant="info">{rideViewModel?.statusLabel}</Badge>
      </SidebarSection>
    </Sidebar>
  );
}
```

## Design System Enforcement Checklist

✅ **When adding new components:**
- [ ] Import from `@/components/ui` or `@/components/error-states`
- [ ] Use semantic color tokens from design system
- [ ] Use `combineClasses()` helper for conditional classes
- [ ] Document component props with JSDoc
- [ ] Test dark mode appearance

✅ **When styling:**
- [ ] Use utility classes from `DESIGN_SYSTEM` tokens first
- [ ] Only add inline Tailwind if token doesn't exist (and add it!)
- [ ] Always include dark mode variants
- [ ] Use semantic tokens (`SEMANTIC_COLORS`) over raw colors

✅ **Error Handling:**
- [ ] Always wrap async operations in try/catch
- [ ] Use dedicated error state components
- [ ] Provide user-friendly error messages
- [ ] Include retry mechanism for transient errors
- [ ] Log errors for debugging (send to monitoring)

✅ **Accessibility:**
- [ ] All inputs have labels
- [ ] All buttons have aria-label or visible text
- [ ] Color not sole indicator of status
- [ ] Error messages linked to form fields
- [ ] Loading states properly announced

## Next Steps

1. **Update Ride Request Page** (`/ride/request`):
   - Replace layout with new Sidebar
   - Add LocationInput components for pickup/dropoff
   - Integrate with estimate API

2. **Update Ride Details Page** (`/ride/[id]`):
   - Use new error state components
   - Integrate with mapper layer
   - Add mobile bottom sheet for details

3. **Add More Error States**:
   - PaymentError component
   - ConfirmationError component
   - CancellationError component

4. **Mobile Polish**:
   - Test bottom sheet interactions
   - Verify tap targets (min 44px)
   - Ensure keyboard doesn't obscure inputs
   - Test with slow networks

5. **Monitoring & Analytics**:
   - Track error occurrences
   - Monitor location permission denials
   - Track successful "Use Current Location" usage
