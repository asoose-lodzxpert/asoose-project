'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MessageSquare } from 'lucide-react'; 
import Swal from 'sweetalert2';
import useSWR from 'swr'; 
import { AppAlert } from '../../customers/[id]/alerts'; 
import { fetcher } from '@/app/super-admin/hooks/useSuperAdminFetch';

// Components
import RiderTabs from './components/ridertabs'; 
import { RiderSidebar } from './components/riderssidebar';
import { RiderOverviewTab } from './components/Rideroverviewtab';
import { RiderLogsTab } from './components/riderslogtabs';
import { RiderPayoutsTab } from './components/RiderpayoutsTab';
import DocumentsTab from '@/app/super-admin/component/documentstab';
import RiderDetailPageSkeleton from './components/skeleton';

// --- Simple Tab Loader ---
const TabLoader = () => (
  <div className="flex flex-col items-center justify-center h-64 animate-in fade-in">
    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
    <p className="text-gray-500 text-xs">Loading tab data...</p>
  </div>
);

interface PayoutsResponse {
  data: any[]; 
  meta?: any;
}

export default function RiderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: riderId } = React.use(params);
  const [activeTab, setActiveTab] = useState('Overview');

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const { 
    data: rider, 
    error, 
    isLoading, 
    mutate: mutateRider 
  } = useSWR<any>(
    riderId ? `/super-admin/riders/${riderId}` : null,
    fetcher
  );

  const { 
    data: payouts, 
    isLoading: isPayoutsLoading, 
    mutate: mutatePayouts 
  } = useSWR<PayoutsResponse>(
    riderId && activeTab === 'Payouts' ? `/super-admin/riders/${riderId}/payouts` : null,
    fetcher
  );

  // ===========================================================================
  //  ✅ REFACTORED HANDLERS (Using Fetcher to fix 404s)
  // ===========================================================================

  const handleMessageRider = async () => {
    const { value: message } = await Swal.fire({
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
          // ✅ Standardized fetcher handles URL and Headers automatically
          return await fetcher(`/super-admin/riders/${riderId}/message`, {
            method: 'POST',
            body: JSON.stringify({ message })
          });
        } catch (error: any) {
          Swal.showValidationMessage(`Request failed: ${error.message}`);
        }
      }
    });

    if (message) AppAlert.success('Email Sent to Rider');
  };

  const handleUpdateProfile = async (data: any) => {
    try {
      // ✅ Standardized fetcher handles the PATCH
      await fetcher(`/super-admin/riders/${riderId}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
      });
      mutateRider(); 
      AppAlert.success('Profile Updated');
    } catch (error) {
      AppAlert.error('Error', 'Failed to update profile');
    }
  };

  const handleToggleStatus = async () => {
    const isSuspending = rider.status !== 'SUSPENDED';
    const action = isSuspending ? 'Suspend' : 'Activate';
    
    const { value: confirmed } = await Swal.fire({
      title: `${action} Rider?`,
      text: isSuspending ? "Rider will be blocked from receiving rides." : "Rider access will be restored.",
      icon: isSuspending ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isSuspending ? '#ef4444' : '#10b981',
      confirmButtonText: `Yes, ${action}`,
      background: '#1E293B', color: '#fff'
    });

    if (confirmed) {
      try {
        await fetcher(`/super-admin/riders/${riderId}/status`, {
          method: 'PATCH', 
          body: JSON.stringify({ status: isSuspending ? 'SUSPENDED' : 'ACTIVE' }) 
        });
        mutateRider();
        AppAlert.success(`Rider ${action}d`);
      } catch (e) {
        AppAlert.error('Error', `Failed to ${action.toLowerCase()} rider`);
      }
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => {
    try {
      await fetcher(`/super-admin/verification/documents/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, rejectionReason })
      });
      AppAlert.success(status === 'VERIFIED' ? 'Document Verified' : 'Document Rejected');
      mutateRider(); 
    } catch (error) {
      AppAlert.error('Error', 'Could not update document');
    }
  };

  const handleProcessPayout = async (payoutId: string, status: string) => {
    try {
      await fetcher(`/super-admin/riders/${riderId}/payouts/${payoutId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      mutatePayouts(); 
      mutateRider(); 
      AppAlert.success('Payout Updated');
    } catch (error) {
      AppAlert.error('Error', 'Failed to process payout');
    }
  };

  if (isLoading) return <RiderDetailPageSkeleton/>;

  if (error || !rider) {
    return (
      <div className="min-h-screen bg-[#0F172A] p-10 text-white text-center flex flex-col items-center">
        <p className="text-xl font-bold mb-4 text-gray-400 font-sans">Rider Not Found</p>
        <Link href="/super-admin/users/riders" className="text-yellow-500 hover:underline font-bold">Return to List</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex justify-between items-end">
          <div>
            <Link href="/super-admin/users/riders" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-4 font-bold transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Riders
            </Link>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Rider Dossier</h1>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${
                  rider.status === 'ONLINE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                  rider.status === 'SUSPENDED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                  'bg-gray-500/10 text-gray-500 border-gray-500/20'
                }`}>
                  {rider.status}
                </span>
            </div>
          </div>
          
          <button 
            onClick={handleMessageRider}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
          >
            <MessageSquare className="w-4 h-4" /> Message Rider
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-1">
              <RiderSidebar 
                rider={rider} 
                onToggleStatus={handleToggleStatus} 
                onUpdate={handleUpdateProfile} 
              />
           </div>

           <div className="lg:col-span-2">
              <div className="bg-[#1E293B] border border-gray-800 rounded-2xl overflow-hidden min-h-[600px] flex flex-col shadow-xl">
                  
                  <div className="flex border-b border-gray-800 overflow-x-auto hide-scrollbar bg-[#1e293b]/50">
                      {['Overview', 'Ride History', 'Documents', 'Logs', 'Payouts'].map(tab => (
                        <button 
                          key={tab} 
                          onClick={() => setActiveTab(tab)} 
                          className={`px-6 py-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap uppercase tracking-wider ${
                            activeTab === tab 
                            ? 'text-yellow-500 border-yellow-500 bg-[#0F172A]' 
                            : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                  </div>

                  <div className="flex-1 p-1">
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
                        isPayoutsLoading ? <TabLoader /> : (
                          <RiderPayoutsTab 
                            payouts={payouts?.data || []} 
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