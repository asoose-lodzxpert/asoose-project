'use client';

import React, { useState } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { createClient } from '../../../../utils/supabase/client';
import ImageUpload from '@/app/main/components/ImageUpload'; 

interface ReportDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

export default function ReportDisputeModal({ isOpen, onClose, orderId }: ReportDisputeModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const handleImageUpload = (url: string) => {
    if (url) setEvidenceImages(prev => [...prev, url]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return toast.error("Please select a reason");

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const res = await fetch(`${API_URL}/super-admin/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          reason,
          description,
          orderId,
          evidenceImages, 
          priority: 'MEDIUM'
        })
      });

      if (!res.ok) throw new Error("Failed to submit dispute");

      toast.success("Dispute reported successfully.");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#151515] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden">
        <div className="p-6 border-b dark:border-white/5 flex justify-between items-center">
          <h2 className="text-xl font-black">Report an Issue</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <select 
            value={reason} 
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl outline-none"
          >
            <option value="">Select a reason</option>
            <option value="Items missing">Items missing from order</option>
            <option value="Food quality">Food quality issues</option>
            <option value="Incorrect items">Incorrect items received</option>
          </select>

          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details..."
            className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl h-24 outline-none"
          />

          {/* Evidence Upload Section */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase ml-1">Evidence Photos</p>
            <div className="grid grid-cols-2 gap-2">
              <ImageUpload bucket="marketplace_assets" onUpload={handleImageUpload} label="Photo 1" />
              <ImageUpload bucket="marketplace_assets" onUpload={handleImageUpload} label="Photo 2" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-yellow-500 py-4 rounded-2xl font-black flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}