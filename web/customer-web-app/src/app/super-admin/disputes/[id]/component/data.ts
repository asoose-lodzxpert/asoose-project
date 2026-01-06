// src/app/super-admin/disputes/[id]/data.ts

export interface DisputeDetail {
  id: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  reportedBy: {
    name: string;
    id: string;
    role: string;
  };
  reportedAt: string;
  assignedTo: string;
  relatedEntity: {
    type: string;
    id: string;
    status: string;
    amount?: string;
  };
  parties: {
    role: string;
    name: string;
    id: string;
    rating: number;
  }[];
  communication: {
    id: string;
    sender: string;
    time: string;
    message: string;
    type: 'User' | 'System';
  }[];
  auditTrail: {
    action: string;
    user: string;
    time: string;
    note?: string;
    color: string; // 'red', 'green', 'yellow'
  }[];
}

export const MOCK_DISPUTE: DisputeDetail = {
  id: 'DIS-001',
  category: 'Order',
  priority: 'High',
  status: 'OPEN',
  subject: 'Food cold & late',
  reportedBy: {
    name: 'John Doe',
    id: 'CUS-010',
    role: 'Customer'
  },
  reportedAt: '2024-05-10 15:30:15',
  assignedTo: 'Admin Jane Smith',
  relatedEntity: {
    type: 'Order',
    id: 'ORD-001',
    status: 'Delivered',
    amount: '$28.50'
  },
  parties: [
    { role: 'Customer', name: 'John Doe', id: 'CUS-010', rating: 4.5 },
    { role: 'Vendor', name: "Joe's Pizza", id: 'VDR-001', rating: 4.8 },
    { role: 'Rider', name: 'Sarah J.', id: 'RDR-005', rating: 4.9 },
  ],
  communication: [
    { id: '1', sender: 'Customer (John Doe)', time: '2024-05-10 15:30', message: 'The pizza arrived cold and 45 minutes late. Unacceptable service. I want a full refund. Order ID: ORD-001.', type: 'User' },
    { id: '2', sender: 'System Log', time: '2024-05-10 15:30', message: 'Dispute automatically created via Customer App.', type: 'System' },
  ],
  auditTrail: [
    { action: 'Dispute reopened', user: 'Admin Jane Smith', time: '2024-05-10 16:40:00', color: 'red' },
    { action: 'Partial Refund ($14.25) issued to Customer John Doe', user: 'Admin Jane Smith', time: '2024-05-10 16:30:10', color: 'green' },
    { action: 'Admin Note', user: 'Admin Jane Smith', time: '2024-05-10 16:25:45', note: 'Customer was satisfied with the partial refund offer after reviewing the rider\'s GPS data confirming unforeseen traffic.', color: 'yellow' },
  ]
};