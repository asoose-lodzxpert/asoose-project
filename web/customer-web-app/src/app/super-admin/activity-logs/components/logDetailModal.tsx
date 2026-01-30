'use client';

import React from 'react';
import { X, User, Target, Clock, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface LogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: any; // Type strictly with your ActivityLog interface
}

export default function LogDetailModal({ isOpen, onClose, log }: LogDetailModalProps) {
  if (!isOpen || !log) return null;

  // Extract 'reason' from metadata if it exists (common in suspensions)
  const reason = log.metadata?.reason || log.metadata?.cancellationReason || log.metadata?.note;
  const targetId = log.target || log.metadata?.targetId || 'N/A';
  
  // Pretty print JSON
  const formattedMetadata = JSON.stringify(log.metadata, null, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-[#1E293B] border-t md:border border-gray-700 rounded-t-2xl md:rounded-xl w-full md:max-w-2xl shadow-2xl flex flex-col h-[90vh] md:h-auto md:max-h-[90vh] transform transition-all">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-700 flex justify-between items-start bg-gray-800/50 rounded-t-2xl md:rounded-t-xl shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Activity Log Details
            </h3>
            <p className="text-xs md:text-sm text-gray-400 mt-1 font-mono truncate max-w-[200px] md:max-w-md">
              {log.id}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors bg-gray-700/50 rounded-full md:bg-transparent"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Action Badge & Timestamp */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider w-fit ${
              log.action.includes('BAN') || log.action.includes('SUSPEND') ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              log.action.includes('CREATE') ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {log.action.replace(/_/g, ' ')}
            </span>
            <span className="text-gray-400 text-xs md:text-sm flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(log.createdAt), 'PPP p')}
            </span>
          </div>

          {/* CRITICAL: Reason Section (Highlighted) */}
          {reason && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg animate-pulse-slow">
              <h4 className="text-red-400 font-bold text-xs md:text-sm uppercase flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Action Reason
              </h4>
              <p className="text-white text-sm md:text-base leading-relaxed break-words">
                "{reason}"
              </p>
            </div>
          )}

          {/* Actor & Target Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Actor Card */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="text-gray-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Performed By
              </h4>
              <div className="space-y-1">
                <p className="text-white font-medium truncate">{log.user?.name || 'System'}</p>
                <p className="text-xs md:text-sm text-gray-400 truncate">{log.user?.email}</p>
                <span className="inline-block px-2 py-0.5 bg-gray-700 rounded text-[10px] md:text-xs text-gray-300 mt-1">
                  {log.user?.role || 'SYSTEM_PROCESS'}
                </span>
              </div>
            </div>

            {/* Target Card */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="text-gray-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" /> Target Entity
              </h4>
              <div className="space-y-1">
                <p className="text-white font-mono text-xs md:text-sm break-all">{targetId}</p>
                {log.metadata?.entityType && (
                   <p className="text-xs md:text-sm text-blue-400">{log.metadata.entityType}</p>
                )}
              </div>
            </div>
          </div>

          {/* Raw Metadata Viewer */}
          <div className="space-y-2">
            <h4 className="text-gray-400 text-xs font-bold uppercase">Full Metadata Payload</h4>
            <div className="bg-black/50 rounded-lg p-4 border border-gray-700 overflow-x-auto max-h-60">
              <pre className="text-[10px] md:text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                {formattedMetadata}
              </pre>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-none md:rounded-b-xl flex justify-end shrink-0 safe-area-pb">
          <button 
            onClick={onClose}
            className="w-full md:w-auto px-6 py-3 md:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}