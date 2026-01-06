'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle, MoreHorizontal, User, Star, 
  MessageSquare, ShieldAlert, DollarSign, Ban, RotateCcw, CreditCard,
  Loader2, Send
} from 'lucide-react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { MOCK_DISPUTE,DisputeDetail } from './component/data';
import DisputeDetailSkeleton from './component/skeleton';
export default function DisputeDetailPage({ params }: { params: { id: string } }) {
  const disputeId = params.id || 'DIS-001';
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');

  // --- Fetch Data ---
  useEffect(() => {
    const fetchDispute = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/disputes/${disputeId}`);
        if (response.ok) {
          const data = await response.json();
          setDispute(data);
        } else {
          console.warn("API unavailable, using mock data");
          setDispute(MOCK_DISPUTE);
        }
      } catch (error) {
        console.error("Failed to fetch dispute:", error);
        setDispute(MOCK_DISPUTE);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDispute();
  }, [disputeId]);

  // --- Handlers ---
  const handleResolve = async () => {
    const result = await Swal.fire({
      title: 'Resolve Dispute?',
      text: "This will mark the dispute as closed. Ensure all parties are notified.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Resolve',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      // API call to resolve
      if (dispute) setDispute({ ...dispute, status: 'RESOLVED' });
      
      Swal.fire({
        title: 'Resolved!',
        text: 'Dispute marked as resolved.',
        icon: 'success',
        background: '#1E293B',
        color: '#fff',
        confirmButtonColor: '#eab308'
      });
    }
  };

  const handleRefund = async (type: 'Full' | 'Partial') => {
    const result = await Swal.fire({
      title: `Issue ${type} Refund?`,
      text: type === 'Partial' ? "Enter amount:" : "Refund full order amount?",
      input: type === 'Partial' ? 'text' : undefined,
      inputPlaceholder: type === 'Partial' ? '$0.00' : undefined,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Process Refund',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      // API call
      Swal.fire({
        title: 'Refund Processed',
        text: `${type} refund has been issued successfully.`,
        icon: 'success',
        background: '#1E293B',
        color: '#fff',
        confirmButtonColor: '#eab308'
      });
    }
  };

  const handleSuspendUser = async (role: string) => {
    const result = await Swal.fire({
      title: `Suspend ${role}?`,
      text: "This user will be unable to access the platform.",
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Suspend Account',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'User Suspended',
        icon: 'success',
        background: '#1E293B',
        color: '#fff',
        confirmButtonColor: '#eab308'
      });
    }
  };

  const handleSendMessage = () => {
    if(!replyMessage.trim()) return;
    
    // Optimistic Update for UI
    if(dispute) {
      const newMessage = {
        id: Date.now().toString(),
        sender: 'Admin (You)',
        time: new Date().toLocaleString(),
        message: replyMessage,
        type: 'User' as const
      };
      setDispute({
        ...dispute,
        communication: [...dispute.communication, newMessage]
      });
    }
    setReplyMessage('');
  };

  if (isLoading || !dispute) {
    return (
      <DisputeDetailSkeleton/>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dispute Details: {dispute.id}</h1>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
           <Link href="/super-admin/disputes" className="flex-1 md:flex-none justify-center px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden md:inline">Back to Inbox</span><span className="inline md:hidden">Back</span>
           </Link>
           <button 
             onClick={handleResolve}
             className="flex-1 md:flex-none justify-center px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors flex items-center gap-2 text-sm"
           >
              <CheckCircle className="w-4 h-4" /> Mark Resolved
           </button>
           <button className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-2">
              <MoreHorizontal className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (Overview, Entities, Chat) */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Dispute Overview Card */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-6 right-6">
                 <span className={`px-3 py-1 rounded text-xs font-black uppercase border ${
                   dispute.status === 'OPEN' ? 'bg-red-500/20 text-red-500 border-red-500/20' :
                   dispute.status === 'RESOLVED' ? 'bg-green-500/20 text-green-500 border-green-500/20' :
                   'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
                 }`}>
                    {dispute.status}
                 </span>
              </div>
              <h2 className="text-lg font-bold text-white mb-6">Dispute Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                 <div>
                    <span className="text-gray-500 block mb-1 font-bold">Category</span>
                    <span className="text-white font-medium">{dispute.category}</span>
                 </div>
                 <div>
                    <span className="text-gray-500 block mb-1 font-bold">Priority</span>
                    <select className="bg-[#0F172A] border border-gray-700 text-white rounded px-2 py-1 text-xs outline-none focus:border-yellow-500">
                       <option>{dispute.priority}</option>
                       <option>High</option>
                       <option>Medium</option>
                       <option>Low</option>
                    </select>
                 </div>
                 <div className="md:col-span-2">
                    <span className="text-gray-500 block mb-1 font-bold">Subject</span>
                    <span className="text-white font-medium">{dispute.subject}</span>
                 </div>
                 <div className="md:col-span-2">
                    <span className="text-gray-500 block mb-1 font-bold">Reported By</span>
                    <Link href={`/super-admin/users/customers/${dispute.reportedBy.id}`} className="text-yellow-500 font-bold cursor-pointer hover:underline">
                      {dispute.reportedBy.name} ({dispute.reportedBy.id})
                    </Link>
                 </div>
                 <div>
                    <span className="text-gray-500 block mb-1 font-bold">Reported At</span>
                    <span className="text-gray-300 font-mono">{dispute.reportedAt}</span>
                 </div>
                 <div>
                    <span className="text-gray-500 block mb-1 font-bold">Assigned To</span>
                    <select className="bg-[#0F172A] border border-gray-700 text-white rounded px-2 py-1 text-xs w-full outline-none focus:border-yellow-500">
                       <option>{dispute.assignedTo}</option>
                       <option>Unassigned</option>
                    </select>
                 </div>
              </div>
           </div>

           {/* Related Entities & Parties */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">Related Entities</h2>
              <div className="mb-6">
                 <span className="text-gray-400 text-sm">Related {dispute.relatedEntity.type}</span>
                 <Link href="#" className="text-yellow-500 font-bold font-mono ml-2 hover:underline">{dispute.relatedEntity.id}</Link>
                 <span className="ml-3 px-2 py-0.5 bg-green-500/20 text-green-500 text-[10px] uppercase font-bold rounded">{dispute.relatedEntity.status}</span>
                 {dispute.relatedEntity.amount && <span className="ml-2 text-gray-400 text-sm">({dispute.relatedEntity.amount})</span>}
              </div>

              <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">Involved Parties</h2>
              <div className="space-y-4">
                 {dispute.parties.map((party, i) => (
                   <div key={i} className="flex justify-between items-center pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                         <span className="text-gray-400 text-sm font-bold w-20">{party.role}:</span>
                         <span className="text-yellow-500 font-medium">{party.name} ({party.id})</span>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                         {party.rating} <Star className="w-3 h-3 fill-yellow-500" />
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Communication & Notes */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-6">Communication & Internal Notes</h2>
              
              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                 {dispute.communication.map((msg) => (
                   <div key={msg.id} className={`${msg.type === 'System' ? 'bg-[#0F172A]/50 ml-4 border-l-4 border-gray-600' : 'bg-[#0F172A]'} p-4 rounded-xl border border-gray-700`}>
                      <div className="flex justify-between items-center mb-2">
                         <span className={`font-bold text-xs ${msg.type === 'System' ? 'text-gray-400' : 'text-white'}`}>{msg.sender}</span>
                         <span className="text-[10px] text-gray-500">{msg.time}</span>
                      </div>
                      <p className={`text-sm ${msg.type === 'System' ? 'text-gray-500 italic' : 'text-gray-300'}`}>{msg.message}</p>
                   </div>
                 ))}
              </div>

              {/* Input */}
              <div className="relative">
                 <textarea 
                   value={replyMessage}
                   onChange={(e) => setReplyMessage(e.target.value)}
                   placeholder="Add detailed notes or reply..." 
                   className="w-full bg-[#0F172A] border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-yellow-500 outline-none h-24 resize-none"
                 />
                 <div className="absolute bottom-3 right-3 flex gap-2">
                    <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded transition-colors">Internal Note</button>
                    <button onClick={handleSendMessage} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded transition-colors flex items-center gap-1">
                      <Send className="w-3 h-3" /> Reply
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* RIGHT COLUMN (Actions, Audit) */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* Resolution Actions */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Resolution Actions</h2>
              <div className="space-y-3">
                 <button onClick={() => handleRefund('Full')} className="w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <RotateCcw className="w-4 h-4" /> Issue Full Refund
                 </button>
                 <button onClick={() => handleRefund('Partial')} className="w-full py-3 bg-[#0F172A] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <DollarSign className="w-4 h-4" /> Issue Partial Refund
                 </button>
                 <button onClick={() => handleSuspendUser('Vendor')} className="w-full py-3 bg-[#0F172A] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <Ban className="w-4 h-4" /> Suspend Vendor
                 </button>
                 <button onClick={() => handleSuspendUser('Rider')} className="w-full py-3 bg-[#0F172A] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <Ban className="w-4 h-4" /> Suspend Rider
                 </button>
                 <button className="w-full py-3 bg-[#0F172A] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <MoreHorizontal className="w-4 h-4" /> Override Order Status
                 </button>
                 <button className="w-full py-3 bg-[#0F172A] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all">
                    <CreditCard className="w-4 h-4" /> Credit Customer Account
                 </button>
              </div>
           </div>

           {/* Audit Trail */}
           <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Audit Trail & Summary</h2>
              
              <div className="space-y-6 relative border-l border-gray-700 ml-2 pl-6">
                 {dispute.auditTrail.map((audit, i) => (
                   <div key={i} className="relative">
                      <div className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-[#1E293B] ${
                        audit.color === 'red' ? 'bg-red-500' : 
                        audit.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <p className={`text-xs font-bold mb-1 ${
                        audit.color === 'red' ? 'text-red-400' : 
                        audit.color === 'green' ? 'text-green-400' : 'text-yellow-500'
                      }`}>
                        {audit.action} {audit.user && <span className="text-gray-500 font-normal">by {audit.user}</span>}
                      </p>
                      <p className="text-[10px] text-gray-500">{audit.time}</p>
                      {audit.note && (
                        <div className="bg-[#0F172A] p-2 rounded mt-2 border border-gray-700 text-xs text-gray-400">
                           "{audit.note}"
                        </div>
                      )}
                   </div>
                 ))}
              </div>
           </div>

        </div>

      </div>

    </div>
  );
}