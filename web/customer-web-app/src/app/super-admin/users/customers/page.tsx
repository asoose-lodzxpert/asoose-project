'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Mail, Ban, MoreHorizontal, DollarSign, Package, Calendar, Eye, Trash2, Loader2 } from 'lucide-react';
import { DataTable } from '@/app/super-admin/component/datatable'; // Adjust import path
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import Swal from 'sweetalert2';
import { CustomersPageSkeleton } from './components/skeleton';
import Link from 'next/link';
// Types
interface Customer {
  id: string;
  name: string;
  email: string;
  joined: string;
  orders: number;
  spent: number;
  status: string;
}

// Mock Data
const MOCK_CUSTOMERS: Customer[] = [
  { id: 'CUS-001', name: 'Alice Johnson', email: 'alice@example.com', joined: '2024-01-15', orders: 45, spent: 1200, status: 'Active' },
  { id: 'CUS-002', name: 'Bob Williams', email: 'bob@example.com', joined: '2024-02-20', orders: 12, spent: 350, status: 'Active' },
  { id: 'CUS-003', name: 'Charlie Davis', email: 'charlie@example.com', joined: '2024-03-10', orders: 0, spent: 0, status: 'Inactive' },
  { id: 'CUS-004', name: 'Diana Evans', email: 'diana@example.com', joined: '2024-01-05', orders: 89, spent: 2450, status: 'Banned' },
  { id: 'CUS-005', name: 'Ethan Brown', email: 'ethan@example.com', joined: '2024-04-01', orders: 23, spent: 780, status: 'Active' },
  { id: 'CUS-006', name: 'Fiona Green', email: 'fiona@example.com', joined: '2024-03-22', orders: 5, spent: 150, status: 'Active' },
  { id: 'CUS-007', name: 'George Wilson', email: 'george@example.com', joined: '2024-02-15', orders: 67, spent: 1890, status: 'Active' },
  { id: 'CUS-008', name: 'Hannah Clark', email: 'hannah@example.com', joined: '2024-01-30', orders: 0, spent: 0, status: 'Inactive' },
];

