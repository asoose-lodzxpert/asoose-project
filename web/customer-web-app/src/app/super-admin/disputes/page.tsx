'use client';

import React, { useState, useMemo } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import useSWR from 'swr'; // ✅ Import SWR
import { DataTable } from '@/app/super-admin/component/datatable';
import DisputesPageSkeleton from './component/skeleton';
import { fetcher } from '../hooks/useSuperAdminFetch';
// Imported Components
import DisputeHeader from './component/DisputeHeader';
import DisputeStatsCard from './component/DisputeStatsCard';
import DisputeFilters from './component/DisputeFilters';
import { disputeColumns, renderMobileDisputeCard } from './component/table-config';
import { Dispute, DisputeStats } from './types';

// API Response Interface
interface DisputesApiResponse {
  data: any[]; // Raw data from backend before mapping
  total: number;
}

export default function DisputesPage() {
  // ===========================================================================
  //  UI STATE
  // ===========================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All'); 
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  // 1. Fetch Stats (Independent of filters)
  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useSWR<DisputeStats>('/super-admin/disputes/stats', fetcher);

  // 2. Build Query String for Disputes
  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      skip: (pagination.pageIndex * pagination.pageSize).toString(),
      take: pagination.pageSize.toString(),
    });

    if (statusFilter !== 'All') params.append('status', statusFilter);
    if (priorityFilter !== 'All') params.append('priority', priorityFilter);
    if (searchTerm) params.append('search', searchTerm);

    return params.toString();
  }, [pagination, statusFilter, priorityFilter, searchTerm]);

  // 3. Fetch Disputes List
  const { 
    data: disputesData, 
    isLoading: disputesLoading,
    mutate 
  } = useSWR<DisputesApiResponse>(
    `/super-admin/disputes?${queryString}`, 
    fetcher,
    { keepPreviousData: true }
  );

  // ===========================================================================
  //  DATA MAPPING & PROCESSING
  // ===========================================================================

  // Map raw backend data to UI Dispute objects
  // We use useMemo so this only runs when the API data actually changes
  const mappedDisputes: Dispute[] = useMemo(() => {
    if (!disputesData?.data) return [];

    return disputesData.data.map((d: any) => ({
        id: d.id,
        status: d.status,
        priority: d.priority,
        // Determine category based on relations
        category: d.order ? 'Order' : d.ride ? 'Ride' : d.delivery ? 'Delivery' : 'General',
        relatedType: d.order ? 'Order' : d.ride ? 'Ride' : 'N/A',
        // Format Currency
        relatedAmount: d.order 
          ? `$${d.order.total.toFixed(2)}` 
          : d.ride 
            ? `$${d.ride.totalFare?.toFixed(2) || '0.00'}` 
            : '$0.00',
        // Format Parties
        parties: d.targetUser 
          ? `${d.openedByUser?.name} vs ${d.targetUser.name}` 
          : `${d.openedByUser?.name} vs Platform`,
        reportedBy: d.openedByUser?.name || 'Unknown',
        reportedAt: d.createdAt,
        messageCount: d.messageCount || 0,
        isUrgent: d.priority === 'URGENT' || d.priority === 'HIGH',
        hoursOpen: d.hoursOpen || 0,
        breachedSLA: d.breachedSLA || false
    }));
  }, [disputesData]);

  // Client-side category filtering (if needed locally)
  const filteredDisputes = useMemo(() => {
    return mappedDisputes.filter(d => categoryFilter === 'All' || d.category === categoryFilter);
  }, [categoryFilter, mappedDisputes]);

  const total = disputesData?.total || 0;
  const isLoading = statsLoading || disputesLoading;

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset page on tab change

    switch (tab) {
      case 'All':
        setStatusFilter('All');
        setPriorityFilter('All');
        break;
      case 'Needs Attention':
        setStatusFilter('OPEN');
        setPriorityFilter('All');
        break;
      case 'Urgent':
        setStatusFilter('OPEN');
        setPriorityFilter('URGENT');
        break;
      case 'Resolved':
        setStatusFilter('RESOLVED');
        setPriorityFilter('All');
        break;
    }
  };

  const clearFilters = () => {
    handleTabChange('All');
    setCategoryFilter('All');
    setSearchTerm('');
  };

  const handleExport = () => {
    const csvRows = [];
    csvRows.push(['ID', 'Status', 'Priority', 'Category', 'Reported By', 'Date']);
    
    mappedDisputes.forEach(d => {
      csvRows.push([d.id, d.status, d.priority, d.category, d.reportedBy, d.reportedAt]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `disputes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isLoading && !disputesData) return <DisputesPageSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <DisputeHeader total={total} onExport={handleExport} />
        
        <DisputeStatsCard stats={stats || { open: 0, urgent: 0, resolved: 0, slaBreached: 0 }} />
        
        <DisputeFilters 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          stats={stats}
        />

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
          {filteredDisputes.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <div className="bg-gray-800 p-4 rounded-full mb-4">
                <Filter className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-white font-bold text-lg">No disputes found</h3>
              <p className="text-gray-500 text-sm max-w-xs mt-2">
                We couldn't find any disputes matching your current filters.
              </p>
              <button 
                onClick={clearFilters}
                className="mt-6 text-yellow-500 hover:text-yellow-400 text-sm font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
                {/* Optional: Add manual refresh if data seems stale */}
                <div className="w-full flex justify-end p-2 md:hidden">
                    <button onClick={() => mutate()} className="text-gray-500 text-xs flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                </div>

                <DataTable
                data={filteredDisputes}
                columns={disputeColumns}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                pagination={pagination}
                onPaginationChange={setPagination}
                pageCount={Math.ceil(total / pagination.pageSize)}
                renderMobileCard={renderMobileDisputeCard}
                />
            </>
          )}
        </div>

      </div>
    </div>
  );
}