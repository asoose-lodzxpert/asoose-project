'use client';

import useSWR from 'swr';
import { Calendar, User, Target, Activity } from 'lucide-react';
import { DataTable } from '../component/datatable';
import { fetcher } from '../hooks/useSuperAdminFetch';
import ActivityLogSkeleton from './skeleton';

interface ActivityLog {
  id: string;
  action: string;
  target: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
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
  const { data, isLoading } = useSWR<ActivityLogsResponse>(
    '/super-admin/activity-logs', 
    fetcher
  );
  
  const columns = [
    { 
      accessorKey: 'user.name', 
      header: 'Admin' 
    },
    { accessorKey: 'action', header: 'Action' },
    { accessorKey: 'target', header: 'Target' },
    { 
      accessorKey: 'createdAt', 
      header: 'Timestamp',
      cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleString()
    }
  ];

  // ✅ FIX: Explicitly return the skeleton component
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
        <p className="text-gray-400 text-sm mt-1">Monitor all administrative actions across the platform.</p>
      </header>

      {/* Desktop View: DataTable (Hidden on Mobile) */}
      <div className="hidden md:block bg-[#1E293B] rounded-xl border border-gray-800 overflow-hidden">
        <DataTable 
          data={data?.logs || []} 
          columns={columns} 
        />
      </div>

      {/* Mobile View: Card List (Hidden on Desktop) */}
      <div className="md:hidden space-y-4">
        {data?.logs && data.logs.length > 0 ? (
          data.logs.map((log) => (
            <div key={log.id} className="bg-[#1E293B] border border-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-bold">{log.user.name}</span>
                </div>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Activity className="w-4 h-4 text-gray-500 mt-0.5" />
                  <p className="text-sm text-gray-200">
                    <span className="text-gray-400 uppercase text-[10px] font-bold block">Action</span>
                    {log.action}
                  </p>
                </div>

                {log.target && (
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-gray-500 mt-0.5" />
                    <p className="text-sm text-gray-200">
                      <span className="text-gray-400 uppercase text-[10px] font-bold block">Target</span>
                      {log.target}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-[#1E293B] rounded-xl border border-gray-800">
            <Activity className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No logs found.</p>
          </div>
        )}
      </div>
    </div>
  );
}