'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react'; // ✅ Imported MessageSquare
import Swal from 'sweetalert2';
import useSWR from 'swr'; 
import { AppAlert } from '../../customers/[id]/alerts'; 
import { fetcher } from '@/app/super-admin/hooks/useSuperAdminFetch';
import { createClient } from '../../../../../../utils/supabase/client'; // ✅ Import Supabase

// Components
import RiderTabs from './components/ridertabs'; 
import { RiderSidebar } from './components/riderssidebar';
import { RiderOverviewTab } from './components/Rideroverviewtab';
import { RiderLogsTab } from './components/riderslogtabs';
import { RiderPayoutsTab } from './components/RiderpayoutsTab';
import DocumentsTab from '@/app/super-admin/component/documentstab';
import RiderDetailPageSkeleton from './components/skeleton';

// Helper to fix API URL
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + (process.env.NEXT_PUBLIC_API_URL?.endsWith('/api') ? '' : '/api');

// --- Simple Tab Loader ---
const TabLoader = () => (
  <div className="flex flex-col items-center justify-center h-64 animate-in fade-in">
    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
    <p className="text-gray-500 text-xs">Loading tab data...</p>
  </div>
);

export default function RiderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: riderId } = React.use(params);
  const [activeTab, setActiveTab] = useState('Overview');

  // ✅ Helper: Get Auth Header
  const getAuthHeader = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
    };
  };

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  // 1. Fetch Main Rider Profile
  const { 
    data: rider, 
    error, 
    isLoading, 
    mutate: mutateRider 
  } = useSWR<any>(
    riderId ? `/super-admin/riders/${riderId}` : null,
    fetcher
  );

  // 2. Fetch Payouts (Conditionally)
  const { 
    data: payouts, 
    isLoading: isPayoutsLoading, // ✅ Extract loading state
    mutate: mutatePayouts 
  } = useSWR(
    riderId && activeTab === 'Payouts' ? `/super-admin/riders/${riderId}/payouts` : null,
    fetcher
  );

  // --- Handlers ---

  // ✉️ Message Rider
  const handleMessageRider = async () => {
    const { value: text } = await Swal.fire({
      title: 'Message Rider',
      input: 'textarea',
      inputLabel: `Send email to ${rider?.name}`,
      inputPlaceholder: 'Type your message here...',
      showCancelButton: true,
      confirmButtonText: 'Send Email',
      confirmButtonColor: '#3b82f6',
      background: '#1E293B', color: '#fff',
      showLoaderOnConfirm: true,
      preConfirm: async (message) => {
        if (!message) return Swal.showValidationMessage('Message required');
        try {
          const headers = await getAuthHeader();
          const res = await fetch(`${API_URL}/super-admin/riders/${riderId}/message`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message })
          });
          if (!res.ok) throw new Error('Failed to send');
        } catch (error) {
          Swal.showValidationMessage(`Request failed: ${error}`);
        }
      }
    });

    if (text) AppAlert.success('Email Sent to Rider');
  };

  // ✏️ Update Profile
  const handleUpdateProfile = async (data: any) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/super-admin/riders/${riderId}`, {
          method: 'PATCH',
          headers, // ✅ Added Auth
          body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Update failed');
      
      mutateRider(); 
      AppAlert.success('Profile Updated');
    } catch (error) {
      AppAlert.error('Error', 'Failed to update profile');
    }
  };

  // 🚦 Suspend / Reactivate
  const handleToggleStatus = async () => {
    const isSuspending = rider.status !== 'SUSPENDED';
    
    if (isSuspending) {
      const { value: reason } = await Swal.fire({
        title: 'Suspend Rider?',
        input: 'select',
        inputOptions: { 'Low Rating': 'Low Rating', 'Fraud': 'Fraud', 'Other': 'Other' },
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Suspend',
        background: '#1E293B', color: '#fff'
      });

      if (reason) {
         try {
           const headers = await getAuthHeader();
           await fetch(`${API_URL}/super-admin/riders/${riderId}/status`, {
              method: 'PATCH', 
              headers, // ✅ Added Auth
              body: JSON.stringify({ status: 'SUSPENDED' })
           });
           mutateRider();
           AppAlert.success('Rider Suspended');
         } catch (e) {
           AppAlert.error('Error', 'Failed to suspend rider');
         }
      }
    } else {
      try {
        const headers = await getAuthHeader();
        await fetch(`${API_URL}/super-admin/riders/${riderId}/status`, {
          method: 'PATCH', 
          headers, // ✅ Added Auth
          body: JSON.stringify({ status: 'ACTIVE' }) // ✅ Changed OFFLINE to ACTIVE
        });
        mutateRider();
        AppAlert.success('Rider Reactivated');
      } catch (e) {
        AppAlert.error('Error', 'Failed to reactivate rider');
      }
    }
  };

  // 📄 Verify Documents
  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/super-admin/verification/documents/${docId}`, {
        method: 'PATCH',
        headers, // ✅ Added Auth
        body: JSON.stringify({ status, rejectionReason })
      });

      if (!res.ok) throw new Error('Action failed');

      Swal.fire({
        title: status === 'VERIFIED' ? 'Verified' : 'Rejected',
        icon: status === 'VERIFIED' ? 'success' : 'warning',
        toast: true, position: 'top-end', timer: 2000,
        showConfirmButton: false, background: '#1E293B', color: '#fff'
      });

      mutateRider(); 
    } catch (error) {
      Swal.fire({ title: 'Error', text: 'Could not update document', icon: 'error' });
    }
  };

  // 💰 Process Payouts
  const handleProcessPayout = async (payoutId: string, status: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/super-admin/riders/${riderId}/payouts/${payoutId}`, {
        method: 'PATCH',
        headers, // ✅ Added Auth
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Action failed');
      
      mutatePayouts(); 
      mutateRider(); 
      AppAlert.success('Payout Updated');
    } catch (error) {
      AppAlert.error('Error', 'Failed to process payout');
    }
  };

  // --- Render ---

  if (isLoading) return <RiderDetailPageSkeleton/>;

  if (error || !rider) {
    return (
      <div className="min-h-screen bg-[#0F172A] p-10 text-white text-center flex flex-col items-center">
        <p className="text-xl font-bold mb-4">Rider Not Found</p>
        <Link href="/super-admin/users/riders" className="text-yellow-500 hover:underline">Return to List</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <Link href="/super-admin/users/riders" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Riders
            </Link>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Rider Details</h1>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${
                  rider.status === 'ONLINE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                  rider.status === 'SUSPENDED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                  'bg-gray-500/10 text-gray-500 border-gray-500/20'
                }`}>
                  {rider.status}
                </span>
            </div>
          </div>
          
          {/* ✅ Message Button */}
          <button 
            onClick={handleMessageRider}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            <MessageSquare className="w-4 h-4" /> Message Rider
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* LEFT: Sidebar */}
           <div className="lg:col-span-1">
              <RiderSidebar 
                rider={rider} 
                onToggleStatus={handleToggleStatus} 
                onUpdate={handleUpdateProfile} 
              />
           </div>

           {/* RIGHT: Content Tabs */}
           <div className="lg:col-span-2">
              <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[600px] flex flex-col">
                  
                  {/* Tab Navigation */}
                  <div className="flex border-b border-gray-800 overflow-x-auto hide-scrollbar">
                     {['Overview', 'Ride History', 'Documents', 'Logs', 'Payouts'].map(tab => (
                        <button 
                          key={tab} 
                          onClick={() => setActiveTab(tab)} 
                          className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab 
                              ? 'text-yellow-500 border-yellow-500 bg-[#0F172A]' 
                              : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {tab}
                        </button>
                     ))}
                  </div>

                  {/* Tab Content with Loading States */}
                  <div className="flex-1">
                     {activeTab === 'Overview' && (
                       <RiderOverviewTab rider={rider} onRefresh={mutateRider} />
                     )}
                     
                     {activeTab === 'Documents' && (
                       <DocumentsTab 
                          documents={rider?.documents || []} 
                          onVerify={(id) => handleVerifyDocument(id, 'VERIFIED')}
                          onReject={(id, reason) => handleVerifyDocument(id, 'REJECTED', reason)}
                       />
                     )}
                     
                     {activeTab === 'Ride History' && (
                       <RiderTabs 
                         rides={rider.rides || []} 
                         payouts={[]} 
                         onDeleteRide={() => {}} 
                         onProcessPayout={() => {}} 
                         onRetryPayout={() => {}} 
                         onDeletePayout={() => {}} 
                       />
                     )}
                     
                     {activeTab === 'Logs' && (
                       <RiderLogsTab logs={rider.activityLogs || []} />
                     )}
                     
                     {activeTab === 'Payouts' && (
                       // ✅ Added Loading State for Payouts
                       isPayoutsLoading ? <TabLoader /> : (
                         <RiderPayoutsTab 
                           payouts={payouts || []} 
                           onProcess={handleProcessPayout} 
                         />
                       )
                     )}
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}