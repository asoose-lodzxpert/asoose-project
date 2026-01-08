import React from 'react';
import { Car } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { TransactionDetail } from '../types';

export const VehicleInfoCard = ({ info }: { info: NonNullable<TransactionDetail['vehicleInfo']> }) => {
  return (
    <SectionCard title="Vehicle Information" icon={Car} iconColorClass="bg-purple-500/20 text-purple-500">
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-xs mb-2">Vehicle</p>
          <p className="text-white font-medium">{info.brand} {info.model}</p>
          <p className="text-gray-400 text-xs mt-1">{info.color} • {info.year}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-2">Type</p>
          <p className="text-white font-medium">{info.type}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-2">Plate Number</p>
          <p className="text-white font-mono font-bold text-lg">{info.plateNumber}</p>
        </div>
      </div>
    </SectionCard>
  );
};