'use client';
import React from 'react';
import { Copy, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { DisputeDetail } from '../types';
interface Props {
  dispute: DisputeDetail;
  onImageClick: (url: string) => void;
}

export default function DisputeOverview({ dispute, onImageClick }: Props) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'RESOLVED': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'REJECTED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    }
  };

  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-start justify-between mb-6">
        <h2 className="text-lg font-bold text-white">Details</h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${
            dispute.priority === 'URGENT' ? 'bg-red-600 text-white' : 
            dispute.priority === 'HIGH' ? 'bg-orange-500 text-white' : 
            'bg-blue-600 text-white'
          }`}>
            {dispute.priority}
          </span>
          <span className={`px-3 py-1 rounded text-xs font-bold uppercase border flex items-center gap-1 ${getStatusColor(dispute.status)}`}>
            {dispute.status}
          </span>
        </div>
      </div>
      
      <div className="space-y-5 text-sm">
        {/* Reason & Desc */}
        <div>
          <span className="text-gray-400 block mb-1 text-xs uppercase tracking-wider">Issue</span>
          <span className="text-white font-medium text-lg block">{dispute.reason}</span>
          {dispute.description && (
            <p className="text-gray-300 mt-1 leading-relaxed bg-[#0F172A] p-3 rounded-lg border border-gray-700/50">
              {dispute.description}
            </p>
          )}
        </div>
        
        {/* Users Involved */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <span className="text-gray-400 block mb-1 text-xs uppercase tracking-wider">Reported By</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-white font-bold shrink-0">
                {dispute.openedByUser.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <span className="text-white font-medium block truncate">{dispute.openedByUser.name}</span>
                <div className="flex items-center gap-1 text-gray-500 text-xs">
                  <span className="truncate">{dispute.openedByUser.email}</span>
                  <button onClick={() => copyToClipboard(dispute.openedByUser.email, 'Email')}>
                    <Copy className="w-3 h-3 hover:text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {dispute.targetUser && (
            <div>
              <span className="text-gray-400 block mb-1 text-xs uppercase tracking-wider">Against</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold shrink-0">
                  {dispute.targetUser.name.charAt(0)}
                </div>
                <div>
                  <span className="text-white font-medium block">{dispute.targetUser.name}</span>
                  <span className="text-gray-500 text-xs block capitalize bg-gray-800 px-1.5 rounded inline-block">
                    {dispute.targetUser.role.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Evidence Thumbnails */}
        {dispute.evidenceImages && dispute.evidenceImages.length > 0 && (
          <div className="pt-4 border-t border-gray-700/50">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <ImageIcon className="w-3 h-3" /> Evidence
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {dispute.evidenceImages.map((url, idx) => (
                <button 
                  key={idx}
                  onClick={() => onImageClick(url)}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-700 hover:border-yellow-500 transition-all flex-shrink-0 group"
                >
                  <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}