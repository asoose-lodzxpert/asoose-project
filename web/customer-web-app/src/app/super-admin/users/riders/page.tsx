'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, Search, Filter, Users, ShieldAlert, Wifi, Ban, Eye, 
  Trash2, CheckCircle, Star, Wallet, Car
} from 'lucide-react';
import { DataTable } from '@/app/super-admin/component/datatable';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import { AppAlert } from '../customers/[id]/alerts';
import useSWR from 'swr'; 
import { fetcher } from '../../hooks/useSuperAdminFetch';
import RidersPageSkeleton from './component/skeleton';
import { getSession } from 'next-auth/react'; // ✅ Import NextAuth

// --- Types ---
interface Rider {
  id: string;
  name: string;
  email: string;
  plateNumber: string;
  status: string;
  verification: string;
  rating: number;
  walletBalance: number;
  createdAt: string;
  image?: string | null;
}

interface RiderStats {
  total: number;
  pending: number;
  online: number;
  suspended: number;
}

interface RidersApiResponse {
    data: Rider[];
    stats: RiderStats;
}

const columnHelper = createColumnHelper<Rider>();

// ✅ FIX 1: Ensure API URL includes '/api' prefix
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + (process.env.NEXT_PUBLIC_API_URL?.endsWith('/api') ? '' : '/api');

