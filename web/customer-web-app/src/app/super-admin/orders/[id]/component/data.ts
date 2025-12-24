
export interface OrderDetail {
  id: string;
  status: string;
  serviceType: string;
  placedAt: string;
  updatedAt: string;
  estimatedDelivery: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    instructions?: string;
  };
  rider?: {
    name: string;
    id: string;
    phone: string;
    vehicle: string;
    status: string;
  };
  payment: {
    method: string;
    transactionId: string;
    status: string;
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    tax: number;
    total: number;
  };
  timeline: {
    title: string;
    date: string;
    desc: string;
    done: boolean;
    active?: boolean;
  }[];
  logs: {
    date: string;
    user: string;
    action: string;
  }[];
}

export const MOCK_ORDER_DETAIL: OrderDetail = {
  id: 'ORD-001',
  status: 'Out for Delivery',
  serviceType: 'Food',
  placedAt: '2024-05-10 14:00:00',
  updatedAt: '2024-05-10 14:45:12',
  estimatedDelivery: '2024-05-10 15:00',
  customer: {
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1 (555) 555-1234',
    address: '123 Main St, Apt 4B, Brooklyn, NY',
    instructions: 'Leave at door, ring bell twice.',
  },
  rider: {
    name: 'Sarah J.',
    id: 'RDR-005',
    phone: '+1 (555) 555-5678',
    vehicle: 'Red Honda Civic (ABC-123)',
    status: 'En Route to Delivery',
  },
  payment: {
    method: 'Visa ••1234',
    transactionId: 'TXN-887654',
    status: 'Paid',
    subtotal: 31.49,
    deliveryFee: 2.99,
    serviceFee: 1.50,
    tax: 2.00,
    total: 28.50, // Note: Total usually sum of above, kept as per original mock
  },
  timeline: [
    { title: 'Order Placed', date: '2024-05-10 14:00:00', desc: 'by Customer John Doe', done: true },
    { title: 'Accepted by Vendor', date: '2024-05-10 14:02:15', desc: "Joe's Pizza", done: true },
    { title: 'Preparing Order', date: '2024-05-10 14:05:00', desc: '', done: true },
    { title: 'Ready for Pickup', date: '2024-05-10 14:20:00', desc: '', done: true },
    { title: 'Rider Assigned', date: '2024-05-10 14:22:00', desc: 'Sarah J. (RDR-005)', done: true },
    { title: 'Rider Picked Up Order', date: '2024-05-10 14:30:00', desc: '', done: true },
    { title: 'Out for Delivery', date: '2024-05-10 14:35:00', desc: 'Current Status', done: true, active: true },
    { title: 'Delivered', date: '(pending)', desc: '', done: false },
  ],
  logs: [
    { date: '2024-05-10 12:46:00', user: 'Super Admin', action: "Order status changed from 'Pending' to 'Processing' manually." },
    { date: '2024-05-10 14:02:00', user: 'Support Admin', action: 'Contacted vendor for order confirmation.' },
  ]
};