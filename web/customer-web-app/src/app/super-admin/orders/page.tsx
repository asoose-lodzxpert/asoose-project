'use client';

import React, { useState, useMemo } from 'react';
import { 
  Download, Search, Eye, Filter, 
  AlertCircle, XCircle, RefreshCw, Loader2, Copy, Check,
  CheckCircle, Clock, Package
} from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr'; 
import { DataTable } from '@/app/super-admin/component/datatable';
import { ColumnDef } from '@tanstack/react-table';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { fetcher } from '../hooks/useSuperAdminFetch';
import { Currency } from '@/app/main/components/Currency';
import OrdersPageSkeleton from './components/skeleton';
// --- Types ---
interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  customer: string;
  vendor: string;
  rider: string;
  amount: number;
  type: string;
  placedAt: string;
}

interface OrdersApiResponse {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// --- Helper Components ---
const CopyableId = ({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success('ID copied', { autoClose: 1000, position: 'bottom-center', hideProgressBar: true });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div onClick={handleCopy} className="group flex items-center gap-1.5 cursor-pointer hover:bg-white/5 p-1 rounded -ml-1 transition-colors w-fit" title="Click to copy">
      <span className="font-mono text-yellow-500 font-bold text-xs group-hover:underline">{id.substring(0, 8)}...</span>
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-600 group-hover:text-gray-400" />}
    </div>
  );
};

function timeAgo(dateString: string) {
  const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function OrdersPage() {
  // --- UI State ---
  const [filterOpen, setFilterOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: (pagination.pageIndex + 1).toString(),
      limit: pagination.pageSize.toString(),
    });

    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter !== 'All') params.append('status', statusFilter);
    if (typeFilter !== 'All') params.append('type', typeFilter);
    if (dateRange.from) params.append('from', dateRange.from);
    if (dateRange.to) params.append('to', dateRange.to);

