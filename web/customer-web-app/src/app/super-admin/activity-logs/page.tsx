'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Calendar, User, Target, Activity, Eye, ChevronRight } from 'lucide-react';
import { DataTable } from '../component/datatable';
import { fetcher } from '../hooks/useSuperAdminFetch';
import ActivityLogSkeleton from './skeleton';
import LogDetailModal from './components/logDetailModal';
interface ActivityLog {
  id: string;
  action: string;
  target: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role?: string;
  };
  metadata?: any; 
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export default function ActivityLogsPage() {
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = useSWR<ActivityLogsResponse>(
    '/super-admin/activity-logs', 
    fetcher
  );

  // ✅ Handler: Open Details Modal
  const handleViewDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };
  
  const columns = [
    { 
      accessorKey: 'user.name', 
      header: 'Admin',
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{row.original.user?.name || 'System'}</span>
          <span className="text-xs text-gray-500">{row.original.user?.email}</span>
        </div>
      )
    },
    { 
      accessorKey: 'action', 
      header: 'Action',
      cell: ({ row }: any) => (
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
          row.original.action.includes('BAN') || row.original.action.includes('SUSPEND') 
            ? 'bg-red-500/10 text-red-500' 
            : 'bg-blue-500/10 text-blue-500'
        }`}>
          {row.original.action.replace(/_/g, ' ')}
        </span>
      )
    },
    { 
      accessorKey: 'target', 
      header: 'Target ID',
      cell: ({ row }: any) => (
        <span className="font-mono text-xs text-gray-400">
          {row.original.target || '-'}
        </span>
      )
    },
    { 
      accessorKey: 'createdAt', 
      header: 'Timestamp',
      cell: ({ row }: any) => (
        <span className="text-gray-400 text-sm">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      )
    },
    {
      id: 'details',
      header: '',
      cell: ({ row }: any) => (
        <button 
          onClick={() => handleViewDetails(row.original)}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  if (isLoading) {
    return <ActivityLogSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 bg-[#0F172A] min-h-screen pb-24">
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-blue-500 w-6 h-6" />
          System Activity Logs
        </h1>
        <p className="text-gray-400 text-sm mt-1">Monitor all administrative actions and interventions.</p>
      </header>

      {/* Desktop View: DataTable */}
      <div className="hidden md:block bg-[#1E293B] rounded-xl border border-gray-800 overflow-hidden">
        <DataTable 
          data={data?.logs || []} 
          columns={columns} 
        />
      </div>

      {/* Mobile View: Card List */}
      <div className="md:hidden space-y-4">
        {data?.logs && data.logs.length > 0 ? (
          data.logs.map((log) => (
            <div key={log.id} className="bg-[#1E293B] border border-gray-800 rounded-xl p-4 shadow-sm relative">
              
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <User className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{log.user.name}</span>
                    <span className="text-[10px] text-gray-500">{log.user.email}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Activity className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div>
                    <span className="text-gray-500 text-[10px] font-bold uppercase block mb-0.5">Action</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                       log.action.includes('BAN') ? 'bg-red-500/10 text-red-500' : 'text-gray-200'
                    }`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {log.target && (
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="overflow-hidden">
                      <span className="text-gray-500 text-[10px] font-bold uppercase block mb-0.5">Target ID</span>
                      <p className="text-xs text-gray-300 font-mono truncate max-w-[200px]">{log.target}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* View Details Button (Mobile) */}
              <button 
                onClick={() => handleViewDetails(log)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-gray-800/50 hover:bg-gray-800 text-sm text-blue-400 font-medium rounded-lg border border-gray-700 transition-colors"
              >
                <Eye className="w-4 h-4" /> View Full Details
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-[#1E293B] rounded-xl border border-gray-800">
            <Activity className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No logs found.</p>
          </div>
        )}
      </div>

      {/* ✅ Modal Injection */}
      <LogDetailModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        log={selectedLog} 
      />
    </div>
  );
}