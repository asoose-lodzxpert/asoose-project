export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface PriceBreakdown {
  baseFare: number;
  distanceRate: number;
  surgeMultiplier: number;
  promotionDiscount: number;
  total: number;
}

export interface PriceEstimate {
  Standard: PriceBreakdown;
  Premium: PriceBreakdown;
  XL: PriceBreakdown;
  distanceKm: number;
  durationMin: number;
  isSurgeActive: boolean;
}

/**
 * Calculates a detailed ride estimate with base fare, distance rates, and surge.
 */
export const getRideEstimate = async (
  pickup: GeoLocation, 
  dropoff: GeoLocation
): Promise<PriceEstimate> => {
  
  // Simulate Network Delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Haversine formula for mock distance
  const R = 6371; 
  const dLat = (dropoff.lat - pickup.lat) * (Math.PI / 180);
  const dLon = (dropoff.lng - pickup.lng) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pickup.lat * (Math.PI/180)) * Math.cos(dropoff.lat * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceKm = R * c;
  
  const isSurge = Math.random() > 0.7; // 30% chance of surge for demo
  const surgeMultiplier = isSurge ? 1.4 : 1.0;

  const calculateTier = (base: number, perKm: number) => {
    const baseFare = base;
    const distanceRate = Math.round(distanceKm * perKm);
    const totalBeforePromo = (baseFare + distanceRate) * surgeMultiplier;
    const promotionDiscount = 0; // Integration point for coupon logic

    return {
      baseFare,
      distanceRate,
      surgeMultiplier,
      promotionDiscount,
      total: Math.ceil((totalBeforePromo - promotionDiscount) / 50) * 50
    };
  };

  return {
    distanceKm: parseFloat(distanceKm.toFixed(1)),
    durationMin: Math.round(distanceKm * 3) + 2, 
    isSurgeActive: isSurge,
    Standard: calculateTier(500, 220),
    Premium: calculateTier(800, 380),
    XL: calculateTier(1200, 550),
  };
};

export const requestRide = async (data: any) => {
    return { rideId: `ride_${Math.random().toString(36).substr(2, 9)}` };
};

export const cancelRide = async (rideId: string) => {
    return { success: true };
};