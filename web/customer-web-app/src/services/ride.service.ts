// src/services/ride.service.ts

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface PriceEstimate {
  Standard: number;
  Premium: number;
  XL: number;
  distanceKm: number;
  durationMin: number;
}

/**
 * MOCK SERVICE: Simulates sending coordinates to the backend to get a price.
 * TODO: Replace the body of this function with a real API call when backend is ready.
 */
export const getRideEstimate = async (
  pickup: GeoLocation, 
  dropoff: GeoLocation
): Promise<PriceEstimate> => {
  
  // 1. Simulate Network Delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 2. Mock Logic (To be replaced by Backend)
  const R = 6371; 
  const dLat = (dropoff.lat - pickup.lat) * (Math.PI / 180);
  const dLon = (dropoff.lng - pickup.lng) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pickup.lat * (Math.PI/180)) * Math.cos(dropoff.lat * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceKm = R * c; // Straight line distance approx
  
  const basePrice = 500;
  
  return {
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    durationMin: Math.round(distanceKm * 3), 
    Standard: Math.ceil((basePrice + distanceKm * 200) / 50) * 50,
    Premium: Math.ceil((basePrice * 1.5 + distanceKm * 350) / 50) * 50,
    XL: Math.ceil((basePrice * 2.5 + distanceKm * 500) / 50) * 50,
  };
};