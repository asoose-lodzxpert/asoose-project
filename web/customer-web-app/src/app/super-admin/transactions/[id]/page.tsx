'use client';

import React, { useState, useEffect } from 'react';
import { TransactionDetailSkeleton } from './component/skeleton';
import Swal from 'sweetalert2';
import { TransactionDetail, MOCK_TRANSACTION } from './component/data';
import TransactionHeader from './component/transactionheader';
import TransactionOverview from './component/transactionoverview';
import TransactionTimeline from './component/transactiontimeline';
import TransactionSidebar from './component/transactionsidebar';


export default function TransactionDetailPage({ params }: { params: { id: string } }) {
  const txnId = params.id || 'TXN-901';
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchTransaction = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/transactions/${txnId}`);
        if (response.ok) {
          const data = await response.json();
          setTransaction(data);
        } else {
          console.warn("API unavailable, using mock data");
          setTransaction(MOCK_TRANSACTION);
        }
      } catch (error) {
        console.error("Failed to fetch transaction:", error);
        setTransaction(MOCK_TRANSACTION);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransaction();
  }, [txnId]);

  // --- Handlers ---
  const handleDownload = () => {
    Swal.fire({
      title: 'Downloading...',
      text: 'Your invoice is being generated.',
      icon: 'info',
      background: '#1E293B',
      color: '#fff',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleRefund = async () => {
    const result = await Swal.fire({
      title: 'Refund Transaction?',
      text: "This will reverse the funds to the customer's payment method.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Refund',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      // Simulating API call
      setTimeout(() => {
        if(transaction) {
           setTransaction({ ...transaction, status: 'Refunded' });
        }
        Swal.fire({
          title: 'Refund Processed',
          text: 'The refund has been initiated successfully.',
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308'
        });
      }, 1000);
    }
  };

  if (isLoading || !transaction) {
    return <TransactionDetailSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      
      <TransactionHeader 
        id={transaction.id} 
        status={transaction.status}
        onDownload={handleDownload}
        onRefund={handleRefund}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Overview & Breakdown */}
        <div className="lg:col-span-2 space-y-6">
           <TransactionOverview transaction={transaction} />
           <TransactionTimeline timeline={transaction.timeline} />
        </div>

        {/* RIGHT COLUMN: Sidebar Info */}
        <div className="lg:col-span-1 space-y-6">
           <TransactionSidebar transaction={transaction} />
        </div>

      </div>
    </div>
  );
}