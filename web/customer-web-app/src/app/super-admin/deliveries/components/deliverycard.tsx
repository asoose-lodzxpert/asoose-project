import Link from 'next/link'; // ✅ Import Link
import { Package, FileText, MapPin, MoreVertical, Truck } from 'lucide-react';

type Delivery = {
  id: string;
  type?: string;
  sender: string;
  recipient: string;
  driver: string;
  status: string;
  pickup: string;
  dropoff: string;
  eta?: string;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'In Transit': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Delivered': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'Pending Pickup': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'Failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-gray-700 text-gray-300';
  }
};

export function DeliveryCard({ delivery }: { delivery: Delivery }) {
  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors">
      {/* Header: ID + Type */}
      <div className="flex justify-between items-start mb-3 gap-2">
        <div className="flex items-center gap-2">
          {delivery.type?.includes('Document') ? 
            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" /> : 
            <Package className="w-4 h-4 text-orange-400 flex-shrink-0" />
          }
          <span className="font-mono text-yellow-500 font-bold text-sm">
            {delivery.id}
          </span>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border flex-shrink-0 ${getStatusColor(delivery.status)}`}>
          {delivery.status}
        </span>
      </div>

      {/* Type Badge */}
      <div className="mb-3">
        <span className="text-xs text-gray-400 font-medium">{delivery.type || 'Package'}</span>
      </div>

      {/* Route Information */}
      <div className="space-y-2 mb-3 bg-[#0F172A] p-3 rounded-lg border border-gray-800">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Pickup</p>
            <p className="text-sm text-white truncate">{delivery.pickup}</p>
          </div>
        </div>
        <div className="border-l-2 border-dashed border-gray-700 ml-1.5 h-2"></div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Dropoff</p>
            <p className="text-sm text-white truncate">{delivery.dropoff}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 mb-3 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 flex-shrink-0">Sender:</span>
          <span className="text-gray-300 truncate text-right">{delivery.sender}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 flex-shrink-0">Recipient:</span>
          <span className="text-gray-300 truncate text-right">{delivery.recipient}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 flex-shrink-0">Driver:</span>
          <span className={`truncate text-right ${delivery.driver === '-' ? 'text-gray-600 italic' : 'text-gray-300'}`}>
            {delivery.driver === '-' ? 'Unassigned' : delivery.driver}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 flex-shrink-0">ETA:</span>
          <span className="text-gray-300 font-mono text-xs flex-shrink-0">{delivery.eta || 'N/A'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-800">
        {/* ✅ FIX: Changed button to Link and added href */}
        <Link 
          href={`/super-admin/deliveries/${delivery.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
        >
          <Truck className="w-4 h-4" />
          <span className="text-sm">Track</span>
        </Link>
        
        <button className="px-4 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}