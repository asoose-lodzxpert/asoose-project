'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react'; // ✅ Switched to NextAuth
import ImageUpload from '@/app/main/components/ImageUpload'; 

export interface ReportDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onSuccess?: () => void;
}

export default function ReportDisputeModal({ isOpen, onClose, orderId, onSuccess }: ReportDisputeModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ Use NextAuth Hook
  const { data: session } = useSession();

  const handleImageUpload = (url: string) => {
    if (url) setEvidenceImages(prev => [...prev, url]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return toast.error("Please select a reason");

    setIsSubmitting(true);
    try {
      // ✅ Check for NextAuth session
      const token = (session as any)?.accessToken;
      
      if (!token) {
        toast.error("Your session has expired. Please log in again.");
        return;
      }

      const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

      const res = await fetch(`${API_URL}/super-admin/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // ✅ Use NextAuth Token
        },
        body: JSON.stringify({
          reason,
          description: description.trim(),
          orderId,
          evidenceImages, 
          priority: 'MEDIUM' 
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit dispute");
      }

      toast.success("Dispute reported successfully.");
      if (onSuccess) onSuccess();
      onClose();
      
      // Reset form
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#151515] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-6 border-b dark:border-white/5 flex justify-between items-center">
          <h2 className="text-xl font-black italic">Report an Issue</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Reason for Dispute</label>
            <select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none border border-transparent focus:border-yellow-500 transition-colors"
            >
              <option value="">Select a reason</option>
              <option value="Items missing">Items missing from order</option>
              <option value="Food quality">Food quality issues</option>
              <option value="Incorrect items">Incorrect items received</option>
              <option value="Delivery issue">Problem with delivery/rider</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about what happened..."
              className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl h-28 outline-none border border-transparent focus:border-yellow-500 transition-colors resize-none"
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
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
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
  );
}