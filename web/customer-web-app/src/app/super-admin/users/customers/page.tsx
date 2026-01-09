'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Mail, Ban, Download, Filter, CheckCircle, 
  UserCheck, UserPlus, Users, ArrowUpDown, Eye
} from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr'; 
import { DataTable } from '@/app/super-admin/component/datatable'; 
import { createColumnHelper, ColumnDef, SortingState } from '@tanstack/react-table';
import Swal from 'sweetalert2';
import { fetcher } from '../../hooks/useSuperAdminFetch';
import { CustomersPageSkeleton } from './components/skeleton';

// --- Types ---
type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'BANNED' | 'ALL';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: Exclude<UserStatus, 'ALL'>;
  joinedAt: string;
  totalOrders: number;
}

interface ApiResponse {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  stats?: {
    active: number;
    banned: number;
    newToday: number;
  };
}

const columnHelper = createColumnHelper<Customer>();
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';


interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  color: 'blue' | 'green' | 'yellow' | 'red';
  isActive?: boolean;
  onClick?: () => void;
}

const StatCard = ({ title, value, icon: Icon, color, isActive, onClick }: StatCardProps) => {
  const colorStyles = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <button 
      onClick={onClick}
      className={`
        relative w-full text-left border rounded-xl p-4 flex items-center gap-4 transition-all duration-200
        ${isActive 
          ? 'bg-[#1E293B] border-yellow-500 shadow-lg shadow-yellow-500/10 translate-y-[-2px]' 
          : 'bg-[#1E293B] border-gray-800 hover:border-gray-600 hover:bg-[#1E293B]/80'
        }
      `}
    >
      <div className={`p-3 rounded-lg border ${colorStyles[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className={`text-xs font-bold uppercase mb-1 ${isActive ? 'text-yellow-500' : 'text-gray-400'}`}>
          {title}
        </p>
        <p className="text-2xl font-black text-white">{value.toLocaleString()}</p>
      </div>
      {isActive && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      )}
    </button>
  );
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Main Component ---

export default function CustomersPage() {
  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus>('ALL');
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Sorting & Selection
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  
  // Pagination State
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Reset pagination when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, statusFilter]);

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
    });

    if (debouncedSearch) params.append('search', debouncedSearch);
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    
    if (sorting.length > 0) {
      params.append('sortBy', sorting[0].id);
      params.append('sortOrder', sorting[0].desc ? 'desc' : 'asc');
    }

    return params.toString();
  }, [pagination, debouncedSearch, statusFilter, sorting]);

  const { 
    data: apiResponse, 
    error, 
    isLoading, 
    mutate 
  } = useSWR<ApiResponse>(
    `/super-admin/customers?${queryString}`,
    fetcher,
    { keepPreviousData: true }
  );

  const customers = apiResponse?.data || [];
  const meta = apiResponse?.meta || { total: 0, page: 1, limit: 10, pages: 1 };
  const stats = apiResponse?.stats || { active: 0, banned: 0, newToday: 0 };

  // --- Handlers ---

  const handleCardClick = (type: 'TOTAL' | 'ACTIVE' | 'NEW' | 'BANNED') => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    switch (type) {
      case 'TOTAL':
        setStatusFilter('ALL'); setSearchTerm(''); setSorting([]); break;
      case 'ACTIVE':
        setStatusFilter('ACTIVE'); break;
      case 'BANNED':
        setStatusFilter('BANNED'); break;
      case 'NEW':
        setStatusFilter('ALL'); setSorting([{ id: 'joinedAt', desc: true }]); break;
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    const isBanning = customer.status !== 'BANNED';
    const result = await Swal.fire({
      title: isBanning ? 'Ban Customer?' : 'Activate Customer?',
      text: isBanning ? "User will be logged out immediately." : "User access will be restored.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isBanning ? '#ef4444' : '#10b981',
      confirmButtonText: isBanning ? 'Yes, Ban' : 'Yes, Activate',
      background: '#1E293B', color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const newStatus = isBanning ? 'BANNED' : 'ACTIVE';
        await fetch(`${API_URL}/super-admin/customers/${customer.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        Swal.fire({ title: 'Updated!', icon: 'success', toast: true, position: 'top-end', timer: 1500, showConfirmButton: false, background: '#1E293B', color: '#fff' });
        mutate(); // ✅ Refresh data
      } catch {
        Swal.fire({ icon: 'error', title: 'Failed', background: '#1E293B', color: '#fff' });
      }
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'BAN' | 'DELETE') => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedIds = selectedIndices.map(index => customers[index]?.id).filter(Boolean);
    
    if (selectedIds.length === 0) return;

    let isConfirmed = false;

    if (action === 'DELETE') {
      const result = await Swal.fire({
        title: 'Are you absolutely sure?',
        html: `You are about to delete <b>${selectedIds.length} users</b>. This action cannot be undone.<br/><br/>Type <b>DELETE</b> to confirm.`,
        icon: 'warning',
        input: 'text',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Permanently Delete',
        background: '#1E293B', color: '#fff',
        preConfirm: (value) => {
          if (value !== 'DELETE') Swal.showValidationMessage('You need to type DELETE exactly!');
        }
      });
      isConfirmed = result.isConfirmed;
    } else {
      const result = await Swal.fire({
        title: `Bulk Ban ${selectedIds.length} Users?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, Ban',
        background: '#1E293B', color: '#fff'
      });
      isConfirmed = result.isConfirmed;
    }

    if (isConfirmed) {
      try {
        if (action === 'BAN') {
            await fetch(`${API_URL}/super-admin/customers/bulk-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, status: 'BANNED' })
            });
        } else {
            await Promise.all(selectedIds.map(id => 
                fetch(`${API_URL}/super-admin/customers/${id}`, { method: 'DELETE' })
            ));
        }

        setRowSelection({});
        mutate(); // ✅ Refresh data
        Swal.fire({ title: 'Batch Processed!', icon: 'success', background: '#1E293B', color: '#fff' });
      } catch (error) {
        Swal.fire({ title: 'Batch Error', text: 'Some operations failed', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  const handleExport = () => {
    // Export logic remains same
    const headers = ['ID,Name,Email,Status,Joined Date,Total Orders'];
    const rows = customers.map(c => `${c.id},"${c.name}",${c.email},${c.status},${new Date(c.joinedAt).toISOString()},${c.totalOrders}`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `customers_export.csv`;
    link.click();
  };

  // --- Helpers ---
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-500 border-green-500/20';
      case 'BANNED': return 'bg-red-500/20 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    }
  };

  // --- Render ---
  const renderMobileCard = (customer: Customer) => (
    <div className="bg-[#1E293B] p-4 rounded-lg border border-gray-800 space-y-3 mb-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white border border-gray-600">
            {customer.name.charAt(0)}
          </div>
          <div>
             <Link href={`/super-admin/users/customers/${customer.id}`} className="text-white font-bold hover:text-blue-400 block">{customer.name}</Link>
             <p className="text-gray-400 text-xs">{customer.email}</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-[10px] rounded border ${getStatusColor(customer.status)}`}>
          {customer.status}
        </span>
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-500">Joined {formatDate(customer.joinedAt)}</div>
        <div className="flex gap-2">
           <a href={`mailto:${customer.email}`} className="p-1.5 bg-gray-700 rounded text-gray-300"><Mail className="w-4 h-4" /></a>
           <button onClick={() => handleToggleStatus(customer)} className={`px-3 py-1.5 rounded text-xs font-bold ${customer.status === 'BANNED' ? 'bg-green-600 text-white' : 'bg-red-500/10 text-red-500'}`}>
             {customer.status === 'BANNED' ? 'Unban' : 'Ban'}
           </button>
        </div>
      </div>
    </div>
  );

  const columns = useMemo<ColumnDef<Customer, any>[]>(() => [
    {
        id: 'select',
        header: ({ table }) => (
          <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} className="rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500" />
        ),
        cell: ({ row }) => (
          <input type="checkbox" checked={row.getIsSelected()} disabled={!row.getCanSelect()} onChange={row.getToggleSelectedHandler()} className="rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500" />
        ),
    },
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-white" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Customer <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: info => (
        <Link href={`/super-admin/users/customers/${info.row.original.id}`} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-gray-300 text-xs">
              {info.getValue().charAt(0)}
          </div>
          <div>
            <div className="font-bold text-white group-hover:text-yellow-500 transition-colors text-sm">{info.getValue()}</div>
            <div className="text-xs text-gray-500">{info.row.original.email}</div>
          </div>
        </Link>
      ),
    }),
    columnHelper.accessor("joinedAt", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-white" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Joined <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: info => <span className="text-gray-400 text-xs">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor("totalOrders", {
      header: "Orders",
      cell: info => <span className="font-mono text-white text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: info => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(info.getValue())}`}>
          {info.getValue()}
        </span>
      ),
    }),
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
           {/* <a href={`mailto:${row.original.email}`} className="p-1.5 hover:bg-gray-700 rounded text-gray-400 transition-colors" title="Send Email">
             <Mail className="w-4 h-4" />
           </a> */}
           <Link href={`/super-admin/users/customers/${row.original.id}`} className="p-1.5 hover:bg-blue-500/10 rounded text-gray-400 hover:text-blue-500">
             <Eye className="w-4 h-4" />
           </Link>
           <button onClick={() => handleToggleStatus(row.original)} className={`p-1.5 rounded transition-colors ${row.original.status === 'BANNED' ? 'text-green-500 hover:bg-green-500/10' : 'text-red-500 hover:bg-red-500/10'}`}>
             {row.original.status === 'BANNED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
           </button>
        </div>
      ),
    },
  ], []);

  if (isLoading && customers.length === 0) return <CustomersPageSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Customers</h1>
            <p className="text-sm text-gray-400">Manage {meta.total} registered users</p>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-gray-700 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Interactive Insights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total Customers" 
            value={meta.total} 
            icon={Users} 
            color="blue" 
            isActive={statusFilter === 'ALL' && sorting.length === 0}
            onClick={() => handleCardClick('TOTAL')}
          />
          <StatCard 
            title="Active Now" 
            value={stats.active} 
            icon={UserCheck} 
            color="green" 
            isActive={statusFilter === 'ACTIVE'}
            onClick={() => handleCardClick('ACTIVE')}
          />
          <StatCard 
            title="New Today" 
            value={stats.newToday} 
            icon={UserPlus} 
            color="yellow" 
            isActive={sorting.length > 0 && sorting[0].id === 'joinedAt'}
            onClick={() => handleCardClick('NEW')}
          />
          <StatCard 
            title="Banned" 
            value={stats.banned} 
            icon={Ban} 
            color="red" 
            isActive={statusFilter === 'BANNED'}
            onClick={() => handleCardClick('BANNED')}
          />
        </div>

        {/* Filters & Bulk Actions */}
        <div className="bg-[#1E293B] p-4 rounded-xl border border-gray-800 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:border-yellow-500 outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
               <Filter className="w-4 h-4 text-gray-500" />
               <select 
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value as UserStatus)}
                 className="bg-[#0F172A] border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-yellow-500 focus:border-yellow-500 p-2 outline-none"
               >
                 <option value="ALL">All Status</option>
                 <option value="ACTIVE">Active</option>
                 <option value="BANNED">Banned</option>
               </select>
            </div>
          </div>

          {Object.keys(rowSelection).length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center gap-2 text-blue-400 text-sm font-bold">
                 <CheckCircle className="w-4 h-4" /> {Object.keys(rowSelection).length} selected
               </div>
               <div className="flex gap-2">
                 <button onClick={() => setRowSelection({})} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
                 <button onClick={() => handleBulkAction('BAN')} className="px-3 py-1.5 bg-yellow-600 text-white text-xs font-bold rounded hover:bg-yellow-700 transition-colors">Ban Selected</button>
                 <button onClick={() => handleBulkAction('DELETE')} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 transition-colors">Delete</button>
               </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden shadow-xl min-h-[400px]">
          {!isLoading && customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
               <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-500" />
               </div>
               <h3 className="text-white font-bold text-lg">No customers found</h3>
               <p className="text-gray-400 text-sm mt-1 max-w-xs">We couldn't find any results for your current filters.</p>
               <button 
                 onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
                 className="mt-4 px-4 py-2 bg-yellow-500 text-black font-bold text-sm rounded-lg hover:bg-yellow-400"
               >
                 Clear Filters
               </button>
            </div>
          ) : (
            <DataTable
              data={customers}
              columns={columns}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              pageCount={meta.pages}
              pagination={pagination}
              onPaginationChange={setPagination}
              renderMobileCard={renderMobileCard}
              sorting={sorting}
              onSortingChange={setSorting}
            />
          )}
        </div>

      </div>
    </div>
  );
}