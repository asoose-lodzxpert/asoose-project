'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import useSWR from 'swr'; 
import { getSession } from 'next-auth/react';
import { Inter } from 'next/font/google'; 
import Swal from 'sweetalert2'; // ✅ Added Missing Import
import { fetcher } from '../../hooks/useSuperAdminFetch';
import { TransactionDetail } from './types'; 
import TransactionHeader from './component/transactionheader';
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
import { Currency } from '@/app/main/components/Currency';

// Initialize font
const inter = Inter({ subsets: ['latin'] });

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [isVerifying, setIsVerifying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ===========================================================================
  //  DATA FETCHING
  // ===========================================================================

  const { data: txn, error, isLoading, mutate } = useSWR<TransactionDetail>(
    transactionId ? `/super-admin/transactions/${transactionId}` : null,
    fetcher,
    {
      onError: () => {
        toast.error('Failed to load transaction details');
      }
    }
  );

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleDownload = async () => {
    if (!txn) return;
    setDownloading(true);
    const toastId = toast.loading("Generating receipt...");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const session = await getSession();
      const token = (session as any)?.accessToken;
      
      if (!token) throw new Error('Authentication required');
      
      const response = await fetch(`${API_URL}/super-admin/transactions/${txn.id}/receipt`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) throw new Error('Receipt generation failed on server');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `Receipt-${txn.reference || txn.id.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast.update(toastId, { 
        render: "Receipt downloaded successfully", 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.update(toastId, { 
        render: "Failed to download receipt", 
        type: "error", 
        isLoading: false, 
        autoClose: 3000 
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Transaction link copied to clipboard');
  };

  // ✅ FEATURE 3: Re-Verify Action
  const handleVerify = async () => {
    if (!transactionId) return;

    setIsVerifying(true);
    try {
      const session = await getSession();
      const token = (session as any)?.accessToken;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Call the new backend endpoint
      const res = await fetch(`${API_URL}/super-admin/transactions/${transactionId}/verify`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Verification failed');

      Swal.fire({
        title: 'Verified',
        text: `Gateway Response: ${result.data?.status || 'Processed'}`,
        icon: 'success',
        background: '#1E293B', color: '#fff',
        timer: 2000, showConfirmButton: false
      });

      mutate(); // Refresh UI to show new status (e.g., CONFIRMED)
    } catch (error: any) {
      Swal.fire({
        title: 'Error',
        text: error.message,
        icon: 'error',
        background: '#1E293B', color: '#fff'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) return <TransactionDetailSkeleton />;
  
  if (error || !txn) {
    return (
      <div className={`min-h-screen bg-[#0F172A] flex items-center justify-center ${inter.className}`}>
        <div className="text-center space-y-4">
          <p className="text-gray-400 text-lg">Transaction record not found</p>
          <button 
            onClick={() => router.push('/super-admin/transactions')}
            className="text-yellow-500 hover:underline font-bold"
          >
            Back to Transactions
          </button>
        </div>
      </div>
    );
  }

  // Logic: Show button only for PENDING/FAILED transactions that have a reference to check
  const canVerify = ['PENDING', 'FAILED', 'PROCESSING'].includes(txn.status) && !!txn.reference;

  return (
    <div className={`min-h-screen bg-[#0F172A] p-4 md:p-8 ${inter.className}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ✅ Pass Verification Props to Header */}
        <TransactionHeader 
          onDownload={handleDownload} 
          onShare={handleShare} 
          isDownloading={downloading} 
          reference={txn.reference}
          status={txn.status}
          amount={<Currency amount={txn.amount} className="text-xl" />}
          
          // New props
          onVerify={handleVerify}
          isVerifying={isVerifying}
          canVerify={canVerify}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Financial Ledger Details */}
          <div className="lg:col-span-2 space-y-6">
            <TransactionSummary txn={txn} />
            
            {txn.orderDetails && (
              <OrderDetailsCard 
                details={txn.orderDetails} 
                financialBreakdown={txn.financialBreakdown} 
              />
            )}
            
            {txn.rideDetails && txn.ridePricing && (
              <RideDetailsCard 
                details={txn.rideDetails} 
                pricing={txn.ridePricing} 
              />
            )}
            
            <Timeline timeline={txn.timeline} />
          </div>

          {/* Right Column - Contextual Sidecards */}
          <div className="space-y-6">
            {txn.customer && (
              <CustomerInfoCard 
                customer={txn.customer} 
                isBankRecipient={!!txn.bankInfo} 
              />
            )}
            {txn.bankInfo && <BankInfoCard info={txn.bankInfo} />}
            {txn.vehicleInfo && <VehicleInfoCard info={txn.vehicleInfo} />}
            {txn.payoutInfo && <PayoutInfoCard info={txn.payoutInfo} />}
            {txn.recentActivity && <RecentActivityCard activity={txn.recentActivity} />}
            
            {txn.balanceBefore !== undefined && txn.balanceAfter !== undefined && (
              <WalletBalanceCard 
                before={txn.balanceBefore} 
                after={txn.balanceAfter} 
                amount={txn.amount} 
                isCredit={['PAYMENT_RECEIVED', 'WALLET_TOPUP', 'VENDOR_EARNING', 'RIDER_EARNING'].includes(txn.type)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}