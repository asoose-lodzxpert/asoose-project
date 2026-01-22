'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { getSession } from 'next-auth/react'; // ✅ Import NextAuth
import { fetcher } from '../../hooks/useSuperAdminFetch';
import DisputeDetailSkeleton from './component/skeleton';
import { DisputeDetail, ModalType } from './types';

// Sub-components
import DisputeHeader from './component/DisputeHeader';
import DisputeOverview from './component/DisputeOverview';
import DisputeChat from './component/DisputeChat';
import RelatedEntityCard from './component/RelatedEntityCard';
import DisputeActions from './component/DisputeActions';
import DisputeTimeline from './component/DisputeTimeline';
import ResolutionModal from './component/ResolutionModal';
import ImageLightbox from './component/ImageLightbox';

interface DisputeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DisputeDetailPage({ params }: DisputeDetailPageProps) {
  // --- UI State ---
  const [modalType, setModalType] = useState<ModalType>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);

  // --- Unwrap params Promise ---
  useEffect(() => {
    params.then((resolvedParams) => {
      setDisputeId(resolvedParams.id);
    });
  }, [params]);

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const { 
    data: dispute, 
    error, 
    isLoading, 
    mutate 
  } = useSWR<DisputeDetail>(
    disputeId ? `/super-admin/disputes/${disputeId}` : null,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true
    }
  );

  // --- Helpers ---
  const getMaxRefundAmount = () => {
    if (dispute?.order) return dispute.order.total;
    if (dispute?.ride) return dispute.ride.totalFare;
    if (dispute?.delivery) return dispute.delivery.deliveryFee;
    return 0;
  };

  // ===========================================================================
  //  HANDLERS (Includes Audit Logging logic on the Backend)
  // ===========================================================================

  const handleSendMessage = async (message: string, isInternal: boolean) => {
    if (!disputeId) return;
    
    // Optimistic UI Update
    if (dispute) {
       const optimisticMsg = {
         id: 'temp-' + Date.now(),
         message,
         isInternal,
         sender: 'You',
         createdAt: new Date().toISOString(),
         isAdmin: true
       };
       mutate({ ...dispute, messages: [...dispute.messages, optimisticMsg as any] }, false);
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      // ✅ FIX: Use NextAuth Session
      const session = await getSession();
      const authToken = (session as any)?.accessToken;

      const res = await fetch(`${API_URL}/super-admin/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ message, isInternal })
      });

      if (!res.ok) throw new Error('Failed');
      
      toast.success(isInternal ? 'Internal note added' : 'Message sent');
      mutate(); 

    } catch (e) {
      toast.error('Failed to send message');
      mutate(); 
    }
  };

  const handleUpdatePriority = async (priority: string) => {
    if (!disputeId) return;
    try {
      // ✅ FIX: Use NextAuth Session
      const session = await getSession();
      const authToken = (session as any)?.accessToken;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      await fetch(`${API_URL}/super-admin/disputes/${disputeId}/priority`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ priority })
      });

      toast.success('Priority updated');
      mutate(); 
    } catch (e) {
      toast.error('Failed to update priority');
    }
  };

  const handleResolution = async (input: string) => {
    if (!dispute || !disputeId) return;
    setProcessing(true);
    try {
      // ✅ FIX: Use NextAuth Session
      const session = await getSession();
      const authToken = (session as any)?.accessToken;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      let endpoint = `${API_URL}/super-admin/disputes/${disputeId}/resolve`;
      let body: any = {};

      if (modalType === 'REJECT') {
        endpoint = `${API_URL}/super-admin/disputes/${disputeId}/reject`;
        body = { reason: input };
      } else {
        let action = 'NO_REFUND';
        let refundAmount = 0;
        if (modalType === 'REFUND_FULL') {
          action = 'REFUND_FULL';
          refundAmount = getMaxRefundAmount() || 0;
        } else if (modalType === 'REFUND_PARTIAL') {
          action = 'REFUND_PARTIAL';
          refundAmount = parseFloat(input);
        }
        body = {
          action,
          resolutionNotes: `Resolution: ${action}. ${modalType === 'RESOLVE_NO_REFUND' ? input : ''}`,
          ...(refundAmount > 0 && { refundAmount, refundSource: 'PLATFORM' })
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Action failed');
      
      toast.success('Dispute resolved. Action has been recorded in audit logs.');
      setModalType(null);
      mutate(); 

    } catch (e) {
      toast.error('Failed to process request');
    } finally {
      setProcessing(false);
    }
  };

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isLoading) return <DisputeDetailSkeleton />;
  if (error || !dispute) return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">
        Dispute not found or access denied.
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <DisputeHeader 
          id={dispute.id} 
          status={dispute.status} 
          breachedSLA={dispute.breachedSLA} 
          hoursOpen={dispute.hoursOpen} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* DisputeOverview now handles the Evidence Gallery layout internally */}
            <DisputeOverview 
              dispute={dispute} 
              onImageClick={setSelectedImage} 
            />
            
            <DisputeChat 
              messages={dispute.messages} 
              canAddMessage={dispute.canAddMessage} 
              onSendMessage={handleSendMessage} 
            />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="sticky top-6 space-y-6">
              <RelatedEntityCard 
                order={dispute.order} 
                ride={dispute.ride} 
                delivery={dispute.delivery} 
              />
              <DisputeActions 
                priority={dispute.priority}
                canResolve={dispute.canResolve}
                status={dispute.status}
                totalAmount={getMaxRefundAmount() || 0}
                onUpdatePriority={handleUpdatePriority}
                onOpenModal={setModalType}
              />
              <DisputeTimeline dispute={dispute} />
            </div>
          </div>
        </div>
      </div>

      <ResolutionModal 
        isOpen={!!modalType}
        type={modalType}
        maxRefundAmount={getMaxRefundAmount() || 0}
        isProcessing={processing}
        onClose={() => setModalType(null)}
        onConfirm={handleResolution}
      />

      <ImageLightbox 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </div>
  );
}