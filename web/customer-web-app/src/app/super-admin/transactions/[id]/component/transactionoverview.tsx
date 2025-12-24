import React from 'react';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { TransactionDetail } from './data';


export default function TransactionOverview({ transaction }: { transaction: TransactionDetail }) {
  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-green-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        
        <div>
          <p className="text-gray-400 text-sm font-bold uppercase mb-1">Total Amount</p>
          <h2 className={`text-4xl md:text-5xl font-black ${transaction.type === 'Credit' ? 'text-green-500' : 'text-white'}`}>
            {transaction.type === 'Credit' ? '+' : '-'}{transaction.amount}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">{transaction.description}</p>
        </div>

        <div className="text-right">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm uppercase mb-2 ${
            transaction.status === 'Success' ? 'bg-green-500/10 text-green-500' : 
            transaction.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
          }`}>
            {transaction.status === 'Success' && <CheckCircle className="w-4 h-4" />}
            {transaction.status === 'Pending' && <Clock className="w-4 h-4" />}
            {transaction.status === 'Failed' && <XCircle className="w-4 h-4" />}
            {transaction.status}
          </div>
          <p className="text-gray-400 text-xs font-mono">{transaction.date}</p>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" /> Payment Breakdown
        </h3>
        <div className="space-y-3">
          {transaction.breakdown.map((item, i) => (
            <div key={i} className={`flex justify-between items-center ${item.isTotal ? 'pt-4 border-t border-gray-700 mt-2' : ''}`}>
              <span className={`${item.isTotal ? 'text-white font-bold text-lg' : 'text-gray-400 text-sm'}`}>
                {item.label}
              </span>
              <span className={`${item.isTotal ? 'text-white font-black text-lg' : 'text-white font-mono'}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}