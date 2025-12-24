'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Download,
  Plus,
  Search,
  Eye,
  Trash2,
  Star,
  Loader2,
  Filter,
} from 'lucide-react';
import { DataTable } from '@/app/super-admin/component/datatable';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import Swal from 'sweetalert2';
import VendorManagementPageSkeleton from './component/skeleton';
// Import the Modal Component
import AddVendorModal from './component/addvendorModal';
// --- Types ---
interface Vendor {
  id: string;
  name: string;
  email: string;
  category: string;
  status: string;
  verification: string;
  rating: number | null;
  orders: number;
}

// --- Mock Data (Fallback) ---
const MOCK_VENDORS: Vendor[] = [
  { id: 'VDR-001', name: "Joe's Pizza", email: 'joe@pizza.com', category: 'Restaurant', status: 'Active', verification: 'Verified', rating: 4.8, orders: 1234 },
  { id: 'VDR-002', name: 'FreshMart', email: 'fresh@mart.com', category: 'Grocery', status: 'Pending', verification: 'Pending', rating: null, orders: 0 },
  { id: 'VDR-003', name: 'Pharmacy Now', email: 'now@pharm.com', category: 'Pharmacy', status: 'Disabled', verification: 'Verified', rating: 3.9, orders: 56 },
  { id: 'VDR-004', name: 'Fashion Hub', email: 'fashion@hub.com', category: 'General Goods', status: 'Active', verification: 'Verified', rating: 4.2, orders: 210 },
  { id: 'VDR-005', name: 'Bookworm Cafe', email: 'book@cafe.com', category: 'Restaurant', status: 'Pending', verification: 'Unverified', rating: null, orders: 0 },
  { id: 'VDR-006', name: 'Tech Gadgets', email: 'tech@gadgets.com', category: 'General Goods', status: 'Active', verification: 'Verified', rating: 4.9, orders: 789 },
  { id: 'VDR-007', name: 'Green Grocer', email: 'green@grocer.com', category: 'Grocery', status: 'Active', verification: 'Verified', rating: 4.7, orders: 450 },
  { id: 'VDR-008', name: 'Pet Palace', email: 'pet@palace.com', category: 'General Goods', status: 'Rejected', verification: 'Unverified', rating: null, orders: 0 },
];

const columnHelper = createColumnHelper<Vendor>();

