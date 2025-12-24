import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Ban, MoreHorizontal } from 'lucide-react';
import { Rider } from './types';
interface RiderHeaderProps {
  rider: Rider;
  onToggleStatus: () => void;
}

export default function RiderHeader({ rider, onToggleStatus }: RiderHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <Link href="/super-admin/users/riders" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-1">
          <ArrowLeft className="w-4 h-4" /> Back to Riders
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          {rider.name} 
          <span className={`text-sm px-3 py-1 rounded-full border ${
            rider.status === 'Online' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
            rider.status === 'Offline' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' : 
            'bg-red-500/10 text-red-500 border-red-500/20'
          }`}>
            {rider.status === 'Online' && <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></span>}
            {rider.status}
          </span>
        </h1>
      </div>
      
      <div className="flex gap-3">
        <button className="px-3 md:px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors text-sm">
          <ShieldCheck className="w-4 h-4" /> 
          <span className="hidden md:inline">Verify Documents</span>
        </button>
        <button 
          onClick={onToggleStatus}
          className={`px-3 md:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm ${
            rider.status === 'Suspended' 
              ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white' 
              : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white'
          }`}
        >
          <Ban className="w-4 h-4" /> 
          <span className="hidden md:inline">{rider.status === 'Suspended' ? 'Activate Rider' : 'Suspend Rider'}</span>
        </button>
        <button className="p-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}