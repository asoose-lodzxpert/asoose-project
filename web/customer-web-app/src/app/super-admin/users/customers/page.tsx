'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Ban, Download, Filter, CheckCircle, 
  UserCheck, UserPlus, Users, ArrowUpDown, Eye
} from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr'; 
import { DataTable } from '@/app/super-admin/component/datatable'; 
import { createColumnHelper, ColumnDef, SortingState } from '@tanstack/react-table';
import Swal from 'sweetalert2';
import { fetcher } from '../../hooks/useSuperAdminFetch'; // ✅ Standardized Fetcher
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

// --- Stats Component ---
const StatCard = ({ title, value, icon: Icon, color, isActive, onClick }: any) => {
  const colorStyles = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <button 
      onClick={onClick}
      className={`relative w-full text-left border rounded-xl p-5 flex items-center gap-4 transition-all duration-200 ${
        isActive 
          ? 'bg-[#1E293B] border-yellow-500 shadow-lg shadow-yellow-500/10 translate-y-[-2px]' 
          : 'bg-[#1E293B] border-gray-800 hover:border-gray-700'
      }`}
    >
      <div className={`p-3 rounded-lg border ${colorStyles[color as keyof typeof colorStyles]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isActive ? 'text-yellow-500' : 'text-gray-500'}`}>
          {title}
        </p>
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      </div>
    </button>
  );
};

