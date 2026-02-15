'use client';

import { Car, Briefcase } from 'lucide-react';

const RIDE_TYPES = [
  { id: 'economy', name: 'Economy', icon: Car },
  { id: 'business', name: 'Business', icon: Briefcase },
];

interface RideTypeSelectorProps {
  selectedRide: string;
  onSelectRide: (ride: string) => void;
}

export function RideTypeSelector({ selectedRide, onSelectRide }: RideTypeSelectorProps) {
  return (
    <div className="flex justify-center space-x-4 my-4">
      {RIDE_TYPES.map((ride) => (
        <div
          key={ride.id}
          onClick={() => onSelectRide(ride.id)}
          className={`cursor-pointer p-4 rounded-lg text-center transition-all duration-300 ${
            selectedRide === ride.id
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          <ride.icon className="h-8 w-8 mx-auto mb-2" />
          <span className="font-medium">{ride.name}</span>
        </div>
      ))}
    </div>
  );
}
