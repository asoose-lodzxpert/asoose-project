'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, Filter, Search, MoreHorizontal, AlertCircle, 
  CheckCircle, Clock, Eye, Trash2, User, Calendar, Tag, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { DataTable } from '@/app/super-admin/component/datatable';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import Swal from 'sweetalert2';
import DisputesPageSkeleton from './component/skeleton';

// Types
interface Dispute {
  id: string;
  status: string;
  category: string;
  parties: string;
  relatedType: string;
  reportedBy: string;
  reportedAt: string;
}

// Mock Data
const MOCK_DISPUTES: Dispute[] = [
  { id: 'DIS-001', status: 'OPEN',     category: 'Order',        parties: "John D., Joe's Pizza",        relatedType: 'Order',       reportedBy: 'John D.',  reportedAt: '2024-05-10 15:30' },
  { id: 'DIS-002', status: 'PENDING',  category: 'Ride',         parties: 'Jane S., Sarah J.',           relatedType: 'Ride',        reportedBy: 'Jane S.',  reportedAt: '2024-05-09 10:00' },
  { id: 'DIS-003', status: 'RESOLVED', category: 'Payment',      parties: 'Mark L.',                     relatedType: 'Transaction', reportedBy: 'Mark L.',  reportedAt: '2024-05-08 18:00' },
  { id: 'DIS-004', status: 'OPEN',     category: 'Delivery',     parties: 'Alex K., Courier Mike',       relatedType: 'Delivery',    reportedBy: 'Alex K.',  reportedAt: '2024-05-07 11:45' },
  { id: 'DIS-005', status: 'PENDING',  category: 'User Conduct', parties: 'Rider Laura P., Emily B.',    relatedType: 'Ride',        reportedBy: 'Laura P.', reportedAt: '2024-05-06 09:00' },
  { id: 'DIS-006', status: 'OPEN',     category: 'Order',        parties: 'Chris R., Green Eats',        relatedType: 'Order',       reportedBy: 'Chris R.', reportedAt: '2024-05-05 17:00' },
];

const columnHelper = createColumnHelper<Dispute>();