export default function CustomersPage() {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus>('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // --- Effects ---
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, statusFilter]);

  // --- Data Fetching ---
  const queryParams = useMemo(() => {
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

  const { data: apiResponse, isLoading, mutate } = useSWR<ApiResponse>(
    `/super-admin/customers?${queryParams}`,
    fetcher,
    { keepPreviousData: true }
  );

  const customers = apiResponse?.data || [];
  const meta = apiResponse?.meta || { total: 0, pages: 1 };
  const stats = apiResponse?.stats || { active: 0, banned: 0, newToday: 0 };

  // --- Handlers ---
  const handleToggleStatus = async (customer: Customer) => {
    const isBanning = customer.status !== 'BANNED';
    const action = isBanning ? 'Ban' : 'Activate';
    
    const result = await Swal.fire({
      title: `${action} Customer?`,
      text: isBanning ? "This user will be restricted from placing orders." : "User access will be restored immediately.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isBanning ? '#ef4444' : '#10b981',
      confirmButtonText: `Yes, ${action}`,
      background: '#1E293B', color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const newStatus = isBanning ? 'BANNED' : 'ACTIVE';
        // ✅ FIX: Use standardized fetcher to target port 3001 and avoid duplicate prefixes
        await fetcher(`/super-admin/customers/${customer.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        });
        
        Swal.fire({ title: 'Success', text: `User has been ${action.toLowerCase()}d`, icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, background: '#1E293B', color: '#fff' });
        mutate();
      } catch (err: any) {
        Swal.fire({ icon: 'error', title: 'Action Failed', text: err.message, background: '#1E293B', color: '#fff' });
      }
    }
  };

  const handleBulkAction = async (action: 'BAN' | 'DELETE') => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedIds = selectedIndices.map(index => customers[index]?.id).filter(Boolean);
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: `Confirm Bulk ${action === 'BAN' ? 'Ban' : 'Delete'}?`,
      text: `You are targeting ${selectedIds.length} users.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      background: '#1E293B', color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        if (action === 'BAN') {
            await fetcher(`/super-admin/customers/bulk-status`, {
                method: 'PATCH',
                body: JSON.stringify({ ids: selectedIds, status: 'BANNED' })
            });
        } else {
            await Promise.all(selectedIds.map(id => fetcher(`/super-admin/customers/${id}`, { method: 'DELETE' })));
        }
        setRowSelection({});
        mutate();
        Swal.fire({ title: 'Completed', icon: 'success', background: '#1E293B', color: '#fff' });
      } catch {
        Swal.fire({ title: 'Error', text: 'Operation failed', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  // --- Desktop Columns ---
  const columns = useMemo<ColumnDef<Customer, any>[]>(() => [
    {
        id: 'select',
        header: ({ table }) => (
          <input type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} className="rounded border-gray-700 bg-slate-800 text-yellow-500 focus:ring-yellow-500 w-4 h-4" />
        ),
        cell: ({ row }) => (
          <input type="checkbox" checked={row.getIsSelected()} disabled={!row.getCanSelect()} onChange={row.getToggleSelectedHandler()} className="rounded border-gray-700 bg-slate-800 text-yellow-500 focus:ring-yellow-500 w-4 h-4" />
        ),
    },
    columnHelper.accessor("name", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-white uppercase text-[10px] tracking-widest font-bold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Customer <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: info => (
        <Link href={`/super-admin/users/customers/${info.row.original.id}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-gray-400 text-xs">
              {info.getValue().charAt(0)}
          </div>
          <div>
            <div className="font-bold text-white group-hover:text-yellow-500 transition-colors text-sm">{info.getValue()}</div>
            <div className="text-[10px] text-gray-500 font-medium">{info.row.original.email}</div>
          </div>
        </Link>
      ),
    }),
    columnHelper.accessor("joinedAt", {
      header: "Joined",
      cell: info => <span className="text-gray-400 text-xs">{new Date(info.getValue()).toLocaleDateString()}</span>,
    }),
    columnHelper.accessor("totalOrders", {
      header: "Orders",
      cell: info => <span className="font-bold text-white text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: info => {
        const val = info.getValue();
        const color = val === 'ACTIVE' ? 'text-green-500 bg-green-500/10 border-green-500/20' : 'text-red-500 bg-red-500/10 border-red-500/20';
        return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tighter ${color}`}>{val}</span>;
      }
    }),
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
           <Link href={`/super-admin/users/customers/${row.original.id}`} className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white transition-all">
             <Eye className="w-4 h-4" />
           </Link>
           <button 
             onClick={() => handleToggleStatus(row.original)} 
             className={`p-2 rounded-lg transition-all ${row.original.status === 'BANNED' ? 'text-green-500 hover:bg-green-500/10' : 'text-red-500 hover:bg-red-500/10'}`}
             title={row.original.status === 'BANNED' ? 'Activate' : 'Ban'}
           >
             <Ban className="w-4 h-4" />
           </button>
        </div>
      ),
    },
  ], []);

  if (isLoading && customers.length === 0) return <CustomersPageSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white ">User Directory</h1>
            <p className="text-sm text-gray-500">Monitor and manage customer behavior and account status</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 hover:border-slate-600 text-white text-xs font-bold rounded-xl transition-all">
            <Download className="w-4 h-4" /> Export Ledger
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="All Users" value={meta.total} icon={Users} color="blue" isActive={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')} />
          <StatCard title="Active" value={stats.active} icon={UserCheck} color="green" isActive={statusFilter === 'ACTIVE'} onClick={() => setStatusFilter('ACTIVE')} />
          <StatCard title="Growth" value={stats.newToday} icon={UserPlus} color="yellow" onClick={() => {}} />
          <StatCard title="Banned" value={stats.banned} icon={Ban} color="red" isActive={statusFilter === 'BANNED'} onClick={() => setStatusFilter('BANNED')} />
        </div>

        {/* Filter Bar */}
        <div className="bg-[#1E293B] p-4 rounded-2xl border border-gray-800 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-yellow-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3">
             <Filter className="w-4 h-4 text-gray-500" />
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value as UserStatus)}
               className="bg-[#0F172A] border border-gray-700 text-gray-300 text-xs font-bold rounded-xl p-2.5 outline-none focus:border-yellow-500"
             >
               <option value="ALL">Filtered by Status</option>
               <option value="ACTIVE">Status: Active</option>
               <option value="BANNED">Status: Banned</option>
             </select>
          </div>
        </div>

        {/* Selected Row Banner */}
        {Object.keys(rowSelection).length > 0 && (
          <div className="bg-yellow-500 text-black p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
             <span className="text-xs font-bold uppercase tracking-tighter">{Object.keys(rowSelection).length} Customers Selected</span>
             <div className="flex gap-2">
               <button onClick={() => handleBulkAction('BAN')} className="px-4 py-1.5 bg-black text-white text-[10px] font-bold rounded-lg uppercase">Bulk Ban</button>
               <button onClick={() => setRowSelection({})} className="px-4 py-1.5 bg-white/20 text-black text-[10px] font-bold rounded-lg uppercase">Clear</button>
             </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">
            <DataTable
              data={customers}
              columns={columns}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              pageCount={meta.pages}
              pagination={pagination}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
              renderMobileCard={(customer) => (
                <div className="bg-[#0F172A] p-5 rounded-2xl border border-gray-800 mb-3 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                         <p className="text-white font-bold text-sm">{customer.name}</p>
                         <p className="text-gray-500 text-xs">{customer.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${customer.status === 'ACTIVE' ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20'}`}>
                      {customer.status}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-800">
                     <Link 
                       href={`/super-admin/users/customers/${customer.id}`} 
                       className="flex-1 bg-slate-800 text-white py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2"
                     >
                       <Eye className="w-3.5 h-3.5" /> View Profile
                     </Link>
                     <button 
                       onClick={() => handleToggleStatus(customer)} 
                       className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${
                         customer.status === 'BANNED' ? 'bg-green-600 text-white border-green-500' : 'bg-red-500/10 text-red-500 border-red-500/20'
                       }`}
                     >
                       {customer.status === 'BANNED' ? 'Activate' : 'Ban User'}
                     </button>
                  </div>
                </div>
              )}
            />
        </div>
      </div>
    </div>
  );
}