    return params.toString();
  }, [pagination, searchTerm, statusFilter, typeFilter, dateRange]);

  const { 
    data: apiResponse, 
    error, 
    isLoading, 
    mutate 
  } = useSWR<OrdersApiResponse>(
    `/super-admin/orders?${queryString}`,
    fetcher,
    { keepPreviousData: true }
  );

  if (isLoading) {
   return <OrdersPageSkeleton />;
}

  const orders = apiResponse?.data || [];
  const totalOrders = apiResponse?.meta?.total || 0;

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleCancelOrder = async (id: string) => {
    const result = await Swal.fire({
      title: 'Cancel Order?', 
      text: "This will effectively stop the order processing.",
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonColor: '#ef4444', 
      confirmButtonText: 'Yes, Cancel',
      background: '#1E293B', 
      color: '#fff'
    });

    if (result.isConfirmed) {
       try {
         const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
         const { createClient } = await import('../../../../utils/supabase/client');
         const session = await createClient().auth.getSession();
         
         const res = await fetch(`${API_URL}/super-admin/orders/${id}`, { 
             method: 'DELETE',
             headers: { 'Authorization': `Bearer ${session.data.session?.access_token}` }
         });
         
         if (!res.ok) throw new Error('Failed');
         
         Swal.fire({ title: 'Cancelled', icon: 'success', background: '#1E293B', color: '#fff', timer: 1500, showConfirmButton: false });
         mutate(); 
       } catch (err) {
         toast.error('Could not cancel order');
       }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setTypeFilter('All');
    setDateRange({ from: '', to: '' });
  };

  const isLate = (placedAt: string, status: string) => {
    if (['DELIVERED', 'CANCELLED', 'COMPLETED', 'REJECTED'].includes(status.toUpperCase())) return false;
    const diff = new Date().getTime() - new Date(placedAt).getTime();
    return diff > 45 * 60 * 1000; // 45 Minutes
  };

  // Quick Tabs Config
  const QUICK_TABS = [
    { label: 'All', value: 'All' },
    { label: 'Pending', value: 'PENDING', count: 0 }, 
    { label: 'Preparing', value: 'PREPARING', count: 0 },
    { label: 'Disputes', value: 'DISPUTE', alert: true },
  ];

  // --- Columns ---
  const columns = useMemo<ColumnDef<Order>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Order ID',
      cell: ({ row }) => (
        <div>
          <Link href={`/super-admin/orders/${row.original.id}`} className="block">
             <CopyableId id={row.original.id} />
          </Link>
          {isLate(row.original.placedAt, row.original.status) && (
             <span className="text-[10px] text-red-400 font-bold flex items-center gap-1 mt-1 animate-pulse">
                <AlertCircle className="w-3 h-3" /> Late
             </span>
          )}
        </div>
      )
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => <span className="text-[10px] font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700">{getValue() as string}</span>
    },
    {
      accessorKey: 'vendor',
      header: 'Store',
      cell: ({ getValue }) => <span className="text-white font-medium text-sm truncate max-w-[120px] block" title={getValue() as string}>{getValue() as string}</span>
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ getValue }) => <span className="text-gray-400 text-sm truncate max-w-[100px] block">{getValue() as string}</span>
    },
    {
        id: 'financials',
        header: 'Payment',
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="text-white font-bold text-sm"><Currency amount={row.original.amount} /></span>
                <span className={`text-[10px] uppercase font-bold ${
                    row.original.paymentStatus === 'PAID' ? 'text-green-500' : 
                    row.original.paymentStatus === 'FAILED' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                    {row.original.paymentStatus}
                </span>
            </div>
        )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = (getValue() as string).toUpperCase();
        
        let style = 'text-gray-400 border-gray-700 bg-gray-800';
        let icon = <Clock className="w-3 h-3" />;

        if (status === 'DELIVERED' || status === 'COMPLETED') {
            style = 'text-green-400 bg-green-500/10 border-green-500/20';
            icon = <CheckCircle className="w-3 h-3" />;
        } else if (status === 'PENDING') {
            style = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            icon = <Loader2 className="w-3 h-3 animate-spin" />;
        } else if (status === 'PREPARING') {
            style = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            icon = <Package className="w-3 h-3" />;
        } else if (status === 'CANCELLED') {
            style = 'text-red-400 bg-red-500/10 border-red-500/20';
            icon = <XCircle className="w-3 h-3" />;
        }

        return (
          <span className={`pl-1.5 pr-2.5 py-1 rounded text-[10px] font-bold uppercase border flex items-center gap-1.5 w-fit ${style}`}>
            {icon} {status}
          </span>
        );
      }
    },
    {
      accessorKey: 'placedAt',
      header: 'Placed',
      cell: ({ getValue }) => (
        <div className="flex flex-col">
            <span className="text-gray-200 text-xs font-medium">{timeAgo(getValue() as string)}</span>
            <span className="text-gray-600 text-[10px]">{new Date(getValue() as string).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
           <Link href={`/super-admin/orders/${row.original.id}`} className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
             <Eye className="w-4 h-4" />
           </Link>
           {!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(row.original.status.toUpperCase()) && (
               <button 
                 onClick={() => handleCancelOrder(row.original.id)} 
                 className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                 title="Cancel Order"
               >
                 <XCircle className="w-4 h-4" />
               </button>
           )}
        </div>
      )
    }
  ], []);

  // --- Render ---
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Orders & Deliveries</h1>
            <p className="text-gray-400 text-sm">Monitor live store orders and logistics.</p>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => mutate()} 
                className="p-2 bg-[#1E293B] border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
                title="Refresh"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-gray-700 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors shadow-sm">
                <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-800 pb-1 overflow-x-auto scrollbar-hide">
            {QUICK_TABS.map(tab => (
                <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`
                        px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
                        ${statusFilter === tab.value 
                            ? 'border-yellow-500 text-yellow-500 bg-yellow-500/5' 
                            : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'}
                    `}
                >
                    {tab.label}
                    {(tab.count !== undefined && tab.count > 0 || tab.alert) && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            tab.alert ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-300'
                        }`}>
                            {tab.count || '!'}
                        </span>
                    )}
                </button>
            ))}
        </div>

        {/* Filters Panel */}
        <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800 space-y-4 shadow-sm">
           <div className="flex justify-between items-center md:hidden">
              <h3 className="text-white font-bold text-sm">Search & Filter</h3>
              <button onClick={() => setFilterOpen(!filterOpen)} className="p-2 border border-gray-700 rounded text-gray-400 hover:text-white"><Filter className="w-4 h-4" /></button>
           </div>
           
           <div className={`grid grid-cols-1 md:grid-cols-5 gap-4 ${filterOpen ? 'block' : 'hidden'} md:grid`}>
              <div className="relative md:col-span-2">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                 <input 
                   type="text" 
                   placeholder="Search Order ID, Customer, or Store..." 
                   value={searchTerm} 
                   onChange={e => setSearchTerm(e.target.value)} 
                   className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-2 py-2 text-sm text-gray-300 outline-none focus:border-yellow-500 transition-colors" 
                 />
              </div>
              
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[#0F172A] text-gray-300 text-sm border border-gray-700 rounded-lg p-2 outline-none focus:border-yellow-500">
                 <option value="All">All Status</option><option value="PENDING">Pending</option><option value="PREPARING">Preparing</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option>
              </select>

              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-[#0F172A] text-gray-300 text-sm border border-gray-700 rounded-lg p-2 outline-none focus:border-yellow-500">
                 <option value="All">All Types</option><option value="Food">Food</option><option value="Grocery">Grocery</option><option value="Pharmacy">Pharmacy</option>
              </select>

              <div className="flex gap-2">
                 <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({...prev, from: e.target.value}))} className="w-full bg-[#0F172A] text-gray-300 text-sm border border-gray-700 rounded-lg px-2 py-2 outline-none focus:border-yellow-500" />
                 <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({...prev, to: e.target.value}))} className="w-full bg-[#0F172A] text-gray-300 text-sm border border-gray-700 rounded-lg px-2 py-2 outline-none focus:border-yellow-500" />
              </div>
           </div>

           {/* Active Filter Chips */}
           {(statusFilter !== 'All' || typeFilter !== 'All' || dateRange.from || searchTerm) && (
             <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                {searchTerm && <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs flex items-center gap-1">Search: "{searchTerm}" <button onClick={() => setSearchTerm('')}><XCircle className="w-3 h-3 hover:text-white" /></button></span>}
                {statusFilter !== 'All' && <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-xs flex items-center gap-1">Status: {statusFilter} <button onClick={() => setStatusFilter('All')}><XCircle className="w-3 h-3 hover:text-white" /></button></span>}
                {typeFilter !== 'All' && <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-xs flex items-center gap-1">Type: {typeFilter} <button onClick={() => setTypeFilter('All')}><XCircle className="w-3 h-3 hover:text-white" /></button></span>}
                {(dateRange.from || dateRange.to) && <span className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-xs flex items-center gap-1">Date: {dateRange.from || '...'} - {dateRange.to || '...'} <button onClick={() => setDateRange({from:'', to:''})}><XCircle className="w-3 h-3 hover:text-white" /></button></span>}
                
                <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-white underline ml-auto">Clear All</button>
             </div>
           )}
        </div>

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px] shadow-sm">
           {isLoading && orders.length === 0 ? (
             <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /></div>
           ) : orders.length > 0 ? (
             <DataTable 
               data={orders} 
               columns={columns} 
               pageSize={pagination.pageSize}
               pageCount={Math.ceil(totalOrders / pagination.pageSize)}
               pagination={pagination}
               onPaginationChange={setPagination}
               renderMobileCard={(order) => (
                 <div className="bg-[#1E293B] border border-gray-800 p-4 rounded-xl mb-3 space-y-4 shadow-sm">
                   {/* Header: ID + Status */}
                   <div className="flex justify-between items-start">
                     <div>
                       <div className="flex items-center gap-2">
                         <span className="font-mono text-xs text-yellow-500 font-bold">#{order.id.substring(0, 8)}</span>
                         {isLate(order.placedAt, order.status) && (
                           <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-bold animate-pulse">Late</span>
                         )}
                       </div>
                       <span className="text-xs text-gray-500 mt-0.5 block">{timeAgo(order.placedAt)}</span>
                     </div>
                     <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                        order.status === 'DELIVERED' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                        order.status === 'PENDING' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' :
                        order.status === 'CANCELLED' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                        'text-blue-400 bg-blue-500/10 border-blue-500/20'
                     }`}>
                       {order.status}
                     </span>
                   </div>

                   {/* Body: Vendor & Customer */}
                   <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-800 py-3">
                     <div>
                       <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Store</p>
                       <p className="text-sm font-bold text-white truncate">{order.vendor}</p>
                     </div>
                     <div>
                       <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Customer</p>
                       <p className="text-sm text-gray-300 truncate">{order.customer}</p>
                     </div>
                   </div>

                   {/* Footer: Amount & Actions */}
                   <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-white"><Currency amount={order.amount}/> </span>
                         <span className={`text-[10px] font-bold ${order.paymentStatus === 'PAID' ? 'text-green-500' : 'text-red-500'}`}>
                            {order.paymentStatus}
                         </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {!['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status) && (
                          <button 
                            onClick={() => handleCancelOrder(order.id)}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <Link href={`/super-admin/orders/${order.id}`} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors">
                          <Eye className="w-3 h-3" /> View
                        </Link>
                      </div>
                   </div>
                 </div>
               )}
             />
           ) : (
             <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-white font-bold text-lg">No orders found</h3>
                <p className="text-gray-400 text-sm mt-1 max-w-sm">
                    We couldn't find any orders matching your current filters. Try adjusting your search or clearing filters.
                </p>
                <button 
                  onClick={clearFilters}
                  className="mt-6 px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg text-sm hover:bg-yellow-400 transition-colors"
                >
                  Clear All Filters
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}