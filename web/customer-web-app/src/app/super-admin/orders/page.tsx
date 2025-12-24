'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, Search, Eye, MoreVertical, Settings, Filter, 
  ArrowUpRight, ArrowDownLeft, DollarSign, Loader2, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { DataTable } from '@/app/super-admin/component/datatable';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import OrderCard from '../component/ordercard';
import Swal from 'sweetalert2';
import OrdersPageSkeleton from './components/skeleton';

// --- Types ---
export interface Order {
  id: string;
  status: string;
  customer: string;
  vendor: string;
  rider: string;
  amount: number;
  type: string;
  placedAt: string;
  updated: string;
}

// --- Mock Data (Fallback) ---
const MOCK_ORDERS: Order[] = [
  { id: 'ORD-001', status: 'Out for Delivery', customer: 'John Doe', vendor: "Joe's Pizza", rider: 'Sarah J.', amount: 28.50, type: 'Food', placedAt: '2024-05-10 14:00', updated: '2024-05-10 14:45' },
  { id: 'ORD-002', status: 'Pending', customer: 'Jane Smith', vendor: 'FreshMart', rider: '-', amount: 45.20, type: 'Grocery', placedAt: '2024-05-10 15:10', updated: '2024-05-10 15:10' },
  { id: 'ORD-003', status: 'Cancelled', customer: 'Mark Lee', vendor: 'Pharmacy Now', rider: 'Emily B.', amount: 12.00, type: 'Pharmacy', placedAt: '2024-05-10 12:30', updated: '2024-05-10 12:45' },
  { id: 'ORD-004', status: 'Delivered', customer: 'Anna White', vendor: 'Electronics Hub', rider: 'Michael C.', amount: 120.00, type: 'General Goods', placedAt: '2024-05-10 11:00', updated: '2024-05-10 11:35' },
  { id: 'ORD-005', status: 'Accepted', customer: 'David Green', vendor: 'Sushi Master', rider: 'Olivia M.', amount: 55.00, type: 'Food', placedAt: '2024-05-10 16:00', updated: '2024-05-10 16:05' },
];

const columnHelper = createColumnHelper<Order>();

