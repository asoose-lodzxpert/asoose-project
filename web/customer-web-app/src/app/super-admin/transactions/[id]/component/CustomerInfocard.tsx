import React from 'react';
import { User } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { TransactionDetail } from '../types';
interface CustomerProps {
  customer: NonNullable<TransactionDetail['customer']>;
  isBankRecipient?: boolean;
}

export const CustomerInfoCard = ({ customer, isBankRecipient }: CustomerProps) => {
  return (
    <SectionCard 
      title={isBankRecipient ? 'Recipient' : 'Customer'} 
      icon={User} 
      iconColorClass="bg-blue-500/20 text-blue-500"
    >
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-xs mb-2">Name</p>
          <p className="text-white font-medium text-lg">{customer.name}</p>
        </div>
        {customer.email && (
          <div>
            <p className="text-gray-400 text-xs mb-2">Email</p>
            <p className="text-white text-sm">{customer.email}</p>
          </div>
        )}
        {customer.phone && (
          <div>
            <p className="text-gray-400 text-xs mb-2">Phone</p>
            <p className="text-white text-sm">{customer.phone}</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
};