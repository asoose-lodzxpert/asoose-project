'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import ImageUpload from '@/app/main/components/ImageUpload';

export type DisputeReferenceType = 'ORDER' | 'RIDE' | 'DELIVERY';

export interface ReportDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceId: string;
  type: DisputeReferenceType;
  onSuccess?: () => void;
}

export default function ReportDisputeModal({ 
  isOpen, 
  onClose, 
  referenceId, 
  type, 
  onSuccess 
}: ReportDisputeModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: session } = useSession();

  const handleImageUpload = (url: string) => {
    if (url) setEvidenceImages(prev => [...prev, url]);
  };

  const getReasonOptions = () => {
    switch (type) {
      case 'RIDE':
        return [
          "Driver did not arrive",
          "Safety concern / Reckless driving",
          "Vehicle mismatch",
          "Overcharged",
          "Other"
        ];
      case 'DELIVERY':
        return [
          "Package damaged",
          "Package missing",
          "Wrong item delivered",
          "Rider unprofessional",
          "Other"
        ];
      default: // ORDER
        return [
          "Items missing",
          "Food quality",
          "Incorrect items",
          "Delivery issue",
          "Other"
        ];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return toast.error("Please select a reason");
    if (!description) return toast.error("Please provide a description");

    const evidenceRequiredReasons = ["Food quality", "Package damaged", "Items missing", "Wrong item delivered"];
    if (evidenceRequiredReasons.includes(reason) && evidenceImages.length === 0) {
       return toast.error("Please upload at least one photo as evidence for this issue.");
    }

    setIsSubmitting(true);
    try {
      const token = (session as any)?.accessToken || (session?.user as any)?.accessToken;
      if (!token) {
        toast.error("Your session has expired. Please log in again.");
        return;
      }

      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

      const payload: any = {
        reason,
        description: description.trim(),
        evidenceImages,
      };

      if (type === 'ORDER') payload.orderId = referenceId;
      else if (type === 'RIDE') payload.rideId = referenceId;
      else if (type === 'DELIVERY') payload.deliveryId = referenceId;

      const res = await fetch(`${API_URL}/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit dispute");
      }

      toast.success("Report submitted successfully.");
      if (onSuccess) onSuccess();
      onClose();
      
      setReason("");
      setDescription("");
      setEvidenceImages([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Modal Container with max-height for small screens */}
      <div className="w-full max-w-md bg-white dark:bg-[#151515] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header - Fixed at top of modal */}
        <div className="p-6 border-b dark:border-white/5 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-black dark:text-white">
            Report Issue - {type === 'ORDER' ? 'Order' : type === 'RIDE' ? 'Ride' : 'Delivery'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors dark:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Reason</label>
              <div className="relative">
                <select 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-white/5 text-zinc-900 dark:text-white rounded-2xl outline-none border border-transparent focus:border-yellow-500 transition-colors appearance-none"
                >
                  <option value="" className="bg-white dark:bg-[#151515] text-zinc-900 dark:text-white">Select a reason</option>
                  {getReasonOptions().map(opt => (
                    <option key={opt} value={opt} className="bg-white dark:bg-[#151515] text-zinc-900 dark:text-white">
                      {opt}
                    </option>
                  ))}
                </select>
                {/* Custom arrow could go here if appearance-none removes the default one */}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Description (Required)</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the issue..."
                className="w-full p-4 bg-gray-50 dark:bg-white/5 text-zinc-900 dark:text-white rounded-2xl h-28 outline-none border border-transparent focus:border-yellow-500 transition-colors resize-none placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Evidence Photos</label>
              <div className="grid grid-cols-2 gap-3">
                <ImageUpload value="" onUpload={handleImageUpload} label="Photo 1" />
                <ImageUpload value="" onUpload={handleImageUpload} label="Photo 2" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-4"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Submit Report"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}