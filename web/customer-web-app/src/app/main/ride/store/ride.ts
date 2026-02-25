import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type RideStage = 'idle' | 'configuring' | 'searching' | 'awaiting-payment' | 'confirmed' | 'arrived' | 'in-progress' | 'finished';
export type RideType = 'economy' | 'business';

interface RideState {
  // --- Ride ID Tracking ---
  rideId: string | null;

  // --- Map & Location Coordinates ---
  mapInstance: google.maps.Map | null;
  isGoogleMapsLoaded: boolean;
  userLocation: google.maps.LatLngLiteral | null;
  pickupLocation: google.maps.LatLngLiteral | null;
  dropoffLocation: google.maps.LatLngLiteral | null;
  
  // --- ADDED: Address Text Persistence ---
  pickupAddress: string | null;
  dropoffAddress: string | null;

  geolocationError: string | null;
  watchId: number | null;
  isFollowingDriver: boolean;
  routePolyline: string | null;

  // --- Payment Confirmation (set after user selects payment on post-match screen) ---
  paymentConfirmed: boolean;

  // --- Locked fare shown on the post-match payment screen ---
  lockedEstimate: { fare: number; distance: number; duration: number } | null;

  // --- Ride Lifecycle ---
  rideStatus: RideStage;
  rideType: RideType | null;
  driverLocation: google.maps.LatLngLiteral | null;
  driverHeading: number;
  driver: {
    name: string;
    photoUrl: string;
    vehicle: {
      make: string;
      model: string;
      licensePlate: string;
    };
    rating: number;
    phone: string;
  } | null;
  tripSummary: {
    fare: number;
    distance: number;
    duration: number;
  } | null;
  rating: number | null;
  feedback: string;
  isConfiguring: 'pickup' | 'dropoff' | null;
  startOtp: string | null;

  // --- Setters ---
  setRideId: (id: string | null) => void;
  setMapInstance: (map: google.maps.Map | null) => void;
  setIsGoogleMapsLoaded: (isLoaded: boolean) => void;
  setUserLocation: (location: google.maps.LatLngLiteral) => void;
  setPickupLocation: (location: google.maps.LatLngLiteral | null) => void;
  setDropoffLocation: (location: google.maps.LatLngLiteral | null) => void;
  
  // --- ADDED: Address Setters ---
  setPickupAddress: (address: string | null) => void;
  setDropoffAddress: (address: string | null) => void;

  setGeolocationError: (error: string | null) => void;
  setWatchId: (id: number | null) => void;
  setRoutePolyline: (polyline: string | null) => void;
  setRideStatus: (status: RideStage) => void;
  setDriverLocation: (location: google.maps.LatLngLiteral) => void;
  setDriverHeading: (heading: number) => void;
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
  setPaymentConfirmed: (confirmed: boolean) => void;
  setLockedEstimate: (estimate: { fare: number; distance: number; duration: number } | null) => void;
  setStartOtp: (otp: string | null) => void;
  
  // --- Clearing Actions ---
  clearPickupLocation: () => void;
  clearDropoffLocation: () => void;
  clearAllLocations: () => void;
  
  // --- Resetters ---
  resetRide: () => void;
}

const initialState = {
  rideId: null,
  mapInstance: null,
  isGoogleMapsLoaded: false,
  userLocation: null,
  pickupLocation: null,
  dropoffLocation: null,
  pickupAddress: null, // Init
  dropoffAddress: null, // Init
  geolocationError: null,
  watchId: null,
  isFollowingDriver: true,
  routePolyline: null,
  paymentConfirmed: false,
  lockedEstimate: null as { fare: number; distance: number; duration: number } | null,
  rideStatus: 'idle' as RideStage,
  rideType: null as RideType | null,
  driverLocation: null,
  driverHeading: 0,
  driver: null,
  tripSummary: null,
  rating: null,
  feedback: '',
  isConfiguring: null,
  startOtp: null,
};