const columnHelper = createColumnHelper<Customer>();

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/customers');
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        } else {
          console.warn("API unavailable, using mock data");
          setCustomers(MOCK_CUSTOMERS);
        }
      } catch (error) {
        console.error("Failed to fetch customers:", error);
        setCustomers(MOCK_CUSTOMERS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-500 border-green-500/20';
      case 'Banned': return 'bg-red-500/20 text-red-500 border-red-500/20';
      case 'Inactive': return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  // Filter logic
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer.id.toLowerCase().includes(term)
    );
  }, [searchTerm, customers]);

  // Handle Delete Customer
  const handleDeleteCustomer = async (customer: Customer) => {
    const result = await Swal.fire({
      title: 'Delete Customer?',
      html: `
        <div class="text-left text-gray-300">
          <p class="mb-2">Are you sure you want to delete this customer?</p>
          <div class="bg-[#1E293B] p-3 rounded-lg border border-gray-700 mt-3">
            <p class="text-sm font-bold text-white">${customer.name}</p>
            <p class="text-xs text-gray-400">${customer.email}</p>
            <p class="text-xs text-gray-400 mt-1">Customer ID: ${customer.id}</p>
          </div>
          <p class="text-red-400 text-sm font-bold mt-3">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      background: '#1E293B',
      color: '#fff',
      customClass: {
        popup: 'bg-[#1E293B] border border-gray-700',
        title: 'text-white',
        confirmButton: 'font-bold',
        cancelButton: 'font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        // API Call
        const response = await fetch(`/api/customers/${customer.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete');

        // Update State
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
        
        Swal.fire({
          title: 'Deleted!',
          text: `Customer ${customer.name} has been deleted.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308',
          timer: 2000,
          timerProgressBar: true,
        });
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete customer record.',
          icon: 'error',
          background: '#1E293B',
          color: '#fff'
        });
      }
    }
  };

  // Handle Ban Customer
  const handleBanCustomer = async (customer: Customer) => {
    const isBanning = customer.status !== 'Banned';
    
    const result = await Swal.fire({
      title: isBanning ? 'Ban Customer?' : 'Unban Customer?',
      html: `
        <div class="text-left text-gray-300">
          <p class="mb-2">Are you sure you want to ${isBanning ? 'ban' : 'unban'} this customer?</p>
          <div class="bg-[#1E293B] p-3 rounded-lg border border-gray-700 mt-3">
            <p class="text-sm font-bold text-white">${customer.name}</p>
            <p class="text-xs text-gray-400">${customer.email}</p>
          </div>
          <p class="text-yellow-400 text-sm font-bold mt-3">
            ${isBanning ? 'Customer will not be able to place orders.' : 'Customer will be able to place orders again.'}
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isBanning ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isBanning ? 'Yes, ban!' : 'Yes, unban!',
      cancelButtonText: 'Cancel',
      background: '#1E293B',
      color: '#fff',
      customClass: {
        popup: 'bg-[#1E293B] border border-gray-700',
        title: 'text-white',
        confirmButton: 'font-bold',
        cancelButton: 'font-bold'
      }
    });

    if (result.isConfirmed) {
      try {
        const newStatus = isBanning ? 'Banned' : 'Active';
        
        // API Call
        const response = await fetch(`/api/customers/${customer.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) throw new Error('Failed to update status');

        // Update State
        setCustomers(prev => prev.map(c => 
          c.id === customer.id 
            ? { ...c, status: newStatus }
            : c
        ));
        
        Swal.fire({
          title: isBanning ? 'Banned!' : 'Unbanned!',
          text: `Customer ${customer.name} has been ${isBanning ? 'banned' : 'unbanned'}.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308',
          timer: 2000,
          timerProgressBar: true,
        });
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Failed to update customer status.',
          icon: 'error',
          background: '#1E293B',
          color: '#fff'
        });
      }
    }
  };

  // Table columns
  const columns = useMemo<ColumnDef<Customer, any>[]>(() => [
    columnHelper.accessor("id", {
      header: "Customer ID",
      cell: info => (
        <a
          href={`/super-admin/users/customers/${info.getValue()}`}
          className="font-mono text-yellow-500 hover:text-yellow-400 hover:underline transition-colors text-xs"
        >
          {info.getValue()}
        </a>
      ),
    }),
    
    columnHelper.accessor("name", {
      header: "Customer",
      cell: info => {
        const customer = info.row.original;
        return (
          <a
            href={`/super-admin/users/customers/${customer.id}`}
            className="block hover:text-yellow-500 transition-colors"
          >
            <div className="font-bold text-white">{info.getValue()}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Mail className="w-3 h-3" /> {customer.email}
            </div>
          </a>
        );
      },
    }),

    columnHelper.accessor("joined", {
      header: "Joined Date",
      cell: info => (
        <span className="text-gray-400">
          {info.getValue()}
        </span>
      ),
    }),

    columnHelper.accessor("orders", {
      header: "Orders",
      cell: info => (
        <span className="text-center font-mono text-white">
          {info.getValue()}
        </span>
      ),
    }),

    columnHelper.accessor("spent", {
      header: "Total Spent",
      cell: info => (
        <span className="text-green-400 font-bold">
          ${info.getValue().toLocaleString()}
        </span>
      ),
    }),

    columnHelper.accessor("status", {
      header: "Status",
      cell: info => {
        const status = info.getValue();
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(status)}`}>
            {status}
          </span>
        );
      },
    }),

    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center gap-2">
            {/* VIEW BUTTON */}
            <a
              href={`/super-admin/users/customers/${customer.id}`}
              className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
              title="View Customer"
            >
              <Eye className="w-4 h-4" />
            </a>
            
            {/* BAN/UNBAN BUTTON */}
            <button
              onClick={() => handleBanCustomer(customer)}
              className={`p-2 rounded-lg transition-colors ${
                customer.status === 'Banned' 
                  ? 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white' 
                  : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
              }`}
              title={customer.status === 'Banned' ? 'Unban Customer' : 'Ban Customer'}
            >
              <Ban className="w-4 h-4" />
            </button>
            
            {/* DELETE BUTTON */}
            <button
              onClick={() => handleDeleteCustomer(customer)}
              className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
              title="Delete Customer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ], []);

  // Mobile Card Component
  const CustomerCard = ({ customer }: { customer: Customer }) => (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors mb-3">
      {/* Header: ID + Status */}
      <div className="flex justify-between items-start mb-3">
        <Link
          href={`/super-admin/users/customers/${customer.id}`}
          className="text-yellow-500 hover:text-yellow-400 font-mono font-bold text-sm transition-colors"
        >
          {customer.id}
        </Link>
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getStatusColor(customer.status)}`}>
          {customer.status}
        </span>
      </div>

      {/* Customer Info */}
      <div className="mb-4">
        <Link
          href={`/super-admin/users/customers/${customer.id}`}
          className="block hover:text-yellow-500 transition-colors"
        >
          <div className="font-bold text-white text-lg mb-1">{customer.name}</div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Mail className="w-3 h-3" />
            <span className="truncate">{customer.email}</span>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div>
            <div className="text-gray-500 text-xs">Joined</div>
            <div className="text-gray-300">{customer.joined}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          <div>
            <div className="text-gray-500 text-xs">Orders</div>
            <div className="font-bold text-white">{customer.orders}</div>
          </div>
        </div>
        
        <div className="col-span-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <div>
            <div className="text-gray-500 text-xs">Total Spent</div>
            <div className="text-green-400 font-bold">${customer.spent.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <a
          href={`/super-admin/users/customers/${customer.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm">View</span>
        </a>
        
        <button
          onClick={() => handleBanCustomer(customer)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
            customer.status === 'Banned' 
              ? 'bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white' 
              : 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'
          }`}
          title={customer.status === 'Banned' ? 'Unban Customer' : 'Ban Customer'}
        >
          <Ban className="w-4 h-4" />
          <span className="text-sm">{customer.status === 'Banned' ? 'Unban' : 'Ban'}</span>
        </button>
        
        <button
          onClick={() => handleDeleteCustomer(customer)}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-colors"
          title="Delete Customer"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">Delete</span>
        </button>
      </div>
    </div>
  );

  // Mobile card renderer for DataTable
  const renderMobileCard = (customer: Customer) => <CustomerCard customer={customer} />;

  if (isLoading) {
    return (
      <CustomersPageSkeleton/>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Customer Database</h1>
            <p className="text-sm text-gray-400 mt-1">
              Showing {filteredCustomers.length} customers
            </p>
          </div>
          
          {/* Summary Stats */}
         <div className="grid grid-cols-1 w-full gap-3 sm:grid-cols-3 md:flex md:gap-4">
  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-3 w-full">
    <p className="text-gray-500 text-xs">Active</p>
    <p className="text-lg font-bold text-green-500">
      {customers.filter(c => c.status === 'Active').length}
    </p>
  </div>
  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-3 w-full">
    <p className="text-gray-500 text-xs">Banned</p>
    <p className="text-lg font-bold text-red-500">
      {customers.filter(c => c.status === 'Banned').length}
    </p>
  </div>
  <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-3 w-full">
    <p className="text-gray-500 text-xs">Inactive</p>
    <p className="text-lg font-bold text-gray-500">
      {customers.filter(c => c.status === 'Inactive').length}
    </p>
  </div>
</div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#1E293B] p-3 md:p-4 rounded-xl border border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 md:top-3 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-4 py-2 md:py-2.5 text-sm text-gray-300 focus:border-yellow-500 outline-none"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden flex-1 min-h-0">
          <DataTable
            data={filteredCustomers}
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