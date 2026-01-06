import React from 'react';
import { VendorMetric } from './data';
export default function TopVendors({ vendors }: { vendors: VendorMetric[] }) {
  return (
    <div className="bg-[#1E293B] p-6 rounded-xl border border-gray-800">
      <h3 className="font-bold text-white mb-6">Top 5 Vendors by Revenue</h3>
      <div className="space-y-4">
        {vendors.map((vendor, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-yellow-500 transition-colors">{vendor.name}</p>
                <p className="text-xs text-green-500">{vendor.change} growth</p>
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-gray-300">{vendor.revenue}</span>
          </div>
        ))}
      </div>
      <button className="w-full mt-6 py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 rounded-lg text-sm font-bold transition-colors">
        View All Vendors
      </button>
    </div>
  );
}