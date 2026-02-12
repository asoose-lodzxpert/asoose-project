export type CartItem = {
  id: string;
  name: string;
  image?: string | null;
  price: number;
  qty: number;
  options?: string;
  vendorId: string;
  description?: string | null;
  available?: boolean;
};

export type Restaurant = {
  id: string;
  name: string;
  deliveryTime: string;
  image?: string | null;
  currency?: string;
};

export type CartSelection = {
  id: string;
  name: string;
  image?: string | null;
  price: number;
  qty: number;
  vendorId: string;
  options?: string;
};

export type CartSummaryItem = {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
  price: number;
  quantity: number;
  total: number;
  available: boolean;
};

export type CartSummaryRestaurant = {
  id: string;
  name: string;
  image?: string | null;
  time?: string;
  currency?: string;
};

export type CartGroup = {
  restaurant: CartSummaryRestaurant;
  items: CartSummaryItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
};

export type CartSummaryResponse = {
  groups: CartGroup[];
  grandTotal: number;
  // Legacy single-vendor fields for backwards compatibility
  restaurant?: CartSummaryRestaurant | null;
  items?: CartSummaryItem[];
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
};
