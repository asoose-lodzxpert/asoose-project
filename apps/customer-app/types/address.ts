export type Address = {
  id: string;
  userId: string;
  vendorId: string | null;
  phone: string | null;
  label: string; // Home, Work, Other, etc.
  street: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  isDefault: boolean;
};
