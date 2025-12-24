import React from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import { Rider } from './types';
import { 
  CheckCircle, Clock, Ban, AlertCircle, User, Car, Bike, Star, 
  Phone, Eye, Trash2 
} from 'lucide-react';

const columnHelper = createColumnHelper<Rider>();

// --- Visual Helpers ---
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'Online': return 'bg-green-500/20 text-green-500 border-green-500/20';
    case 'Busy': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
    case 'Suspended': return 'bg-red-500/20 text-red-500 border-red-500/20';
    case 'Offline': return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    default: return 'bg-gray-700 text-gray-300';
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Online': return <CheckCircle className="w-3 h-3" />;
    case 'Busy': return <Clock className="w-3 h-3" />;
    case 'Suspended': return <Ban className="w-3 h-3" />;
    case 'Offline': return <AlertCircle className="w-3 h-3" />;
    default: return <User className="w-3 h-3" />;
  }
};

export const getVehicleIcon = (type: string) => {
  return type === 'Car' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />;
};

export const getVerificationColor = (verification: string) => {
  return verification === 'Verified' 
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' 
    : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
};

// --- Mobile Card Component ---
export const RiderCard = ({ 
  rider, onToggleStatus, onDelete 
}: { 
  rider: Rider; 
  onToggleStatus: (rider: Rider) => void; 
  onDelete: (rider: Rider) => void;
}) => (
  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
    <div className="flex justify-between items-start mb-3">
      <Link href={`/super-admin/users/riders/${rider.id}`} className="text-yellow-500 font-mono font-bold text-sm">
        {rider.id}
      </Link>
      <div className="flex items-center gap-1">
        {getStatusIcon(rider.status)}
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(rider.status)}`}>
          {rider.status}
        </span>
      </div>
    </div>
    
    <div className="mb-3 space-y-1">
      <div className="font-bold text-white text-lg">{rider.name}</div>
      <div className="flex items-center gap-2 text-gray-400 text-sm"><Phone className="w-3 h-3" /> {rider.phone}</div>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${rider.type === 'Car' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
          {getVehicleIcon(rider.type)}
        </div>
        <div>
          <div className="text-white font-medium">{rider.vehicle}</div>
          <div className="text-gray-500 text-xs font-mono">{rider.plate}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 text-yellow-500" />
        <div className="text-white font-medium">{rider.rating ? rider.rating.toFixed(1) : '-'}</div>
      </div>
    </div>

    <div className="flex gap-2 pt-3 border-t border-gray-800">
      <Link href={`/super-admin/users/riders/${rider.id}`} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg text-gray-300">
        <Eye className="w-4 h-4" /><span className="text-sm">View</span>
      </Link>
      <button onClick={() => onToggleStatus(rider)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${rider.status === 'Suspended' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
        {rider.status === 'Suspended' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
        <span className="text-sm">{rider.status === 'Suspended' ? 'Activate' : 'Suspend'}</span>
      </button>
      <button onClick={() => onDelete(rider)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 text-red-500 rounded-lg">
        <Trash2 className="w-4 h-4" /><span className="text-sm">Delete</span>
      </button>
    </div>
  </div>
);

// --- Column Generator ---
interface ColumnActions {
  onToggleStatus: (rider: Rider) => void;
  onDelete: (rider: Rider) => void;
}

export const createRiderColumns = ({ onToggleStatus, onDelete }: ColumnActions) => [
  columnHelper.accessor("id", {
    header: "Rider ID",
    cell: info => <Link href={`/super-admin/users/riders/${info.getValue()}`} className="font-mono text-yellow-500 hover:underline text-xs">{info.getValue()}</Link>,
  }),
  columnHelper.accessor("name", {
    header: "Name / Phone",
    cell: info => (
      <div>
        <Link href={`/super-admin/users/riders/${info.row.original.id}`} className="font-bold text-white hover:text-yellow-500 block">{info.getValue()}</Link>
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><Phone className="w-3 h-3" /> {info.row.original.phone}</div>
      </div>
    ),
  }),
  columnHelper.accessor("vehicle", {
    header: "Vehicle",
    cell: info => (
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${info.row.original.type === 'Car' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
          {getVehicleIcon(info.row.original.type)}
        </div>
        <div>
          <div className="text-white font-medium">{info.getValue()}</div>
          <div className="text-xs text-gray-500 font-mono">{info.row.original.plate}</div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: info => (
      <div className="flex items-center gap-1">
        {getStatusIcon(info.getValue())}
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(info.getValue())}`}>{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelper.accessor("verification", {
    header: "Verification",
    cell: info => (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getVerificationColor(info.getValue())}`}>
        {info.getValue() === 'Verified' ? '✓ Verified' : '⚠ Pending'}
      </span>
    ),
  }),
  columnHelper.accessor("rating", {
    header: "Rating",
    cell: info => (
      <div className="flex items-center gap-1 text-yellow-400">
        {info.getValue() ? info.getValue()?.toFixed(1) : '-'}<Star className="w-3 h-3 fill-yellow-400" />
      </div>
    ),
  }),
  columnHelper.accessor("rides", {
    header: "Total Rides",
    cell: info => <span className="text-center font-mono text-white">{info.getValue()}</span>,
  }),
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={`/super-admin/users/riders/${row.original.id}`} className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500"><Eye className="w-4 h-4" /></Link>
        <button onClick={() => onToggleStatus(row.original)} className={`p-2 rounded-lg ${row.original.status === 'Suspended' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {row.original.status === 'Suspended' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
        </button>
        <button onClick={() => onDelete(row.original)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>
    ),
  },
];