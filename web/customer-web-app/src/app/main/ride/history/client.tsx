'use client';

import { useState } from 'react';

interface Ride {
  id: string;
  pickup: string;
  dropoff: string;
  date: string;
  price: number;
}

// Placeholder data
const rideHistoryData: Ride[] = [
  {
    id: '1',
    pickup: '123 Main St',
    dropoff: '456 Oak Ave',
    date: '2024-07-29',
    price: 25.50,
  },
  {
    id: '2',
    pickup: '789 Pine Ln',
    dropoff: '101 Maple Rd',
    date: '2024-07-28',
    price: 18.75,
  },
];

export function RideHistoryClient() {
  const [rides, setRides] = useState<Ride[]>(rideHistoryData);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ride History</h1>
      <div className="space-y-4">
        {rides.map((ride) => (
          <div key={ride.id} className="p-4 rounded-md bg-gray-100 shadow-md">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">Pickup:</p>
                <p>{ride.pickup}</p>
              </div>
              <div>
                <p className="font-semibold">Dropoff:</p>
                <p>{ride.dropoff}</p>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-gray-600">
              <span>{ride.date}</span>
              <span>${ride.price.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
