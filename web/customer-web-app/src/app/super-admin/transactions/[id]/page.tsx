'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import useSWR from 'swr'; 
import { fetcher } from '../../hooks/useSuperAdminFetch';

import { TransactionDetail } from './types'; 
import TransactionHeader from './component/TransactionHeader';
import { TransactionSummary } from './component/TransactionSummary';
import { Timeline } from './component/Timeline';
import { OrderDetailsCard } from './component/OrderDetailsCard';
import { RideDetailsCard } from './component/RideDetailsCard';
import { CustomerInfoCard } from './component/CustomerInfocard';
import { BankInfoCard } from './component/BankInfoCard';
import { VehicleInfoCard } from './component/VechicleInfoCard';
import { PayoutInfoCard } from './component/PayoutInfoCard';
import { RecentActivityCard } from './component/RecentActivityCard';
import { WalletBalanceCard } from './component/WalletBalanceCard';
import { TransactionDetailSkeleton } from './component/skeleton';

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  
  const [downloading, setDownloading] = useState(false);

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const { data: txn, error, isLoading } = useSWR<TransactionDetail>(
    transactionId ? `/super-admin/transactions/${transactionId}` : null,
    fetcher,
    {
      onError: () => {
        toast.error('Failed to load transaction');
        // Optional: router.push('/super-admin/transactions'); 
      }
    }
  );

  // --- Handlers ---

  const handleDownload = async () => {
    if (!txn) return;
    setDownloading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // We use standard fetch here because this is a specific action (POST/Blob), not data retrieval
      const session = await import('../../../../../utils/supabase/client').then(m => m.createClient().auth.getSession());
      
      const response = await fetch(`${API_URL}/super-admin/transactions/${txn.id}/receipt`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`
        },
        body: JSON.stringify(txn)
      });
      
      if (!response.ok) throw new Error('Failed to generate receipt');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${txn.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  // --- Render ---

  if (isLoading) return <TransactionDetailSkeleton />;
  if (error || !txn) return <div className="p-10 text-center text-white">Transaction not found</div>;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <TransactionHeader 
          onDownload={handleDownload} 
          onShare={handleShare} 
          isDownloading={downloading} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <TransactionSummary txn={txn} />
            
            {txn.orderDetails && <OrderDetailsCard details={txn.orderDetails} financialBreakdown={txn.financialBreakdown} />}
            
            {txn.rideDetails && txn.ridePricing && (
              <RideDetailsCard details={txn.rideDetails} pricing={txn.ridePricing} />
            )}
            
            <Timeline timeline={txn.timeline} />
          </div>

          {/* Right Column - Side Info */}
          <div className="space-y-6">
            {txn.customer && <CustomerInfoCard customer={txn.customer} isBankRecipient={!!txn.bankInfo} />}
            {txn.bankInfo && <BankInfoCard info={txn.bankInfo} />}
            {txn.vehicleInfo && <VehicleInfoCard info={txn.vehicleInfo} />}
            {txn.payoutInfo && <PayoutInfoCard info={txn.payoutInfo} />}
            {txn.recentActivity && <RecentActivityCard activity={txn.recentActivity} />}
            {txn.balanceBefore !== undefined && txn.balanceAfter !== undefined && (
              <WalletBalanceCard 
                before={txn.balanceBefore} 
                after={txn.balanceAfter} 
                amount={txn.amount} 
                isCredit={txn.type.includes('Payment') || txn.type.includes('Received')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}