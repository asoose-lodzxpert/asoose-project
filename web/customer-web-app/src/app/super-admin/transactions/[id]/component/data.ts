
export interface TransactionDetail {
  id: string;
  amount: string;
  status: string;
  type: string;
  date: string;
  description: string;
  method: string;
  reference: string;
  user: {
    name: string;
    id: string;
    email: string;
    role: string;
  };
  relatedEntity: {
    type: string;
    id: string;
    status: string;
    link: string;
  };
  breakdown: {
    label: string;
    value: string;
    isTotal?: boolean;
  }[];
  timeline: {
    status: string;
    time: string;
    note: string;
  }[];
}

export const MOCK_TRANSACTION: TransactionDetail = {
  id: 'TXN-901',
  amount: "$45.00",
  status: "Success",
  type: "Credit",
  date: "2024-05-10 14:30:45",
  description: "Payment for Order #ORD-001",
  method: "Visa •••• 4242",
  reference: "ch_3PABC123456789",
  user: {
    name: "John Doe",
    id: "CUS-001",
    email: "john.doe@example.com",
    role: "Customer"
  },
  relatedEntity: {
    type: "Order",
    id: "ORD-001",
    status: "Delivered",
    link: "/super-admin/orders/ORD-001"
  },
  breakdown: [
    { label: "Subtotal", value: "$35.00" },
    { label: "Delivery Fee", value: "$5.00" },
    { label: "Service Fee", value: "$2.50" },
    { label: "Tax (5%)", value: "$2.50" },
    { label: "Total", value: "$45.00", isTotal: true }
  ],
  timeline: [
    { status: "Payment Initiated", time: "2024-05-10 14:30:10", note: "Customer started checkout" },
    { status: "Payment Processed", time: "2024-05-10 14:30:45", note: "Stripe charge successful (ch_3PABC...)" },
    { status: "Funds Secured", time: "2024-05-10 14:31:00", note: "Platform hold applied" },
    { status: "Settled", time: "2024-05-10 14:31:00", note: "Funds added to platform balance" },
  ]
};