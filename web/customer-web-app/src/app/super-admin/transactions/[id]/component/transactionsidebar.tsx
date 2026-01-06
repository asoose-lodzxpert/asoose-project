import React from 'react';
import Link from 'next/link';
import { CreditCard, ShoppingBag, Car, ExternalLink, AlertCircle } from 'lucide-react';
import { TransactionDetail } from '../data';

export default function TransactionSidebar({ transaction }: { transaction: TransactionDetail }) {
  return (
    <div className="space-y-6">
      {/* Payment Method */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Payment Method</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600/20 text-blue-500 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-white font-bold">{transaction.method}</p>
            <p className="text-xs text-gray-500">Gateway Ref: {transaction.reference}</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">User Details</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
            {transaction.user.name.charAt(0)}
          </div>
          <div>
            <p className="text-white font-bold">{transaction.user.name}</p>
            <p className="text-xs text-yellow-500">{transaction.user.role}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm border-t border-gray-700 pt-3">
          <div className="flex justify-between">
            <span className="text-gray-500">ID</span>
            <Link href={`/super-admin/users/customers/${transaction.user.id}`} className="text-blue-400 hover:underline">
              {transaction.user.id}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-300 truncate max-w-[150px]">{transaction.user.email}</span>
          </div>
        </div>
      </div>

      {/* Related Entity */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Related {transaction.relatedEntity.type}</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${
            transaction.relatedEntity.type === 'Order' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'
          }`}>
            {transaction.relatedEntity.type === 'Order' ? <ShoppingBag className="w-5 h-5" /> : <Car className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-white font-bold">{transaction.relatedEntity.id}</p>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500/20 text-green-500">
              {transaction.relatedEntity.status}
            </span>
          </div>
        </div>
        <Link 
          href={transaction.relatedEntity.link} 
          className="w-full py-2 bg-[#0F172A] border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
        >
          View Details <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Support */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Need Help?</h3>
        <p className="text-xs text-gray-500 mb-4">
          If this transaction looks suspicious, flag it immediately.
        </p>
        <button className="w-full py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all">
          <AlertCircle className="w-4 h-4" /> Report Fraud
        </button>
      </div>
    </div>
  );
}