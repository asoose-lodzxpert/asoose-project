import React from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import { Activity,Alert } from './data';
import { 
  Clock, ShoppingCart, Car, Package, Truck, Users, ExternalLink, 
  MoreHorizontal, AlertCircle, Eye 
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
const columnHelperActivity = createColumnHelper<Activity>();
const columnHelperAlert = createColumnHelper<Alert>();

// --- Helpers ---
export const getActivityIcon = (type: string) => {
  switch (type) {
    case 'order': return <ShoppingCart className="w-4 h-4" />;
    case 'ride': return <Car className="w-4 h-4" />;
    case 'vendor': return <Package className="w-4 h-4" />;
    case 'delivery': return <Truck className="w-4 h-4" />;
    case 'customer': return <Users className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'HIGH': return 'bg-red-500/20 text-red-500 border-red-500/20';
    case 'MEDIUM': return 'bg-orange-500/20 text-orange-500 border-orange-500/20';
    case 'LOW': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'New': return 'bg-blue-500/20 text-blue-400';
    case 'Ack': return 'bg-yellow-500/20 text-yellow-400';
    case 'Resolved': return 'bg-green-500/20 text-green-400';
    case 'Investigating': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

export const getActivityLink = (activity: Activity) => {
  switch (activity.type) {
    case 'order': return `/super-admin/orders/${activity.event.match(/#ORD-\d+/)?.[0] || ''}`;
    case 'ride': return `/super-admin/rides/${activity.event.match(/#RID-\d+/)?.[0] || ''}`;
    case 'vendor': return `/super-admin/users/vendors/${activity.entity.match(/#VEN-\d+/)?.[0] || ''}`;
    case 'delivery': return `/super-admin/deliveries/${activity.event.match(/#DEL-\d+/)?.[0] || ''}`;
    case 'customer': return `/super-admin/users/customers/${activity.entity.match(/Customer (.+)/)?.[1] || ''}`;
    default: return '#';
  }
};

// --- Activity Columns ---
export const createActivityColumns = () => [
columnHelperActivity.accessor("time", {
  header: "Timestamp",
  cell: info => (
    <div className="flex items-center gap-2">
      <Clock className="w-3 h-3 text-gray-500" />
      {/* Parse the ISO string from backend */}
      <span className="font-mono text-gray-400 text-xs">
        {formatDistanceToNow(parseISO(info.getValue()), { addSuffix: true })}
      </span>
    </div>
  ),
}),
  columnHelperActivity.accessor("event", {
    header: "Event",
    cell: info => (
      <div className="flex items-center gap-2">
        {getActivityIcon(info.row.original.type)}
        <span className="font-medium">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelperActivity.accessor("entity", {
    header: "User/Entity",
    cell: info => <span className="text-gray-300">{info.getValue()}</span>,
  }),
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link href={getActivityLink(row.original)}>
          <button className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400 font-bold text-xs transition-colors">
            <ExternalLink className="w-3 h-3" /> {row.original.action}
          </button>
        </Link>
      </div>
    ),
  },
];

// --- Alert Columns ---
interface AlertActions {
  onResolve: (id: string) => void;
}

export const createAlertColumns = ({ onResolve }: AlertActions) => [
  columnHelperAlert.accessor("severity", {
    header: "Severity",
    cell: info => <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getSeverityColor(info.getValue())}`}>{info.getValue()}</span>,
  }),
  columnHelperAlert.accessor("message", {
    header: "Alert",
    cell: info => (
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-white">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelperAlert.accessor("category", {
    header: "Category",
    cell: info => <span className="text-gray-400 text-xs">{info.getValue()}</span>,
  }),
  columnHelperAlert.accessor("time", {
    header: "Timestamp",
    cell: info => <span className="text-gray-400 text-xs">{info.getValue()}</span>,
  }),
  columnHelperAlert.accessor("status", {
    header: "Status",
    cell: info => <span className={`px-2 py-1 rounded text-xs ${getStatusColor(info.getValue())}`}>{info.getValue()}</span>,
  }),
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button className="p-1.5 hover:bg-blue-500/10 rounded text-gray-400 hover:text-blue-500 transition-colors" title="View Details">
          <Eye className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onResolve(row.original.id)}
          className={`px-3 py-1 rounded font-bold text-xs ${row.original.status === 'New' ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-green-500 hover:bg-green-400 text-black'}`}
        >
          {row.original.status === 'New' ? 'Resolve' : 'Reopen'}
        </button>
      </div>
    ),
  },
];

// --- Mobile Cards ---
export const renderActivityMobileCard = (activity: Activity) => (
  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="font-mono text-gray-400 text-xs">{activity.time}</span>
      </div>
      <span className={`px-2 py-1 rounded text-xs uppercase border border-gray-700 bg-gray-800`}>{activity.type}</span>
    </div>
    <div className="flex items-start gap-2 mb-4 text-sm">
      <div className="p-1.5 bg-gray-800/50 rounded-lg mt-0.5">{getActivityIcon(activity.type)}</div>
      <div className="flex-1">
        <p className="font-medium text-white">{activity.event}</p>
        <p className="text-gray-300 text-xs mt-1">{activity.entity}</p>
      </div>
    </div>
    <div className="flex justify-between items-center pt-3 border-t border-gray-800">
      <Link href={getActivityLink(activity)}>
        <button className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400 font-bold text-xs transition-colors">
          <ExternalLink className="w-3 h-3" /> {activity.action}
        </button>
      </Link>
      <button className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
    </div>
  </div>
);

export const renderAlertMobileCard = (alert: Alert) => (
  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3">
    <div className="flex justify-between items-start mb-3">
      <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getSeverityColor(alert.severity)}`}>{alert.severity}</span>
      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(alert.status)}`}>{alert.status}</span>
    </div>
    <div className="flex items-start gap-2 mb-4 text-sm">
      <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-white">{alert.message}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-gray-400 text-xs">Category: {alert.category}</span>
          <span className="text-gray-500 text-xs">•</span>
          <span className="text-gray-400 text-xs">{alert.time}</span>
        </div>
      </div>
    </div>
    <div className="flex gap-2 pt-3 border-t border-gray-800">
      <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors text-sm">
        <Eye className="w-4 h-4" /><span>View</span>
      </button>
      <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold ${alert.status === 'New' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-black'}`}>
        {alert.status === 'New' ? 'Resolve' : 'Reopen'}
      </button>
    </div>
  </div>
);