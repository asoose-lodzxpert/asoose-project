import React from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import Link from 'next/link';
import { Ride, Payout } from './types';
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, Calendar, 
  User, Eye, ExternalLink, DollarSign, Trash2 
} from 'lucide-react';

const rideColumnHelper = createColumnHelper<Ride>();
const payoutColumnHelper = createColumnHelper<Payout>();

// --- Helper functions for styling (Unchanged) ---



export const getRideStatusColor = (status: string) => {
  switch (status) {
    case 'Completed': return 'bg-green-500/20 text-green-500 border-green-500/20';
    case 'Cancelled': return 'bg-red-500/20 text-red-500 border-red-500/20';
    case 'In Progress': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
  }
};

export const getRideStatusIcon = (status: string) => {
  switch (status) {
    case 'Completed': return <CheckCircle className="w-3 h-3" />;
    case 'Cancelled': return <XCircle className="w-3 h-3" />;
    case 'In Progress': return <Clock className="w-3 h-3" />;
    default: return <AlertTriangle className="w-3 h-3" />;
  }
};

export const getPayoutStatusColor = (status: string) => {
  switch (status) {
    case 'Paid': return 'bg-green-500/20 text-green-500 border-green-500/20';
    case 'Pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
    case 'Failed': return 'bg-red-500/20 text-red-500 border-red-500/20';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
  }
};

// --- Dynamic Column Creators ---

interface RideColumnActions {
  onDelete: (id: string) => void;
}

export const createRideColumns = ({ onDelete }: RideColumnActions) => [
  rideColumnHelper.accessor("id", {
    header: "Ride ID",
    cell: info => (
      <Link href={`/super-admin/rides/${info.getValue()}`} className="font-mono text-yellow-500 hover:text-yellow-400 hover:underline transition-colors text-xs">
        {info.getValue()}
      </Link>
    ),
  }),
  rideColumnHelper.accessor("date", {
    header: "Date/Time",
    cell: info => (
      <div className="flex items-center gap-2">
        <Calendar className="w-3 h-3 text-gray-500" />
        <span className="text-gray-400 text-xs">{info.getValue()}</span>
      </div>
    ),
  }),
  rideColumnHelper.accessor("from", {
    header: "Route",
    cell: info => {
      const ride = info.row.original;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-white text-xs truncate max-w-[120px]">{ride.from}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-white text-xs truncate max-w-[120px]">{ride.to}</span>
          </div>
        </div>
      );
    },
  }),
  rideColumnHelper.accessor("customer", {
    header: "Customer",
    cell: info => (
      <div className="flex items-center gap-2">
        <User className="w-3 h-3 text-gray-500" />
        <span className="text-gray-300">{info.getValue()}</span>
      </div>
    ),
  }),
  rideColumnHelper.accessor("fare", {
    header: "Fare",
    cell: info => <span className="font-bold text-white">{info.getValue()}</span>,
  }),
  rideColumnHelper.accessor("status", {
    header: "Status",
    cell: info => (
      <div className="flex items-center gap-1">
        {getRideStatusIcon(info.getValue())}
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getRideStatusColor(info.getValue())}`}>
          {info.getValue()}
        </span>
      </div>
    ),
  }),
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="View Details">
          <Eye className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(row.original.id)}
          className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors" 
          title="Delete Ride"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    ),
  },
];

interface PayoutColumnActions {
  onProcess: (id: string) => void;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
}

export const createPayoutColumns = ({ onProcess, onRetry, onDelete }: PayoutColumnActions) => [
  payoutColumnHelper.accessor("id", {
    header: "Payout ID",
    cell: info => <span className="font-mono text-yellow-500 text-xs">{info.getValue()}</span>,
  }),
  payoutColumnHelper.accessor("date", {
    header: "Date",
    cell: info => (
      <div className="flex items-center gap-2">
        <Calendar className="w-3 h-3 text-gray-500" />
        <span className="text-gray-400">{info.getValue()}</span>
      </div>
    ),
  }),
  payoutColumnHelper.accessor("amount", {
    header: "Amount",
    cell: info => <span className="font-bold text-white">{info.getValue()}</span>,
  }),
  payoutColumnHelper.accessor("status", {
    header: "Status",
    cell: info => (
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getPayoutStatusColor(info.getValue())}`}>
        {info.getValue()}
      </span>
    ),
  }),
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const payout = row.original;
      return (
        <div className="flex items-center gap-2">
          {payout.status === 'Pending' && (
            <button
              onClick={() => onProcess(payout.id)}
              className="p-2 hover:bg-green-500/10 rounded-lg text-gray-400 hover:text-green-500 transition-colors"
              title="Process Payment"
            >
              <DollarSign className="w-4 h-4" />
            </button>
          )}
          {payout.status === 'Failed' && (
            <button
              onClick={() => onRetry(payout.id)}
              className="p-2 hover:bg-yellow-500/10 rounded-lg text-gray-400 hover:text-yellow-500 transition-colors"
              title="Retry Payment"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
           <button 
            onClick={() => onDelete(payout.id)}
            className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors" 
            title="Delete Payout"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      );
    },
  },
];