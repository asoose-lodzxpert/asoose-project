export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  isDefault: boolean;
}

export interface CustomerStats {
  totalOrders: number;
  totalRides: number;
  totalDeliveries: number;
  totalSpent: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  image?: string;
  status: "ACTIVE" | "BANNED" | "SUSPENDED" | "PENDING";
  joinedAt: string;
  updatedAt: string;
  stats: CustomerStats;
  addresses: Address[];
}

export interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  store: { name: string; image?: string };
  items: any[];
}

export interface Ride {
  id: string;
  pickupAddress: { street: string };
  dropoffAddress: { street: string };
  status: string;
  createdAt: string;
  totalFare?: number;
}

export interface AdminCustomerMessage {
  id: string;
  adminId: string;
  customerId: string;
  message: string;
  subject?: string;
  createdAt: string;
  admin: { name: string; image?: string };
}