export default function RidersPage() {
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [rowSelection, setRowSelection] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ FIX 2: Helper to get Auth Headers using NextAuth
  const getAuthHeader = async () => {
    const session = await getSession();
    const token = (session as any)?.accessToken;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
    };
  };

  // ===========================================================================
  //  SWR DATA FETCHING
  // ===========================================================================

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    return params.toString();
  }, [debouncedSearch, statusFilter]);

  const { 
    data: apiResponse, 
    error, 
    isLoading, 
    mutate 
  } = useSWR<RidersApiResponse>(
    `/super-admin/riders?${queryString}`,
    fetcher,
    { keepPreviousData: true }
  );

  const riders = apiResponse?.data || [];
  const stats = apiResponse?.stats || { total: 0, pending: 0, online: 0, suspended: 0 };

  // --- Handlers ---
  const handleStatClick = (filter: string) => {
    setStatusFilter(filter);
    setShowFilters(true);
  };

  const handleDelete = async (id: string) => {
    const result = await AppAlert.confirm(
      'Delete Rider?', 
      'This action is irreversible. All rider data, documents, and vehicle info will be removed.', 
      'Yes, Delete', 
      true
    );

    if (result.isConfirmed) {
      try {
        // ✅ FIX 3: Add Headers to DELETE request
        const headers = await getAuthHeader();
        const res = await fetch(`${API_URL}/super-admin/riders/${id}`, { 
            method: 'DELETE',
            headers
        });
        
        if (!res.ok) throw new Error();
        
        AppAlert.success('Rider Deleted');
        mutate();
      } catch (e) {
        AppAlert.error('Error', 'Failed to delete rider');
      }
    }
  };

  const handleToggleStatus = async (rider: Rider) => {
    const isSuspending = rider.status !== 'SUSPENDED';
    const action = isSuspending ? 'Suspend' : 'Activate';
    
    const result = await AppAlert.confirm(
      `${action} Rider?`, 
      isSuspending ? 'Rider will be blocked from receiving rides.' : 'Rider access will be restored.',
      `Yes, ${action}`, 
      isSuspending
    );

    if (result.isConfirmed) {
      try {
        const newStatus = isSuspending ? 'SUSPENDED' : 'ACTIVE';
        
        // ✅ FIX 4: Add Headers to PATCH request
        const headers = await getAuthHeader();
        const res = await fetch(`${API_URL}/super-admin/riders/${rider.id}/status`, { 
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!res.ok) throw new Error();

        AppAlert.success(`Rider ${action}d`);
        mutate();
      } catch (e) {
        AppAlert.error('Error', `Failed to ${action.toLowerCase()} rider`);
      }
    }
  };

  // ===========================================================================
  //  📱 MOBILE CARD RENDERER
  // ===========================================================================
  const RiderMobileCard = (rider: Rider) => (
    <div className="bg-[#1E293B] border border-gray-700 p-4 rounded-xl mb-3 space-y-4 shadow-sm relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-white overflow-hidden border border-gray-600">
            {rider.image ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={rider.image} alt={rider.name} className="w-full h-full object-cover" />
            ) : (
               rider.name.charAt(0)
            )}
          </div>
          <div>
             <h4 className="font-bold text-white text-sm">{rider.name}</h4>
             <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-gray-300">{rider.rating.toFixed(1)}</span>
                <span className="text-gray-600">•</span>
                <span className="truncate max-w-[120px]">{rider.email}</span>
             </div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
           rider.status === 'ONLINE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
           rider.status === 'SUSPENDED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
           'bg-gray-700/50 text-gray-400 border-gray-600'
        }`}>
           {rider.status}
        </span>
      </div>

      {/* Grid: Details */}
      <div className="grid grid-cols-2 gap-3 py-3 border-t border-gray-800/50">
         <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gray-800 rounded text-gray-400"><Car className="w-3.5 h-3.5" /></div>
            <div>
               <p className="text-[10px] text-gray-500 font-bold uppercase">Plate No</p>
               <p className="text-xs font-mono text-gray-300">{rider.plateNumber}</p>
            </div>
         </div>
         <div className="flex items-center gap-2 justify-end text-right">
            <div>
               <p className="text-[10px] text-gray-500 font-bold uppercase">Wallet</p>
               <p className="text-xs font-mono font-bold text-white">₦{rider.walletBalance.toLocaleString()}</p>
            </div>
            <div className="p-1.5 bg-gray-800 rounded text-green-500"><Wallet className="w-3.5 h-3.5" /></div>
         </div>
      </div>

      {/* Footer: Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
         <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            rider.verification === 'VERIFIED' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
         }`}>
            {rider.verification}
         </div>

         <div className="flex gap-1">
            <Link href={`/super-admin/users/riders/${rider.id}`} className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
               <Eye className="w-4 h-4" />
            </Link>
            <button 
              onClick={() => handleToggleStatus(rider)} 
              className={`p-2 rounded-lg border transition-colors ${rider.status === 'SUSPENDED' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}
            >
               {rider.status === 'SUSPENDED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => handleDelete(rider.id)} 
              className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
            >
               <Trash2 className="w-4 h-4" />
            </button>
         </div>
      </div>
    </div>
  );

  // --- Columns ---
  const columns = useMemo(() => [
    columnHelper.accessor("name", {
      header: "Rider",
      cell: info => (
        <Link href={`/super-admin/users/riders/${info.row.original.id}`} className="flex items-center gap-3 group">
           <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-white overflow-hidden">
              {info.row.original.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.row.original.image} alt={info.getValue()} className="w-full h-full object-cover" />
              ) : (
                info.getValue().charAt(0)
              )}
           </div>
           <div>
              <div className="font-bold text-white text-sm group-hover:text-yellow-500">{info.getValue()}</div>
              <div className="text-xs text-gray-500">{info.row.original.plateNumber}</div>
           </div>
        </Link>
      ),
    }),
    columnHelper.accessor("verification", {
      header: "Verification",
      cell: info => (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
          info.getValue() === 'VERIFIED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
          'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
        }`}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: info => {
        const status = info.getValue();
        const color = status === 'ONLINE' ? 'text-green-500' : status === 'SUSPENDED' ? 'text-red-500' : 'text-gray-500';
        return <span className={`text-xs font-bold ${color}`}>{status}</span>;
      }
    }),
    columnHelper.accessor("walletBalance", {
      header: "Wallet",
      cell: info => <span className="font-mono text-white text-sm">₦{info.getValue().toLocaleString()}</span>
    }),
    {
      id: 'actions',
      header: 'Manage',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
           <Link 
             href={`/super-admin/users/riders/${row.original.id}`}
             className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
             title="View Details"
           >
             <Eye className="w-4 h-4" />
           </Link>
           <button 
             onClick={() => handleToggleStatus(row.original)}
             className={`p-1.5 rounded transition-colors ${
               row.original.status === 'SUSPENDED' 
               ? 'text-green-500 hover:bg-green-500/10' 
               : 'text-orange-500 hover:bg-orange-500/10'
             }`}
             title={row.original.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
           >
             {row.original.status === 'SUSPENDED' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
           </button>
           <button 
             onClick={() => handleDelete(row.original.id)}
             className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
             title="Delete Rider"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      )
    }
  ], []); 

  // Loading State
  if (isLoading) return <RidersPageSkeleton />;

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Riders</h1>
            <p className="text-sm text-gray-400">Manage fleet and verifications</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] border border-gray-700 hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition-colors">
            <Download className="w-4 h-4" /> <span className="hidden md:inline">Export</span>
          </button>
        </div>

        {/* Clickable Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Riders" value={stats.total} icon={Users} color="white" isActive={statusFilter === 'ALL'} onClick={() => handleStatClick('ALL')} />
          <StatCard title="Pending" value={stats.pending} icon={ShieldAlert} color="yellow" isActive={statusFilter === 'PENDING'} onClick={() => handleStatClick('PENDING')} />
          <StatCard title="Online" value={stats.online} icon={Wifi} color="green" isActive={statusFilter === 'ONLINE'} onClick={() => handleStatClick('ONLINE')} />
          <StatCard title="Suspended" value={stats.suspended} icon={Ban} color="red" isActive={statusFilter === 'SUSPENDED'} onClick={() => handleStatClick('SUSPENDED')} />
        </div>

        {/* Filters & Search */}
        <div className="bg-[#1E293B] rounded-xl border border-gray-800 overflow-hidden">
          <div className="md:hidden p-4 flex justify-between cursor-pointer border-b border-gray-800" onClick={() => setShowFilters(!showFilters)}>
              <span className="text-sm font-bold text-white flex items-center gap-2"><Filter className="w-4 h-4 text-yellow-500" /> Filters</span>
              <span className="text-xs text-gray-500">{showFilters ? 'Hide' : 'Show'}</span>
          </div>

          <div className={`${showFilters ? 'block' : 'hidden'} md:block p-4`}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search riders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:border-yellow-500 outline-none"
                  />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                  {['ALL', 'PENDING', 'ONLINE', 'SUSPENDED'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap ${statusFilter === tab ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                    >
                      {tab}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[400px]">
           {riders.length === 0 ? (
             <div className="h-[400px] flex flex-col items-center justify-center text-gray-500">
               <Users className="w-12 h-12 mb-4 opacity-20" />
               <p>No riders found</p>
             </div>
           ) : (
             <DataTable 
               data={riders} 
               columns={columns} 
               rowSelection={rowSelection} 
               onRowSelectionChange={setRowSelection} 
               pageSize={10} 
               renderMobileCard={RiderMobileCard} 
             />
           )}
        </div>
      </div>
    </div>
  );
}

// Stats Component
const StatCard = ({ title, value, icon: Icon, color, isActive, onClick }: any) => {
  const styles: any = { white: 'text-white bg-gray-700', yellow: 'text-yellow-500 bg-yellow-500/10', green: 'text-green-500 bg-green-500/10', red: 'text-red-500 bg-red-500/10' };
  return (
    <button onClick={onClick} className={`p-4 rounded-xl border text-left transition-all hover:bg-[#2D3748] ${isActive ? 'bg-[#1E293B] border-yellow-500 ring-1 ring-yellow-500' : 'bg-[#1E293B] border-gray-800'}`}>
      <div className="flex justify-between mb-2"><p className={`text-[10px] uppercase font-bold ${isActive ? 'text-yellow-500' : 'text-gray-500'}`}>{title}</p><div className={`p-1.5 rounded-lg ${styles[color]}`}><Icon className="w-4 h-4" /></div></div>
      <h2 className={`text-2xl font-black ${isActive ? 'text-white' : 'text-gray-300'}`}>{value.toLocaleString()}</h2>
    </button>
  );
};