'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../hooks/useSuperAdminFetch';
import { ShieldCheck, ExternalLink, CheckCircle2, XCircle, Clock, User } from 'lucide-react';
import VerificationSkeleton from './skeleton';

interface VerificationDoc {
  id: string;
  type: string;
  url: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function VerificationManager() {
  const { data: docs, mutate, isLoading } = useSWR<VerificationDoc[]>(
    '/super-admin/verification/pending', 
    fetcher
  );

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    let rejectionReason = '';
    if (status === 'REJECTED') {
      const reason = prompt('Please provide a reason for rejection:');
      if (!reason) return;
      rejectionReason = reason;
    }

    setProcessingId(id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${apiUrl}/super-admin/verification/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      });

      if (res.ok) {
        mutate(); // Refresh the list
      }
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) return<VerificationSkeleton/>
  return (
    <div className="p-6 bg-[#0F172A] min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-black flex items-center gap-3">
            <ShieldCheck className="text-blue-500 w-8 h-8" /> 
            Identity Verification
          </h1>
          <p className="text-gray-400 mt-2">Process pending documents to activate Vendor and Rider accounts.</p>
        </header>

        {docs?.length === 0 ? (
          <div className="bg-[#1E293B] rounded-3xl p-20 border border-dashed border-gray-800 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-20" />
            <p className="text-gray-500 font-medium">All clear! No documents are currently pending review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs?.map((doc) => (
              <div key={doc.id} className="bg-[#1E293B] rounded-2xl border border-gray-800 overflow-hidden flex flex-col group transition-all hover:border-blue-500/30">
                {/* Header Info */}
                <div className="p-4 bg-black/20">
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded">
                      {doc.user.role}
                    </span>
                    <span className="text-gray-500 text-[10px] flex items-center gap-1">
                      <Clock size={10} /> Pending
                    </span>
                  </div>
                  <h3 className="font-bold truncate">{doc.user.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{doc.user.email}</p>
                </div>

                {/* Document View */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  <img src={doc.url} alt="KYC Document" className="w-full h-full object-contain" />
                  <a 
                    href={doc.url} 
                    target="_blank" 
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 font-bold text-sm"
                  >
                    <ExternalLink size={18} /> View Original
                  </a>
                </div>

                <div className="p-4 border-t border-gray-800 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    {doc.type.replace(/_/g, ' ')}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button 
                      disabled={processingId === doc.id}
                      onClick={() => handleAction(doc.id, 'REJECTED')}
                      className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button 
                      disabled={processingId === doc.id}
                      onClick={() => handleAction(doc.id, 'VERIFIED')}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}