export default function OrdersPage() {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [rowSelection, setRowSelection] = useState({});
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/orders');
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        } else {
          console.warn("API unavailable, using mock data");
          setOrders(MOCK_ORDERS);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        setOrders(MOCK_ORDERS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // --- Handlers ---
  const handleDeleteOrder = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Order?',
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
        // API Call
        const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');

        // Update State
        setOrders(prev => prev.filter(order => order.id !== id));

        Swal.fire({
          title: 'Deleted!',
          text: 'Order record has been removed.',
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308',
          timer: 1500
        });
      } catch (error) {
        Swal.fire({ title: 'Error', text: 'Failed to delete order.', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  // --- Helpers ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-green-500/20 text-green-500 border-green-500/20';
      case 'Accepted': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
      case 'Out for Delivery': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20';
      case 'Pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
      case 'Cancelled':
      case 'Failed': return 'bg-red-500/20 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    }
  };

  // --- Filter Logic ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        !term || 
        order.id.toLowerCase().includes(term) ||
        order.customer.toLowerCase().includes(term) ||
        order.vendor.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      const matchesType = typeFilter === 'All' || order.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchTerm, statusFilter, typeFilter, orders]);

  // --- Column Definitions ---
  const columns = useMemo<ColumnDef<Order>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: ({ row }) => (
        <Link href={`/super-admin/orders/${row.original.id}`} className="text-yellow-500 hover:text-yellow-400 font-mono font-bold transition-colors text-xs hover:underline">
          {row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusColor(row.original.status)}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <Link href={`/super-admin/users/customers/${row.original.customer.replace(' ', '-').toLowerCase()}`} className="font-bold text-white hover:text-yellow-500 transition-colors whitespace-nowrap text-sm">
          {row.original.customer}
        </Link>
      ),
    },
    {
      accessorKey: 'vendor',
      header: 'Vendor',
      cell: ({ row }) => (
        <Link href={`/super-admin/users/vendors/${row.original.vendor.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`} className="text-yellow-500 hover:text-yellow-400 transition-colors whitespace-nowrap text-sm">
          {row.original.vendor}
        </Link>
      ),
    },
    {
      accessorKey: 'rider',
      header: 'Rider',
      cell: ({ row }) => <span className="whitespace-nowrap text-sm text-gray-400">{row.original.rider}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Total Amount',
      cell: ({ row }) => <span className="font-bold text-white whitespace-nowrap text-sm">${row.original.amount.toFixed(2)}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Service Type',
      cell: ({ row }) => <span className="whitespace-nowrap text-sm text-gray-300">{row.original.type}</span>,
    },
    {
      accessorKey: 'placedAt',
      header: 'Placed At',
      cell: ({ row }) => <span className="text-xs font-mono text-gray-500 whitespace-nowrap">{row.original.placedAt}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link href={`/super-admin/orders/${row.original.id}`} className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors" title="View Order">
            <Eye className="w-4 h-4" />
          </Link>
          <button 
            onClick={() => handleDeleteOrder(row.original.id)}
            className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors" 
            title="Delete Order"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ], []);

  if (isLoading) {
    return (
      <OrdersPageSkeleton/>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Order Management</h1>
            <p className="text-gray-400 text-sm mt-1">Monitor and manage all customer orders</p>
          </div>
          
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Filter Toggle (Mobile) */}
            <button 
              onClick={() => setFilterOpen(!filterOpen)}
              className="md:hidden flex items-center justify-center p-2 border border-gray-800 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <Filter className="w-4 h-4" />
            </button>

            <button className="flex-1 sm:flex-none justify-center sm:justify-start flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-800 rounded-lg text-gray-300 hover:border-gray-700 hover:text-white transition-colors text-sm bg-[#0F172A]">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Orders</span>
              <span className="inline sm:hidden">Export</span>
            </button>
            <button className="flex-1 sm:flex-none justify-center sm:justify-start flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-800 rounded-lg text-gray-300 hover:border-gray-700 hover:text-white transition-colors text-sm bg-[#0F172A]">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Batch Actions</span>
              <span className="inline sm:hidden">Actions</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Today's Orders</p>
              <div className="bg-green-500/10 p-2 rounded-lg"><ArrowUpRight className="w-4 h-4 text-green-500" /></div>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">1,254</h2>
            <p className="text-green-500 text-xs mt-3 flex items-center gap-1 font-semibold"><ArrowUpRight className="w-3 h-3" /> +18% from yesterday</p>
          </div>

          <div className="bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Pending Orders</p>
              <div className="bg-yellow-500/10 p-2 rounded-lg"><DollarSign className="w-4 h-4 text-yellow-500" /></div>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">42</h2>
            <p className="text-gray-500 text-xs mt-3 font-medium">Awaiting rider assignment</p>
          </div>

          <div className="bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Revenue</p>
              <div className="bg-yellow-500/10 p-2 rounded-lg"><ArrowDownLeft className="w-4 h-4 text-yellow-500" /></div>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-yellow-500 mt-1">$28,450.00</h2>
            <p className="text-gray-400 text-xs mt-3 font-medium">Platform commission included</p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-[#1E293B] p-3 md:p-4 rounded-xl border border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="font-bold text-white text-lg">Order History</h2>
            
            {/* Desktop Search Bar (Always Visible on Desktop) */}
            <div className="hidden md:flex relative w-64">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
               <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500" />
            </div>
          </div>

          {/* Filter Panel (Toggled on Mobile, Always visible on Desktop) */}
          <div className={`mt-4 ${filterOpen ? 'block' : 'hidden'} md:block`}>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search Bar (Mobile Only) */}
                <div className="md:hidden relative">
                   <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                   <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0F172A] border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500" />
                </div>

                <div>
                   <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Status</label>
                   <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-[#0F172A] text-white text-sm px-3 py-2 rounded-lg border border-gray-800 focus:border-yellow-500 outline-none">
                      <option>All</option><option>Delivered</option><option>Accepted</option><option>Out for Delivery</option><option>Pending</option><option>Cancelled</option><option>Failed</option>
                   </select>
                </div>
                
                <div>
                   <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Service Type</label>
                   <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full bg-[#0F172A] text-white text-sm px-3 py-2 rounded-lg border border-gray-800 focus:border-yellow-500 outline-none">
                      <option>All</option><option>Food</option><option>Grocery</option><option>Pharmacy</option><option>General Goods</option>
                   </select>
                </div>

                <div className="flex items-end">
                   <button onClick={() => { setStatusFilter('All'); setTypeFilter('All'); setSearchTerm(''); }} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors w-full md:w-auto border border-gray-700 rounded-lg">
                      Clear Filters
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={filteredOrders}
            pageSize={10}
            renderMobileCard={(order) => <OrderCard order={order} />}
          />
        </div>

      </div>
    </div>
  );
}