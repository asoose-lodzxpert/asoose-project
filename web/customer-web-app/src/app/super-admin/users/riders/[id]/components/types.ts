export interface Ride {
  id: string;
  date: string;
  from: string;
  to: string;
  fare: string;
  status: string;
  customer: string;
  duration: string;
}

export interface Payout {
  id: string;
  date: string;
  amount: string;
  status: string;
  method: string;
  description: string;
  processedBy: string;
}

export interface Rider {
  id: string;
  name: string;
  image: string;
  email: string;
  phone: string;
  status: string;
  location: string;
  joined: string;
  rating: number;
  totalRides: number;
  completionRate: string;
  totalEarnings: string;
  vehicle: {
    type: string;
    model: string;
    plate: string;
    color: string;
  };
  documents: Array<{
    name: string;
    status: string;
    expiry: string;
  }>;
}
