'use client';
import React from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertCircle, CheckCircle, XCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Dispute } from '../types';

const columnHelper = createColumnHelper<Dispute>();

// Fix 1.1: Remove IN_REVIEW status (Phantom State)
const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN': return 'bg-red-500/20 text-red-500 border-red-500/20';
    case 'RESOLVED': return 'bg-green-500/20 text-green-500 border-green-500/20';
    case 'REJECTED': return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT': return 'bg-red-500 text-white';
    case 'HIGH': return 'bg-orange-500 text-white';
    case 'MEDIUM': return 'bg-yellow-500 text-black';
    case 'LOW': return 'bg-gray-500 text-white';
    default: return 'bg-gray-700 text-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'OPEN': return <AlertCircle className="w-3 h-3" />;
    case 'RESOLVED': return <CheckCircle className="w-3 h-3" />;
    case 'REJECTED': return <XCircle className="w-3 h-3" />;
    default: return <Clock className="w-3 h-3" />;
  }
};

export const disputeColumns = [
  columnHelper.accessor('id', {
    header: 'Dispute ID',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className={`w-1 h-8 rounded-full ${
          info.row.original.breachedSLA ? 'bg-red-500' : 
          info.row.original.priority === 'URGENT' ? 'bg-orange-500' : 
          'bg-gray-700'
        }`} />
        <div className="flex flex-col gap-0.5">
          <Link 
            href={`/super-admin/disputes/${info.getValue()}`} 
            className="font-mono text-white font-bold text-xs hover:text-yellow-400 hover:underline transition-colors"
          >
            #{info.getValue().substring(0, 8)}...
          </Link>
          {info.row.original.breachedSLA ? (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase tracking-wider animate-pulse">
              <AlertTriangle className="w-3 h-3" /> SLA Breach
            </span>
          ) : (
            <span className="text-[10px] text-gray-500">
              {new Date(info.row.original.reportedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => (
      <div className="flex items-center gap-1">
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${getStatusColor(info.getValue())}`}>
           {getStatusIcon(info.getValue())} {info.getValue()}
        </span>
      </div>
    ),
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: info => (
      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getPriorityColor(info.getValue())}`}>
        {info.getValue()}
      </span>
    ),
  }),
  // Backend now returns this string directly
  columnHelper.accessor('relatedAmount', {
    header: 'Value',
    cell: info => (
      <div className="flex flex-col">
         <span className="text-white font-semibold text-sm">{info.getValue() || 'N/A'}</span>
         <span className="text-[10px] text-gray-500">{info.row.original.category}</span>
      </div>
    ),
  }),
  // Backend now returns this string directly
  columnHelper.accessor('parties', {
    header: 'Parties Involved',
    cell: info => (
      <span className="text-gray-400 text-xs truncate max-w-[180px] block" title={info.getValue()}>
        {info.getValue() || 'Unknown'}
      </span>
    ),
  }),
  columnHelper.accessor('hoursOpen', {
    header: 'Aging',
    cell: info => (
      <div className="flex flex-col">
        <span className={`text-xs font-mono font-bold ${info.getValue() > 48 ? 'text-red-400' : 'text-gray-300'}`}>
          {info.getValue()}h
        </span>
        <span className="text-[10px] text-gray-600">Open duration</span>
      </div>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link href={`/super-admin/disputes/${row.original.id}`}>
        <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors group">
           <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </Link>
    ),
  }),
];

export const renderMobileDisputeCard = (dispute: Dispute) => (
  <div className={`bg-[#1E293B] border-l-4 ${dispute.breachedSLA ? 'border-l-red-500' : dispute.priority === 'URGENT' ? 'border-l-orange-500' : 'border-l-gray-700'} border-y border-r border-gray-800 rounded-r-lg p-4 mb-3 shadow-lg`}>
    <div className="flex justify-between items-start mb-3">
      <div>
        <Link href={`/super-admin/disputes/${dispute.id}`} className="text-white font-bold text-sm">
          #{dispute.id.substring(0, 8)}
        </Link>
        <p className="text-xs text-gray-500">{dispute.parties}</p>
      </div>
      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getPriorityColor(dispute.priority)}`}>
        {dispute.priority}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
      <div>Value: <span className="text-white">{dispute.relatedAmount}</span></div>
      <div>Open: <span className={dispute.hoursOpen > 48 ? 'text-red-400' : 'text-white'}>{dispute.hoursOpen}h</span></div>
    </div>
    <Link 
      href={`/super-admin/disputes/${dispute.id}`} 
      className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold text-xs transition-colors"
    >
      View Details
    </Link>
  </div>
);