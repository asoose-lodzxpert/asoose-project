'use client';
import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Car, Package, FileText, ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import { DisputeDetail } from '../types';
interface Props {
  order: DisputeDetail['order'];
  ride: DisputeDetail['ride'];
  delivery: DisputeDetail['delivery'];
}

export default function RelatedEntityCard({ order, ride, delivery }: Props) {
  // Determine Type & Data
  let type = 'Transaction';
  let id = '';
  let status = 'N/A';
  let amount = 0;
  let icon = <FileText className="w-5 h-5" />;

  if (order) {
    type = 'Order';
    id = order.id;
    status = order.status;
    amount = order.total;
    icon = <ShoppingBag className="w-5 h-5" />;
  } else if (ride) {
    type = 'Ride';
    id = ride.id;
    status = ride.status;
    amount = ride.totalFare;
    icon = <Car className="w-5 h-5" />;
  } else if (delivery) {
    type = 'Delivery';
    id = delivery.id;
    status = delivery.status;
    amount = delivery.deliveryFee;
    icon = <Package className="w-5 h-5" />;
  }

  const copyId = () => {
    navigator.clipboard.writeText(id);
    toast.success(`${type} ID copied`);
  };

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-bold flex items-center gap-2">
          {icon} {type}
        </h2>
        {id && (
          <Link 
            href={`/super-admin/${type.toLowerCase()}s/${id}`}
            className="text-blue-400 font-mono text-xs hover:underline flex items-center gap-1"
          >
            View <ArrowLeft className="w-3 h-3 rotate-180" />
          </Link>
        )}
      </div>
      
      <div className="bg-[#0F172A] p-4 rounded-xl border border-gray-700 flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 uppercase">Total Value</p>
          <p className="text-white font-bold text-xl">${amount?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="text-right">
            <p className="text-xs text-gray-400 uppercase">Status</p>
            <p className="text-white font-mono text-sm">{status}</p>
        </div>
      </div>

      {/* Specific Details */}
      <div className="space-y-2 text-sm border-t border-gray-700/50 pt-3">
          {order && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Store</span>
                <span className="text-gray-300 truncate max-w-[120px]">{order.store?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Order ID</span>
                <button onClick={copyId} className="text-gray-300 hover:text-white flex items-center gap-1 font-mono text-xs">
                  {id.substring(0,8)}... <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Items</span>
                <span className="text-gray-300">{order.items?.length || 0}</span>
              </div>
            </>
          )}

          {ride && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Distance</span>
                <span className="text-gray-300">{ride.distanceKm?.toFixed(1) || 0} km</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-gray-500">Driver</span>
                 <span className="text-gray-300 truncate max-w-[120px]">{ride.rider?.user?.name || 'Unassigned'}</span>
              </div>
            </>
          )}
      </div>
    </div>
  );
}