export default function VendorManagementPage() {
  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [rowSelection, setRowSelection] = useState({});
  
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- Data Fetching ---
  const fetchVendors = useCallback(async () => {
    // Only set loading to true on initial load or manual refresh, 
    // for modal updates we might want a silent refresh, but here we show spinner for clarity
    // remove setIsLoading(true) here if you want silent update after adding
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      } else {
        console.warn("API unavailable, using mock data");
        // Only set mock data if vendors list is empty (initial load fail)
        if (vendors.length === 0 || vendors === MOCK_VENDORS) {
           setVendors(MOCK_VENDORS);
        }
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      if (vendors.length === 0) setVendors(MOCK_VENDORS);
    } finally {
      setIsLoading(false);
    }
  }, [vendors]);

  // Initial Load
  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Helpers & Handlers ---
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-500 border-green-500/20';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
      case 'Disabled': return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
      case 'Rejected': return 'bg-red-500/20 text-red-500 border-red-500/20';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const getVerificationColor = (verification: string) => {
    switch (verification) {
      case 'Verified': return 'bg-blue-500/20 text-blue-400';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-500';
      case 'Unverified': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Vendor?',
      text: "You won't be able to revert this!",
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
        const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');

        setVendors(prev => prev.filter(v => v.id !== id));

        Swal.fire({
          title: 'Deleted!',
          text: 'Vendor has been removed.',
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308',
          timer: 2000,
          timerProgressBar: true,
        });
      } catch (error) {
        Swal.fire({ title: 'Error', text: 'Failed to delete vendor.', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  const handleExport = () => {
    const csv = [
      ['Vendor ID', 'Name', 'Email', 'Category', 'Status', 'Verification', 'Rating', 'Orders'].join(','),
      ...filteredVendors.map(v =>
        [v.id, v.name, v.email, v.category, v.status, v.verification, v.rating ?? 'N/A', v.orders].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendors.csv';
    a.click();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All Status');
    setCategoryFilter('All');
    setVerificationFilter('All');
  };

  // --- Filtering Logic ---
  const filteredVendors = useMemo(() => 
    vendors.filter(vendor => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = !term || vendor.name.toLowerCase().includes(term) || vendor.id.toLowerCase().includes(term) || vendor.email.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'All Status' || vendor.status === statusFilter;
      const matchesCategory = categoryFilter === 'All' || vendor.category === categoryFilter;
      const matchesVerification = verificationFilter === 'All' || vendor.verification === verificationFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesVerification;
    }),
    [searchQuery, statusFilter, categoryFilter, verificationFilter, vendors],
  );

  // --- Columns Definitions ---
  const columns = useMemo<ColumnDef<Vendor, any>[]>(
    () => [
      columnHelper.accessor('id', {
        header: 'Vendor ID',
        cell: info => (
          <Link href={`/super-admin/users/vendors/${info.getValue()}`} className="font-mono text-yellow-500 hover:text-yellow-400 hover:underline transition-colors text-xs">
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: info => <span className="font-bold text-white truncate">{info.getValue()}</span>,
      }),
      columnHelper.accessor('email', {
        header: 'Contact Email',
        cell: info => <span className="text-gray-400 truncate">{info.getValue()}</span>,
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: info => <span className="truncate">{info.getValue()}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: info => {
          const status = info.getValue();
          return <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(status)}`}>{status}</span>;
        },
      }),
      columnHelper.accessor('verification', {
        header: 'Verification',
        cell: info => {
          const verification = info.getValue();
          return <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex w-fit items-center gap-1 ${getVerificationColor(verification)}`}>{verification === 'Verified' && '✓'} {verification}</span>;
        },
      }),
      columnHelper.accessor('rating', {
        header: 'Rating',
        cell: info => {
          const rating = info.getValue();
          return rating ? <div className="flex items-center gap-1 text-yellow-400">{rating.toFixed(1)} <Star className="w-3 h-3 fill-yellow-400" /></div> : <span className="text-gray-600">-</span>;
        },
      }),
      columnHelper.accessor('orders', {
        header: 'Total Orders',
        cell: info => <span className="font-mono text-white">{info.getValue().toLocaleString()}</span>,
      }),
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link href={`/super-admin/users/vendors/${row.original.id}`}>
              <button className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors" title="View Details">
                <Eye className="w-4 h-4" />
              </button>
            </Link>
            <button onClick={() => handleDelete(row.original.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="Delete Vendor">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // --- Mobile Card ---
  const VendorCard = ({ vendor }: { vendor: Vendor }) => (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors mb-3">
      <div className="flex justify-between items-start mb-3">
        <Link href={`/super-admin/users/vendors/${vendor.id}`} className="text-yellow-500 hover:text-yellow-400 font-mono font-bold text-sm transition-colors">{vendor.id}</Link>
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(vendor.status)}`}>{vendor.status}</span>
      </div>
      <div className="space-y-2 mb-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-bold text-white truncate ml-2 text-right">{vendor.name}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Category:</span><span className="text-gray-300">{vendor.category}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Verification:</span><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getVerificationColor(vendor.verification)}`}>{vendor.verification}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Rating:</span>{vendor.rating ? <div className="flex items-center gap-1 text-yellow-400">{vendor.rating.toFixed(1)} <Star className="w-3 h-3 fill-yellow-400" /></div> : <span className="text-gray-600">-</span>}</div>
      </div>
      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <Link href={`/super-admin/users/vendors/${vendor.id}`} className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"><Eye className="w-4 h-4" /><span className="text-sm">View</span></Link>
        <button onClick={() => handleDelete(vendor.id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-colors"><Trash2 className="w-4 h-4" /><span className="text-sm">Delete</span></button>
      </div>
    </div>
  );

  const renderMobileCard = (vendor: Vendor) => <VendorCard vendor={vendor} />;

  if (isLoading) {
    return <VendorManagementPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Vendor Management</h1>
            <p className="text-sm text-gray-400 mt-1">Showing {filteredVendors.length} vendors</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`md:hidden flex items-center justify-center p-2 border border-gray-700 rounded-lg transition-colors ${showFilters ? 'bg-yellow-500 text-black border-yellow-500' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              <Filter className="w-4 h-4" />
            </button>

            <button onClick={handleExport} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors text-sm">
              <Download className="w-4 h-4" /><span className="hidden md:inline">Export Data</span><span className="inline md:hidden">Export</span>
            </button>
            
            {/* Add Vendor Button triggers Modal */}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/20 text-sm"
            >
              <Plus className="w-4 h-4" /><span className="hidden md:inline">Add New Vendor</span><span className="inline md:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Filters Section (Collapsible on mobile) */}
        <div className={`bg-[#1E293B] p-3 md:p-4 rounded-xl border border-gray-800 flex-col md:flex-row gap-4 items-end md:items-center ${showFilters ? 'flex' : 'hidden'} md:flex`}>
          <div className="flex-1 w-full">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 md:top-3 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search by Vendor Name, ID, Email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-4 py-2 md:py-2.5 text-sm text-gray-300 focus:outline-none focus:border-yellow-500" />
            </div>
          </div>

          <div className="w-full md:w-40">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 md:py-2.5 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 appearance-none cursor-pointer">
              <option>All Status</option><option>Active</option><option>Pending</option><option>Disabled</option><option>Rejected</option>
            </select>
          </div>

          <div className="w-full md:w-40">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Category</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 md:py-2.5 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 appearance-none cursor-pointer">
              <option>All</option><option>Restaurant</option><option>Grocery</option><option>Pharmacy</option><option>General Goods</option>
            </select>
          </div>

          <div className="w-full md:w-40">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Verification</label>
            <select value={verificationFilter} onChange={e => setVerificationFilter(e.target.value)} className="w-full bg-[#0F172A] border border-gray-700 rounded-lg px-3 py-2 md:py-2.5 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 appearance-none cursor-pointer">
              <option>All</option><option>Verified</option><option>Unverified</option><option>Pending</option>
            </select>
          </div>

          <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-5">
            <button onClick={handleClearFilters} className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 border border-gray-600 text-gray-400 font-bold rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors text-sm">
              <span className="hidden md:inline">Clear Filters</span><span className="inline md:hidden">Clear</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 min-h-0">
          <div className="bg-[#1E293B] border border-gray-800 rounded-xl h-full overflow-hidden">
            <DataTable
              data={filteredVendors}
              columns={columns}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              pageSize={10}
              renderMobileCard={renderMobileCard}
            />
          </div>
        </div>

      </div>

      {/* ADD VENDOR MODAL */}
      <AddVendorModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onVendorAdded={fetchVendors} 
      />
    </div>
  );
}