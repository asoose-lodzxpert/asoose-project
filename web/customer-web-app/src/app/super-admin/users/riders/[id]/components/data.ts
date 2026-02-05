import { Rider, Ride, Payout } from "./types";

export const mockRider: Rider = {
  id: "RDR-005",
  name: "Michael Chen",
  image:
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop",
  email: "michael.chen@example.com",
  phone: "+1 (555) 123-8899",
  status: "Online",
  location: "Downtown, 5th Ave",
  joined: "2023-08-10",
  rating: 4.9,
  totalRides: 1450,
  completionRate: "98%",
  totalEarnings: "$12,450.00",
  vehicle: {
    type: "Car",
    model: "Toyota Prius (2022)",
    plate: "ABC-123",
    color: "Silver",
  },
  documents: [
    { name: "Driver's License", status: "Verified", expiry: "2025-10-10" },
    { name: "Vehicle Insurance", status: "Verified", expiry: "2024-12-01" },
    { name: "Background Check", status: "Pending", expiry: "-" },
  ],
};

export const mockRides: Ride[] = [
  {
    id: "RID-501",
    date: "2024-05-10 14:30",
    from: "Central Station",
    to: "Airport Terminal 1",
    fare: "$45.00",
    status: "Completed",
    customer: "John D.",
    duration: "25 min",
  },
  // ... rest of your mock rides
];

export const mockPayouts: Payout[] = [
  {
    id: "PAY-045",
    date: "2024-05-10",
    amount: "$450.50",
    status: "Paid",
    method: "Bank Transfer",
    description: "Weekly Earnings",
    processedBy: "Auto System",
  },
  // ... rest of your mock payouts
];
