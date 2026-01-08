import React from 'react';
import Link from 'next/link';
import { Car, ExternalLink, MapPin } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { TransactionDetail } from '../types';
interface RideDetailsProps {
  details: NonNullable<TransactionDetail['rideDetails']>;
  pricing: NonNullable<TransactionDetail['ridePricing']>;
}

export const RideDetailsCard = ({ details, pricing }: RideDetailsProps) => {
  const action = (
    <Link 
      href={`/super-admin/rides/${details.rideId}`}
      className="text-yellow-500 hover:text-yellow-400 text-sm font-medium flex items-center gap-2"
    >
      View Ride <ExternalLink className="w-3 h-3" />
    </Link>
  );

  return (
    <SectionCard 
      title="Ride Details" 
      icon={Car} 
      iconColorClass="bg-purple-500/20 text-purple-500"
      action={action}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-gray-400 text-xs">Ride ID</p>
            <p className="text-white font-mono text-sm">{details.rideId}</p>
          </div>
          <div className="space-y-2">
            <p className="text-gray-400 text-xs">Driver</p>
            <p className="text-white font-medium">{details.driver}</p>
          </div>
          <div className="space-y-2">
            <p className="text-gray-400 text-xs">Status</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              details.status === 'COMPLETED' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
            }`}>
              {details.status}
            </span>
          </div>
        </div>

        {/* Route Info */}
        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-white font-medium mb-4">Route Information</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs">Pickup Location</p>
                <p className="text-white">{details.pickup.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-xs">Dropoff Location</p>
                <p className="text-white">{details.dropoff.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Statistics */}
        {(details.distance || details.duration) && (
          <div className="border-t border-gray-700 pt-6">
            <h4 className="text-white font-medium mb-4">Trip Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              {details.distance && (
                <div className="bg-[#0F172A] p-4 rounded-lg">
                  <p className="text-gray-400 text-xs mb-1">Distance</p>
                  <p className="text-white font-bold text-xl">{details.distance}</p>
                </div>
              )}
              {details.duration && (
                <div className="bg-[#0F172A] p-4 rounded-lg">
                  <p className="text-gray-400 text-xs mb-1">Duration</p>
                  <p className="text-white font-bold text-xl">{details.duration}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fare Breakdown */}
        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-white font-medium mb-4">Fare Breakdown</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Base Fare</p>
                <p className="text-white">${pricing.baseFare.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Distance Fare</p>
                <p className="text-white">${pricing.distanceFare.toFixed(2)}</p>
              </div>
            </div>
            {/* Additional rows can be added here following same pattern */}
            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Platform Fee</span>
                <span className="text-orange-500">${pricing.platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-700">
                <span className="text-white font-medium">Driver Receives</span>
                <span className="text-green-500 font-bold text-lg">
                  ${pricing.driverFee.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};