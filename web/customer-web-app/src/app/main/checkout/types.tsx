export interface Address {
  id: string;
  label?: string;
  street: string;
  city: string;
  state?: string;
  isDefault: boolean;
  lat: number; // Added lat
  lng: number; // Added lng
}

export interface CartItem {
  id: string;
  lineId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  restaurantId: string;
  modifierIds?: string[];
}

export interface OrderPayload {
  addressId: string;
  restaurantId: string;
  items: { id: string; quantity: number }[];
}
