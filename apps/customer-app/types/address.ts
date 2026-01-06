export type Address = {
  id: string;
  label: string; // Home, Work, Other, etc
  address: string;
  coordinates: { lat: string; lng: string };
  isDefault: boolean;
};