export const useRideStore = create<RideState>()(
  persist(
    (set) => ({
      ...initialState,
      setRideId: (id) => set({ rideId: id }),
      setMapInstance: (map) => set({ mapInstance: map }),
      setIsGoogleMapsLoaded: (isLoaded) => set({ isGoogleMapsLoaded: isLoaded }),
      setUserLocation: (location) => set({ userLocation: location }),
      setPickupLocation: (location) => set({ pickupLocation: location }),
      setDropoffLocation: (location) => set({ dropoffLocation: location }),
      
      // --- ADDED: Address Setter Implementation ---
      setPickupAddress: (address) => set({ pickupAddress: address }),
      setDropoffAddress: (address) => set({ dropoffAddress: address }),

      setGeolocationError: (error) => set({ geolocationError: error }),
      setWatchId: (id) => set({ watchId: id }),
      setRoutePolyline: (polyline) => set({ routePolyline: polyline }),
      setRideStatus: (status) => set({ rideStatus: status }),
      setDriverLocation: (location) => set({ driverLocation: location }),
      setDriverHeading: (heading) => set({ driverHeading: heading }),
      setIsFollowingDriver: (isFollowing) => set({ isFollowingDriver: isFollowing }),
      setRideType: (type) => set({ rideType: type }),
      setDriver: (driver) => set({ driver: driver }),
      setTripSummary: (summary) => set({ tripSummary: summary }),
      setRating: (rating) => set({ rating: rating }),
      setFeedback: (feedback) => set({ feedback: feedback }),
      setIsConfiguring: (isConfiguring) => set({ isConfiguring: isConfiguring }),
      setPaymentConfirmed: (confirmed) => set({ paymentConfirmed: confirmed }),
      setLockedEstimate: (estimate) => set({ lockedEstimate: estimate }),
      setStartOtp: (otp) => set({ startOtp: otp }),
      
      // --- Clear Actions ---
      clearPickupLocation: () =>
        set({
          pickupLocation: null,
          pickupAddress: null,
          routePolyline: null, // Clear route when pickup is cleared
          geolocationError: null,
        }),
      
      clearDropoffLocation: () =>
        set({
          dropoffLocation: null,
          dropoffAddress: null,
          routePolyline: null, // Clear route when dropoff is cleared
          geolocationError: null,
        }),
      
      clearAllLocations: () =>
        set({
          pickupLocation: null,
          pickupAddress: null,
          dropoffLocation: null,
          dropoffAddress: null,
          routePolyline: null,
          rideStatus: 'idle' as RideStage,
          rideType: null,
          isConfiguring: null,
          driver: null,
          tripSummary: null,
          driverLocation: null,
          geolocationError: null,
          watchId: null,
          isFollowingDriver: false,
          paymentConfirmed: false,
          lockedEstimate: null,
          rideId: null,
        }),
      
      resetRide: () =>
        set((state) => ({
          ...initialState,
          userLocation: state.userLocation,
          mapInstance: state.mapInstance,
          isGoogleMapsLoaded: state.isGoogleMapsLoaded,
        })),
    }),
    {
      name: 'ride-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        rideId: state.rideId,
        pickupLocation: state.pickupLocation,
        dropoffLocation: state.dropoffLocation,
        pickupAddress: state.pickupAddress, // Persist
        dropoffAddress: state.dropoffAddress, // Persist
        rideStatus: state.rideStatus,
        rideType: state.rideType,
        paymentConfirmed: state.paymentConfirmed,
        lockedEstimate: state.lockedEstimate,
        startOtp: state.startOtp,
        driverLocation: state.driverLocation,
        driverHeading: state.driverHeading,
        driver: state.driver,
        tripSummary: state.tripSummary,
        rating: state.rating,
        feedback: state.feedback,
        isConfiguring: state.isConfiguring,
        routePolyline: state.routePolyline,
      }),
    }
  )
);