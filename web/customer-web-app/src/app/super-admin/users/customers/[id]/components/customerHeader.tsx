import React from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, CheckCircle, Ban } from 'lucide-react';
import { CustomerProfile } from '../types';
interface CustomerHeaderProps {
  customer: CustomerProfile;
  onToggleStatus: () => void;
  onSendMessage: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({ 
  customer, 
  onToggleStatus, 
  onSendMessage 
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <Link href="/super-admin/users/customers" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
        <div className="flex items-center gap-3">
           <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
              customer.status === 'ACTIVE' ? 'bg-green-500/20 text-green-500 border-green-500/20' : 'bg-red-500/20 text-red-500 border-red-500/20'
           }`}>
              {customer.status}
           </span>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onSendMessage} className="px-4 py-2 bg-[#1E293B] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 flex items-center gap-2 transition-colors text-sm font-medium">
          <MessageSquare className="w-4 h-4" /> Message
        </button>
        
        <button 
          onClick={onToggleStatus}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors text-sm font-medium ${
            customer.status === 'BANNED'
              ? 'bg-green-600 text-white border-green-600 hover:bg-green-500'
              : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
          }`}
        >
          {customer.status === 'BANNED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
          {customer.status === 'BANNED' ? 'Activate Account' : 'Ban Account'}
        </button>
      </div>
    </div>
  );
};