export default function DisputesPage() {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [rowSelection, setRowSelection] = useState({});
  const [disputes, setDisputes] = useState<Dispute[]>(MOCK_DISPUTES);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle

  // --- Data Fetching ---
  useEffect(() => {
    const fetchDisputes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/disputes');
        if (response.ok) {
          const data = await response.json();
          setDisputes(data);
        } else {
          console.warn("API unavailable, using mock data");
          setDisputes(MOCK_DISPUTES);
        }
      } catch (error) {
        console.error("Failed to fetch disputes:", error);
        setDisputes(MOCK_DISPUTES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  // --- Handlers ---
  const handleDeleteDispute = async (dispute: Dispute) => {
    const result = await Swal.fire({
      title: 'Delete Dispute?',
      html: `
        <div class="text-left text-gray-300">
          <p class="mb-2">Are you sure you want to delete this dispute?</p>
          <div class="bg-[#1E293B] p-3 rounded-lg border border-gray-700 mt-3">
            <p class="text-sm font-bold text-yellow-500">${dispute.id}</p>
            <p class="text-xs text-gray-400 mt-1">Category: ${dispute.category}</p>
          </div>
          <p class="text-red-400 text-sm font-bold mt-3">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        // API Call
        const res = await fetch(`/api/disputes/${dispute.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');

        // Update State
        setDisputes(prev => prev.filter(d => d.id !== dispute.id));

        Swal.fire({
          title: 'Deleted!',
          text: `Dispute ${dispute.id} has been deleted.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308',
          timer: 1500
        });
      } catch (error) {
        Swal.fire({ title: 'Error', text: 'Failed to delete dispute.', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  const handleExport = () => {
    const csv = [
      ['Dispute ID', 'Status', 'Category', 'Parties', 'Related Type', 'Reported By', 'Reported At'].join(','),
      ...filteredDisputes.map(d =>
        [d.id, d.status, d.category, d.parties, d.relatedType, d.reportedBy, d.reportedAt].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'disputes.csv';
    a.click();
  };

  // --- Helpers ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-500/20 text-red-500 border-red-500/20';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
      case 'RESOLVED': return 'bg-green-500/20 text-green-500 border-green-500/20';
      default: return 'bg-gray-700 text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="w-3 h-3" />;
      case 'PENDING': return <Clock className="w-3 h-3" />;
      case 'RESOLVED': return <CheckCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  // --- Filter Logic ---
  const filteredDisputes = useMemo(() => {
    return disputes.filter(dispute => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        !term || 
        dispute.id.toLowerCase().includes(term) ||
        dispute.parties.toLowerCase().includes(term) ||
        dispute.reportedBy.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === 'All' || dispute.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || dispute.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchTerm, statusFilter, categoryFilter, disputes]);

  // --- Columns ---
  const columns = useMemo<ColumnDef<Dispute, any>[]>(() => [
    columnHelper.accessor('id', {
      header: 'Dispute ID',
      cell: info => (
        <Link href={`/super-admin/disputes/${info.getValue()}`} className="font-mono text-yellow-500 hover:text-yellow-400 hover:underline transition-colors text-xs">
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <div className="flex items-center gap-1">
          {getStatusIcon(info.getValue())}
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(info.getValue())}`}>
            {info.getValue()}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: info => <span className="text-white">{info.getValue()}</span>,
    }),
    columnHelper.accessor('parties', {
      header: 'Parties',
      cell: info => <span className="text-gray-400 text-xs truncate max-w-[200px]">{info.getValue()}</span>,
    }),
    columnHelper.accessor('reportedBy', {
      header: 'Reported By',
      cell: info => <span className="text-white">{info.getValue()}</span>,
    }),
    columnHelper.accessor('reportedAt', {
      header: 'Reported At',
      cell: info => <span className="text-xs font-mono text-gray-500">{info.getValue()}</span>,
    }),
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link href={`/super-admin/disputes/${row.original.id}`}>
            <button className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors" title="View Dispute">
              <Eye className="w-4 h-4" />
            </button>
          </Link>
          <button onClick={() => handleDeleteDispute(row.original)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Delete Dispute">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], []);

  // --- Mobile Card ---
const DisputeCard = ({ dispute }: { dispute: Dispute }) => (
  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 mb-3 transition-all duration-200 hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/30">
    <div className="flex justify-between items-start mb-3">
      <Link href={`/super-admin/disputes/${dispute.id}`} className="text-yellow-500 font-mono font-bold text-sm hover:text-yellow-400 transition-colors">
        {dispute.id}
      </Link>
      <div className="flex items-center gap-1">
        {getStatusIcon(dispute.status)}
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(dispute.status)}`}>
          {dispute.status}
        </span>
      </div>
    </div>
    <div className="space-y-2 mb-4 text-sm">
      <div className="flex items-start gap-2">
        <Tag className="w-4 h-4 text-gray-500 mt-0.5" />
        <div><span className="text-gray-500 text-xs">Category:</span> <span className="text-white font-medium">{dispute.category}</span></div>
      </div>
      <div className="flex items-start gap-2">
        <User className="w-4 h-4 text-gray-500 mt-0.5" />
        <div><span className="text-gray-500 text-xs">Parties:</span> <span className="text-gray-400 text-xs">{dispute.parties}</span></div>
      </div>
      <div className="flex items-start gap-2">
        <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
        <div><span className="text-gray-500 text-xs">Reported At:</span> <span className="text-gray-500 text-xs font-mono">{dispute.reportedAt}</span></div>
      </div>
    </div>
    <div className="flex gap-2 pt-3 border-t border-gray-800">
      <Link href={`/super-admin/disputes/${dispute.id}`} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 transition-colors">
        <Eye className="w-4 h-4" /><span className="text-sm">View</span>
      </Link>
      <button onClick={() => handleDeleteDispute(dispute)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-colors">
        <Trash2 className="w-4 h-4" /><span className="text-sm">Delete</span>
      </button>
    </div>
  </div>
);

  const renderMobileCard = (dispute: Dispute) => <DisputeCard dispute={dispute} />;

  if (isLoading) {
    return (
      <DisputesPageSkeleton/>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Dispute Resolution</h1>
            <p className="text-gray-400 text-sm mt-1">Showing {filteredDisputes.length} disputes</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            {/* Mobile Filter Toggle */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-center p-2 border border-gray-700 rounded-lg transition-colors text-gray-300 hover:bg-gray-800"
            >
              <Filter className="w-4 h-4" />
            </button>

            <button onClick={handleExport} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export Disputes</span><span className="inline md:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* Filters Section (Collapsible on Mobile) */}
        <div className={`bg-[#1E293B] p-4 md:p-5 rounded-xl border border-gray-800 space-y-4 ${showFilters ? 'block' : 'hidden'} md:block`}>
          <h2 className="font-bold text-lg text-white">Filter Disputes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="ID, Parties, User..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 cursor-pointer">
                <option>All</option><option>OPEN</option><option>PENDING</option><option>RESOLVED</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Category</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 cursor-pointer">
                <option>All</option><option>Order</option><option>Ride</option><option>Payment</option><option>Delivery</option><option>User Conduct</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setSearchTerm(''); setStatusFilter('All'); setCategoryFilter('All'); }} className="px-4 py-2 border border-gray-600 text-gray-400 font-bold rounded-lg hover:bg-gray-800 transition-colors text-sm">Clear Filters</button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden flex-1 min-h-0">
          <DataTable
            data={filteredDisputes}
            columns={columns}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            pageSize={10}
            renderMobileCard={renderMobileCard}
          />
        </div>

      </div>
    </div>
  );
}