type RideType = 'Standard' | 'Premium' | 'XL';

interface PaymentMethod {
  id: string;
  type: 'card' | 'cash' | 'wallet';
  label: string;
  icon: React.ReactNode;
}

interface RideRequestData {
  rideType: RideType;
  paymentMethodId: string;
  estimatedPrice: number;
}

interface CreateOrderDto {
  userId: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  rideType: RideType;
  paymentMethodId: string;
  price: number;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}