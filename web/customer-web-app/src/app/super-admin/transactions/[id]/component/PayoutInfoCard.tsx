import React from 'react';
import { FileText } from 'lucide-react';
import { CopyButton } from './CopyButton';
import { SectionCard } from './SectionCard';
import { TransactionDetail } from '../types';
export const PayoutInfoCard = ({ info }: { info: NonNullable<TransactionDetail['payoutInfo']> }) => {
  return (
    <SectionCard title="Payout Information" icon={FileText} iconColorClass="bg-yellow-500/20 text-yellow-500">
      <div className="space-y-4">
        {info.reference && (
          <div>
            <p className="text-gray-400 text-xs mb-2">Reference</p>
            <div className="flex items-center justify-between">
              <p className="text-white font-mono text-sm">{info.reference}</p>
              <CopyButton text={info.reference} label="Reference" />
            </div>
          </div>
        )}
        <div>
          <p className="text-gray-400 text-xs mb-2">Method</p>
          <p className="text-white font-medium">{info.method}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-2">Requested</p>
          <p className="text-white text-sm">{new Date(info.requestedAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs mb-2">Status</p>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            info.status === 'PAID' ? 'bg-green-500/20 text-green-500' :
            info.status === 'FAILED' ? 'bg-red-500/20 text-red-500' :
            'bg-yellow-500/20 text-yellow-500'
          }`}>
            {info.status}
          </span>
        </div>
      </div>
    </SectionCard>
  );
};