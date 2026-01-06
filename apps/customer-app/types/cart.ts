export type CartItem = {
  id: string; // product id
  name: string;
  image: string;
  price: number;
  qty: number;
  options?: string;
  restaurantId: string;
};

export type Restaurant = {
  id: string;
  name: string;
  deliveryTime: string;
};

export type CartResponse = {
  restaurants: Restaurant[];
  items: CartItem[];
};
