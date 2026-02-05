// src/app/super-admin/users/riders/types.ts

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  type: string;
  status: string;
  verification: string;
  rating: number | null;
  rides: number;
}

export const MOCK_RIDERS: Rider[] = [
  {
    id: "RDR-001",
    name: "Michael Chen",
    phone: "+1 (555) 001-1234",
    vehicle: "Honda Civic",
    plate: "ABC-123",
    type: "Car",
    status: "Online",
    verification: "Verified",
    rating: 4.9,
    rides: 145,
  },
  {
    id: "RDR-002",
    name: "Sarah Jones",
    phone: "+1 (555) 002-5678",
    vehicle: "Yamaha MT-07",
    plate: "XY-99",
    type: "Bike",
    status: "Busy",
    verification: "Verified",
    rating: 4.8,
    rides: 89,
  },
  {
    id: "RDR-003",
    name: "David Smith",
    phone: "+1 (555) 003-9012",
    vehicle: "Toyota Prius",
    plate: "NYC-202",
    type: "Car",
    status: "Offline",
    verification: "Pending",
    rating: null,
    rides: 0,
  },
  {
    id: "RDR-004",
    name: "Emily Brown",
    phone: "+1 (555) 004-3456",
    vehicle: "Scooter",
    plate: "SC-55",
    type: "Bike",
    status: "Online",
    verification: "Verified",
    rating: 4.5,
    rides: 210,
  },
  {
    id: "RDR-005",
    name: "James Wilson",
    phone: "+1 (555) 005-7890",
    vehicle: "Ford Focus",
    plate: "GHI-456",
    type: "Car",
    status: "Suspended",
    verification: "Verified",
    rating: 3.2,
    rides: 45,
  },
];
