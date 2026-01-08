// types.ts
export interface TransactionDetail {
  id: string;
  status: string;
  amount: number;
  type: string;
  method: string;
  date: string;
  reference: string;
  description: string;
  balanceBefore?: number;
  balanceAfter?: number;
  metadata?: any;
  customer?: { name: string; email?: string; phone?: string };
  bankInfo?: { 
    bankName: string; 
    accountNumber: string; 
    accountName: string;
    currency: string;
  };
  paymentInfo?: {
    transactionId: string;
    paymentMethod: string;
    status: string;
    failureReason?: string;
  };
  orderDetails?: {
    orderId: string;
    vendor: string;
    vendorAddress?: string;
    commissionRate: number;
    commissionAmount: number;
    items: Array<{
      name: string;
      qty: number;
      price: number;
      total: number;
      image?: string;
      options?: any;
    }>;
    subtotal: number;
    total: number;
  };
  rideDetails?: {
    rideId: string;
    driver: string;
    driverPhone?: string;
    vehicle?: string;
    pickup: { address: string; lat: number; lng: number };
    dropoff: { address: string; lat: number; lng: number };
    distance?: string;
    duration?: string;
    status: string;
  };
  ridePricing?: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    platformFee: number;
    driverFee: number;
    totalFare: number;
  };
  vehicleInfo?: {
    type: string;
    brand: string;
    model: string;
    plateNumber: string;
    color: string;
    year: number;
  };
  payoutInfo?: {
    reference?: string;
    method: string;
    status: string;
    requestedAt: string;
    processedAt?: string;
  };
  financialBreakdown?: {
    customerPaid?: number;
    platformCommission?: number;
    platformFee?: number;
    vendorReceives?: number;
    driverReceives?: number;
  };
  recentActivity?: {
    period: string;
    totalOrders?: number;
    totalRevenue?: number;
    averageOrderValue?: number;
    totalRides?: number;
    totalDeliveries?: number;
    totalTrips?: number;
    totalEarnings?: number;
    totalDistance?: string;
    averageEarningPerTrip?: number;
  };
  timeline: Array<{ status: string; date: string; done: boolean; note?: string }>;
}