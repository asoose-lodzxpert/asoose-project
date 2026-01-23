import React from 'react';
import Link from 'next/link';
import { Car, ExternalLink, MapPin } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { TransactionDetail } from '../types';
import { Currency } from '@/app/main/components/Currency'; // ✅ Added

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
        {/* ... Header Stats remains same ... */}
        
        {/* ... Route Info and Trip Statistics remain same ... */}

        {/* Fare Breakdown */}
        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-white font-medium mb-4">Fare Breakdown</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Base Fare</p>
                {/* ✅ Fixed: Formatted base fare */}
                <p className="text-white"><Currency amount={pricing.baseFare} /></p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Distance Fare</p>
                {/* ✅ Fixed: Formatted distance fare */}
                <p className="text-white"><Currency amount={pricing.distanceFare} /></p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Platform Fee</span>
                {/* ✅ Fixed: Formatted platform fee */}
                <span className="text-orange-500"><Currency amount={pricing.platformFee} /></span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-700">
                <span className="text-white font-medium">Driver Receives</span>
                <span className="text-green-500 font-bold text-lg">
                  {/* ✅ Fixed: Formatted driver earnings */}
                  <Currency amount={pricing.driverFee} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
};