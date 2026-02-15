import { create } from 'zustand';

export type RideStage = 'idle' | 'configuring' | 'searching' | 'confirmed' | 'arrived' | 'in-progress' | 'finished';
export type RideType = 'economy' | 'business';

interface RideState {
  // Map & Location
  mapInstance: google.maps.Map | null;
  isGoogleMapsLoaded: boolean;
  userLocation: google.maps.LatLngLiteral | null;
  pickupLocation: google.maps.LatLngLiteral | null;
  dropoffLocation: google.maps.LatLngLiteral | null;
  geolocationError: string | null;
  watchId: number | null;
  isFollowingDriver: boolean;
  routePolyline: string | null;

  // Ride Lifecycle
  rideStatus: RideStage;
  rideType: RideType | null;
  driverLocation: google.maps.LatLngLiteral | null;
  driver: {
    name: string;
    photoUrl: string;
    vehicle: {
      make: string;
      model: string;
      licensePlate: string;
    };
    rating: number;
  } | null;
  tripSummary: {
    fare: number;
    distance: number;
    duration: number;
  } | null;
  rating: number | null;
  feedback: string;
  isConfiguring: 'pickup' | 'dropoff' | null;

  // Setters
  setMapInstance: (map: google.maps.Map | null) => void;
  setIsGoogleMapsLoaded: (isLoaded: boolean) => void;
  setUserLocation: (location: google.maps.LatLngLiteral) => void;
  setPickupLocation: (location: google.maps.LatLngLiteral | null) => void;
  setDropoffLocation: (location: google.maps.LatLngLiteral | null) => void;
  setGeolocationError: (error: string | null) => void;
  setWatchId: (id: number | null) => void;
  setRoutePolyline: (polyline: string | null) => void;
  setRideStatus: (status: RideStage) => void;
  setDriverLocation: (location: google.maps.LatLngLiteral) => void;
  setIsFollowingDriver: (isFollowing: boolean) => void;
  setRideType: (type: RideType) => void;
  setDriver: (driver: RideState['driver']) => void;
  setTripSummary: (summary: {
    fare: number;
    distance: number;
    duration: number;
  } | null) => void;
  setRating: (rating: number | null) => void;
  setFeedback: (feedback: string) => void;
  setIsConfiguring: (isConfiguring: 'pickup' | 'dropoff' | null) => void;
  
  // Resetters
  resetRide: () => void;
}

const initialState = {
  // Map & Location
  mapInstance: null,
  isGoogleMapsLoaded: false,
  userLocation: null,
  pickupLocation: null,
  dropoffLocation: null,
  geolocationError: null,
  watchId: null,
  isFollowingDriver: true,
  routePolyline: null,

  // Ride Lifecycle
  rideStatus: 'idle' as RideStage,
  rideType: null as RideType | null,
  driverLocation: null,
  driver: null,
  tripSummary: null,
  rating: null,
  feedback: '',
  isConfiguring: null,
};

export const useRideStore = create<RideState>((set) => ({
  ...initialState,

  // Setters
  setMapInstance: (map) => set({ mapInstance: map }),
  setIsGoogleMapsLoaded: (isLoaded) => set({ isGoogleMapsLoaded: isLoaded }),
  setUserLocation: (location) => set({ userLocation: location }),
  setPickupLocation: (location) => set({ pickupLocation: location }),
  setDropoffLocation: (location) => set({ dropoffLocation: location }),
  setGeolocationError: (error) => set({ geolocationError: error }),
  setWatchId: (id) => set({ watchId: id }),
  setRoutePolyline: (polyline) => set({ routePolyline: polyline }),
  
  // PURE STATE UPDATE - No side effects
  setRideStatus: (status) => set({ rideStatus: status }),
  
  setDriverLocation: (location) => set({ driverLocation: location }),
  setIsFollowingDriver: (isFollowing) => set({ isFollowingDriver: isFollowing }),
  setRideType: (type) => set({ rideType: type }),
  setDriver: (driver) => set({ driver: driver }),
  setTripSummary: (summary) => set({ tripSummary: summary }),
  setRating: (rating) => set({ rating: rating }),
  setFeedback: (feedback) => set({ feedback: feedback }),
  setIsConfiguring: (isConfiguring) => set({ isConfiguring: isConfiguring }),

  // Reset ride to initial state
  resetRide: () =>
    set((state) => ({
      ...initialState,
      userLocation: state.userLocation, // Keep user location and map instance
      mapInstance: state.mapInstance,
      isGoogleMapsLoaded: state.isGoogleMapsLoaded,
    })),
}));