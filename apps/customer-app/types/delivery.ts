export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Address = {
  id: string;
  label: string;
  fullAddress: string;
  coords: Coordinates;
  placeId?: string;
};

export type LocationPoint = {
  address: Address | null;
  details?: string;
  contactName?: string;
  contactPhone?: string;
};

export type PackageSize = "small" | "medium" | "large" | "extra_large";

export type DeliveryQuote = {
  distanceKm: number;
  etaMinutes: number;
  price: number;
};

export type PickupDetails = {
  name: string;
  phone: string;
  instructions: string;
};

export type DeliveryDetails = {
  name: string;
  phone: string;
  instructions: string;
};

export type PackageOptions = {
  fragile: boolean;
  perishable: boolean;
  containsLiquid: boolean;
  declaredValue: string;
  weightKg: number;
};
