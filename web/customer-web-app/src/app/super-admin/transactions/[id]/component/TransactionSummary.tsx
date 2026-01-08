import { DollarSign, CreditCard, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { TransactionDetail } from '../types';
export const TransactionSummary = ({ txn }: { txn: TransactionDetail }) => {
  const isCredit = txn.type.includes('Payment') || txn.type.includes('Earning') || txn.type.includes('Top-up') || txn.type.includes('Received');
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-green-500/20 text-green-500 border-green-500/20';
      case 'Failed': return 'bg-red-500/20 text-red-500 border-red-500/20';
      case 'Processing': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/20';
    }
  };

  const StatusIcon = txn.status === 'Success' ? CheckCircle : 
                     txn.status === 'Failed' ? XCircle : 
                     txn.status === 'Processing' ? Clock : AlertCircle;

  return (
    <div className="bg-[#1E293B] border border-gray-700 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isCredit ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCredit ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
              {isCredit ? <DollarSign className="w-6 h-6 text-green-500" /> : <CreditCard className="w-6 h-6 text-orange-500" />}
            </div>
          </div>
          <div>
            <h2 className="text-white text-3xl font-bold">
              {isCredit ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
            </h2>
            <p className="text-gray-400 text-sm">{txn.description}</p>
          </div>
        </div>
        
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${getStatusColor(txn.status)} border`}>
          <StatusIcon className="w-4 h-4" />
          <span className="font-semibold">{txn.status}</span>
        </div>
      </div>

      {txn.paymentInfo?.failureReason && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{txn.paymentInfo.failureReason}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          <p className="text-gray-400 text-xs">Transaction Type</p>
          <p className="text-white font-medium">{txn.type}</p>
        </div>
        <div className="space-y-2">
          <p className="text-gray-400 text-xs">Date & Time</p>
          <p className="text-white font-medium">{new Date(txn.date).toLocaleString()}</p>
        </div>
        <div className="space-y-2">
          <p className="text-gray-400 text-xs">Payment Method</p>
          <p className="text-white font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> {txn.method}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-gray-400 text-xs">Reference</p>
          <div className="flex items-center gap-2">
            <p className="text-white font-mono text-sm">{txn.reference}</p>
            <CopyButton text={txn.reference} label="Reference" />
          </div>
        </div>
      </div>
    </div>
  );
};