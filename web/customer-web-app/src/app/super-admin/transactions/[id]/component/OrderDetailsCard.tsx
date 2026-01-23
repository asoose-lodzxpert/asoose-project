import React from 'react';
import Link from 'next/link';
import { Package, ExternalLink } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { TransactionDetail } from '../types';
import { Currency } from '@/app/main/components/Currency'; // ✅ Added

interface OrderDetailsProps {
  details: NonNullable<TransactionDetail['orderDetails']>;
  financialBreakdown?: TransactionDetail['financialBreakdown'];
}

export const OrderDetailsCard = ({ details, financialBreakdown }: OrderDetailsProps) => {
  const action = (
    <Link 
      href={`/super-admin/orders/${details.orderId}`}
      className="text-yellow-500 hover:text-yellow-400 text-sm font-medium flex items-center gap-2"
    >
      View Order <ExternalLink className="w-3 h-3" />
    </Link>
  );

  return (
    <SectionCard 
      title="Order Details" 
      icon={Package} 
      iconColorClass="bg-blue-500/20 text-blue-500"
      action={action}
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-gray-400 text-xs">Order ID</p>
            <p className="text-white font-mono text-sm">{details.orderId}</p>
          </div>
          <div className="space-y-2">
            <p className="text-gray-400 text-xs">Vendor</p>
            <p className="text-white font-medium">{details.vendor}</p>
          </div>
          <div className="space-y-2">
            <p className="text-gray-400 text-xs">Commission Rate</p>
            <p className="text-orange-500 font-medium">{details.commissionRate}%</p>
          </div>
        </div>

        {/* Items List */}
        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-white font-medium mb-4">Items Ordered</h4>
          <div className="space-y-3">
            {details.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg">
                <div className="flex items-center gap-3">
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <p className="text-white font-medium">{item.name}</p>
                    {/* ✅ Fixed: Formatted item price */}
                    <p className="text-gray-400 text-sm">Qty: {item.qty} × <Currency amount={item.price} /></p>
                  </div>
                </div>
                {/* ✅ Fixed: Formatted item total */}
                <span className="text-white font-bold"><Currency amount={item.total} /></span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown */}
        {financialBreakdown && (
          <div className="border-t border-gray-700 pt-6">
            <h4 className="text-white font-medium mb-4">Financial Breakdown</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                {/* ✅ Fixed: Formatted subtotal */}
                <span className="text-white"><Currency amount={details.subtotal} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform Commission ({details.commissionRate}%)</span>
                {/* ✅ Fixed: Formatted commission */}
                <span className="text-orange-500">-<Currency amount={financialBreakdown.platformCommission} /></span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-700">
                <span className="text-gray-300 font-medium">Vendor Receives</span>
                <span className="text-green-500 font-bold text-lg">
                  {/* ✅ Fixed: Formatted vendor amount */}
                  <Currency amount={financialBreakdown.vendorReceives} />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
};