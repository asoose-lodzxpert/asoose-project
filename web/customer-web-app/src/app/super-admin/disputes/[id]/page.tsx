"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import useSWR from "swr";
import { getSession } from "next-auth/react";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import DisputeDetailSkeleton from "./component/skeleton";
import { DisputeDetail as BaseDisputeDetail, ModalType } from "./types";
import { Layers, Info, DollarSign, ExternalLink, Banknote } from "lucide-react";

// Sub-components
import DisputeHeader from "./component/DisputeHeader";
import DisputeOverview from "./component/DisputeOverview";
import DisputeChat from "./component/DisputeChat";
import RelatedEntityCard from "./component/RelatedEntityCard";
import DisputeActions from "./component/DisputeActions";
import DisputeTimeline from "./component/DisputeTimeline";
import ResolutionModal from "./component/ResolutionModal";
import ImageLightbox from "./component/ImageLightbox";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");

// Extended Interface for Multi-Vendor Data & Payment Context
interface DisputeDetail extends BaseDisputeDetail {
  effectivePayment?: {
    id: string;
    reference: string;
    amount: number;
    status: string;
    method: string;
    gateway: string;
  };
  siblings?: Array<{
    id: string;
    store: { name: string };
    total: number;
    status: string;
  }>;
}

export default function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setDisputeId(p.id));
  }, [params]);

  const {
    data: dispute,
    isLoading,
    mutate,
  } = useSWR<DisputeDetail>(
    disputeId ? `/super-admin/disputes/${disputeId}` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  // Strict Max Refund Calculation
  // Prioritizes the specific sub-order total over the global payment to prevent over-refunding groups
  const getMaxRefundAmount = () => {
    if (dispute?.order) return dispute.order.total;
    if (dispute?.ride) return dispute.ride.totalFare;
    if (dispute?.delivery) return dispute.delivery.deliveryFee;
    return dispute?.effectivePayment?.amount || 0;
  };

  // Handle Chat Logic
  const handleSendMessage = async (message: string, isInternal: boolean) => {
    if (!disputeId) return;

    try {
      const session = await getSession();
      const authToken = (session as any)?.accessToken;

      const res = await fetch(
        `${API_URL}/super-admin/disputes/${disputeId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ message, isInternal }),
        }
      );

      if (!res.ok) throw new Error("Failed to send message");

      toast.success(isInternal ? "Internal note added" : "Message sent");
      mutate();
    } catch (e) {
      console.error(e);
      toast.error("Failed to send message");
    }
  };

  // Handle Priority Updates
  const handleUpdatePriority = async (priority: string) => {
    if (!disputeId) return;
    try {
      const session = await getSession();
      const authToken = (session as any)?.accessToken;

      await fetch(`${API_URL}/super-admin/disputes/${disputeId}/priority`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ priority }),
      });

      toast.success("Priority updated");
      mutate();
    } catch (e) {
      toast.error("Failed to update priority");
    }
  };

  // Handle Dispute Resolution & Refunds
  const handleResolution = async (
    notes: string,
    refundSource: string,
    amountInput?: string
  ) => {
    if (!dispute || !disputeId) return;
    setProcessing(true);
    try {
      const session = await getSession();
      const authToken = (session as any)?.accessToken;

      const isReject = modalType === "REJECT";
      const endpoint = `${API_URL}/super-admin/disputes/${disputeId}/${
        isReject ? "reject" : "resolve"
      }`;

      const refundAmount =
        modalType === "REFUND_FULL"
          ? getMaxRefundAmount()
          : modalType === "REFUND_PARTIAL"
          ? parseFloat(amountInput || "0")
          : 0;

      const body = isReject
        ? { reason: notes }
        : {
            action: modalType, // REFUND_FULL, REFUND_PARTIAL, RESOLVE_NO_REFUND
            resolutionNotes:
              modalType === "REFUND_PARTIAL"
                ? `Partial Refund: ₦${amountInput} | ${notes}`
                : notes,
            ...(refundAmount > 0 && { refundAmount, refundSource }),
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok)
        throw new Error((await res.json()).message || "Action failed");

      toast.success("Dispute resolved successfully.");
      setModalType(null);
      mutate();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) return <DisputeDetailSkeleton />;
  if (!dispute)
    return (
      <div className="p-20 text-center text-white">Dispute not found.</div>
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
              
              {/* Multi-Vendor Group Order Context */}
              {dispute.siblings && dispute.siblings.length > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2 mb-3">
                    <Layers size={14} /> Group Order Items
                  </h4>
                  <div className="space-y-2">
                    <div className="text-[10px] text-gray-400 mb-2">
                      This order is part of a larger transaction group.
                    </div>
                    {dispute.siblings.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex justify-between items-center text-xs border-b border-purple-500/10 pb-2 last:border-0"
                      >
                        <span className="text-gray-300 font-medium">{s.store.name}</span>
                        <div className="flex flex-col items-end">
                          <span className="text-white font-mono">
                            ₦{s.total.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-gray-500 uppercase">{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <RelatedEntityCard
                order={dispute.order}
                ride={dispute.ride}
                delivery={dispute.delivery}
              />

              {/* Payment Context */}
              <div className="bg-[#1E293B] border border-gray-800 p-4 rounded-xl shadow-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-3">
                  <Banknote size={14} /> Payment Info
                </h4>
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Total Charged</span>
                    <span className="text-sm text-white font-mono font-bold">
                       ₦{dispute.effectivePayment?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
                    </span>
                  </div>
                  
                  <div className="space-y-1 bg-[#0F172A] p-2 rounded border border-gray-700/50">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Gateway Reference</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xs text-blue-400 font-mono break-all cursor-pointer hover:underline truncate" 
                           onClick={() => {
                              navigator.clipboard.writeText(dispute.effectivePayment?.reference || "");
                              toast.success("Reference copied");
                           }}
                           title="Click to copy"
                        >
                          {dispute.effectivePayment?.reference || "N/A"}
                        </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-1">
                     <span className="text-[10px] text-gray-500">Method</span>
                     <span className="text-[10px] text-white bg-gray-700 px-1.5 py-0.5 rounded uppercase">
                        {dispute.effectivePayment?.method || "Unknown"}
                     </span>
                  </div>
                </div>
              </div>

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