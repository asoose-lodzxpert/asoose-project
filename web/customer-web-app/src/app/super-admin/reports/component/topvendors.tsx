import React from 'react';
import { ArrowUpRight, ArrowDownRight, Store } from 'lucide-react';

export default function TopVendors({ vendors }: { vendors: any[] }) {
  if (!vendors || vendors.length === 0) return null;

  // Find max revenue to calculate relative bar width
  const maxRevenue = Math.max(...vendors.map(v => v.revenue));

  return (
    <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-white">Top Vendors</h3>
        <button className="text-xs text-yellow-500 hover:text-yellow-400 font-bold">View All</button>
      </div>
      
      <div className="space-y-3">
        {vendors.map((vendor, i) => (
          <div key={i} className="group relative cursor-pointer">
            {/* Visual Bar Background */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gray-700/30 rounded-lg transition-all duration-500 group-hover:bg-gray-700/50"
              style={{ width: `${(vendor.revenue / maxRevenue) * 100}%` }}
            />
            
            <div className="relative flex items-center justify-between p-3 rounded-lg z-10">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'
                }`}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-yellow-500 transition-colors">
                    {vendor.name}
                  </p>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    {vendor.orders} orders
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-mono font-bold text-white">
                  ${vendor.revenue.toLocaleString()}
                </p>
                <span className={`text-[10px] flex items-center justify-end gap-0.5 ${vendor.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {vendor.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(vendor.change)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}