'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Download, Filter, Eye, Trash2 } from 'lucide-react';
import { DataTable } from '@/app/super-admin/component/datatable';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import Swal from 'sweetalert2';
import { TransactionsListSkeleton } from './component/skeleton';

// --- Types ---
interface Transaction {
  id: string;
  type: string;
  amount: string;
  desc: string;
  user: string;
  date: string;
  status: string;
}

// --- Mock Data (Fallback) ---
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-901', type: 'Credit', amount: '+$45.00', desc: 'Order Payment #ORD-001', user: 'John Doe', date: '2024-05-10 14:30', status: 'Success' },
  { id: 'TXN-902', type: 'Debit', amount: '-$38.50', desc: 'Vendor Payout - Joe\'s Pizza', user: 'Joe\'s Pizza', date: '2024-05-10 09:00', status: 'Success' },
  { id: 'TXN-903', type: 'Credit', amount: '+$12.50', desc: 'Ride Payment #RID-502', user: 'Bob W.', date: '2024-05-09 18:45', status: 'Success' },
  { id: 'TXN-904', type: 'Debit', amount: '-$150.00', desc: 'Weekly Rider Payout', user: 'Michael Chen', date: '2024-05-08 23:00', status: 'Processing' },
  { id: 'TXN-905', type: 'Credit', amount: '+$22.00', desc: 'Order Payment #ORD-005', user: 'David G.', date: '2024-05-08 12:00', status: 'Failed' },
  { id: 'TXN-906', type: 'Credit', amount: '+$67.80', desc: 'Order Payment #ORD-006', user: 'Sarah M.', date: '2024-05-07 16:20', status: 'Success' },
  { id: 'TXN-907', type: 'Debit', amount: '-$95.00', desc: 'Vendor Payout - Sushi Express', user: 'Sushi Express', date: '2024-05-07 10:15', status: 'Success' },
  { id: 'TXN-908', type: 'Credit', amount: '+$31.25', desc: 'Order Payment #ORD-007', user: 'Emily R.', date: '2024-05-06 19:45', status: 'Success' },
];

const columnHelper = createColumnHelper<Transaction>();

export default function TransactionsPage() {
  // --- State ---
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [rowSelection, setRowSelection] = useState({});
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/transactions');
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        } else {
          console.warn("API unavailable, using mock data");
          setTransactions(MOCK_TRANSACTIONS);
        }
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        setTransactions(MOCK_TRANSACTIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // --- Handlers ---
  const handleDeleteTransaction = async (transaction: Transaction) => {
    const result = await Swal.fire({
      title: 'Delete Transaction?',
      html: `
        <div class="text-left text-gray-300">
          <p class="mb-2">Are you sure you want to delete this transaction?</p>
          <div class="bg-[#1E293B] p-3 rounded-lg border border-gray-700 mt-3">
            <p class="text-sm font-bold text-yellow-500">${transaction.id}</p>
            <p class="text-xs text-gray-400">Amount: <span class="${transaction.type === 'Credit' ? 'text-green-400' : 'text-white'}">${transaction.amount}</span></p>
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
        const res = await fetch(`/api/transactions/${transaction.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');

        // Update State
        setTransactions(prev => prev.filter(t => t.id !== transaction.id));

        Swal.fire({
          title: 'Deleted!',
          text: `Transaction ${transaction.id} has been deleted.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({ title: 'Error', text: 'Failed to delete transaction.', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  const handleExport = () => {
    const csv = [
      ['Transaction ID', 'Description', 'User', 'Date', 'Amount', 'Type', 'Status'].join(','),
      ...filteredTransactions.map(t => 
        [t.id, t.desc, t.user, t.date, t.amount, t.type, t.status].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
  };

  // --- Helpers ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success': return 'bg-green-500/20 text-green-500 border-green-500/20';
      case 'Processing': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
      case 'Failed': return 'bg-red-500/20 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/20';
    }
  };

  const getAmountColor = (type: string) => {
    return type === 'Credit' ? 'text-green-400' : 'text-white';
  };

  // --- Filters ---
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    
    if (statusFilter !== 'All') {
      result = result.filter(t => t.status === statusFilter);
    }
    
    if (typeFilter !== 'All') {
      result = result.filter(t => t.type === typeFilter);
    }
    
    return result;
  }, [statusFilter, typeFilter, transactions]);

  // --- Columns ---
  const columns = useMemo<ColumnDef<Transaction, any>[]>(() => [
    columnHelper.accessor("id", {
      header: "Transaction ID",
      cell: info => (
        <Link
          href={`/super-admin/transactions/${info.getValue()}`}
          className="font-mono text-yellow-500 hover:text-yellow-400 hover:underline transition-colors text-xs"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    
    columnHelper.accessor("desc", {
      header: "Description",
      cell: info => (
        <span className="font-medium text-white truncate">
          {info.getValue()}
        </span>
      ),
    }),

    columnHelper.accessor("user", {
      header: "User",
      cell: info => (
        <span className="text-gray-400 truncate">
          {info.getValue()}
        </span>
      ),
    }),

    columnHelper.accessor("date", {
      header: "Date",
      cell: info => (
        <span className="text-xs font-mono text-gray-500">
          {info.getValue()}
        </span>
      ),
    }),

    columnHelper.accessor("amount", {
      header: "Amount",
      cell: info => {
        const transaction = info.row.original;
        return (
          <span className={`font-bold ${getAmountColor(transaction.type)}`}>
            {info.getValue()}
          </span>
        );
      },
    }),

    columnHelper.accessor("status", {
      header: "Status",
      cell: info => {
        const status = info.getValue();
        return (
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(status)}`}>
            {status}
          </span>
        );
      },
    }),

    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/super-admin/transactions/${transaction.id}`}>
              <button 
                className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"
                title="View Transaction"
              >
                <Eye className="w-4 h-4" />
              </button>
            </Link>
            
            <button 
              onClick={() => handleDeleteTransaction(transaction)}
              className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
              title="Delete Transaction"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ], []);

  // --- Mobile Card ---
  const TransactionCard = ({ transaction }: { transaction: Transaction }) => (
    <div className="bg-[#1E293B] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-colors mb-3">
      <div className="flex justify-between items-start mb-3">
        <Link
          href={`/super-admin/transactions/${transaction.id}`}
          className="text-yellow-500 hover:text-yellow-400 font-mono font-bold text-sm transition-colors"
        >
          {transaction.id}
        </Link>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(transaction.status)}`}>
          {transaction.status}
        </span>
      </div>

      <div className="mb-4">
        <p className="font-medium text-white mb-2">{transaction.desc}</p>
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            <div className="mb-1">User: {transaction.user}</div>
            <div className="font-mono text-gray-500 text-xs">{transaction.date}</div>
          </div>
          <span className={`font-bold text-lg ${getAmountColor(transaction.type)}`}>
            {transaction.amount}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
          transaction.type === 'Credit' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
        }`}>
          {transaction.type}
        </span>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-800">
        <Link
          href={`/super-admin/transactions/${transaction.id}`}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-700/50 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span className="text-sm">View</span>
        </Link>
        <button 
          onClick={() => handleDeleteTransaction(transaction)}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">Delete</span>
        </button>
      </div>
    </div>
  );

  const renderMobileCard = (transaction: Transaction) => <TransactionCard transaction={transaction} />;

  if (isLoading) {
    return <TransactionsListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Transactions</h1>
            <p className="text-gray-400 text-sm mt-1">Monitor all financial transactions and payouts</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
             <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className="md:hidden flex items-center justify-center p-2 border border-gray-700 rounded-lg transition-colors text-gray-300 hover:bg-gray-800"
              >
                <Filter className="w-4 h-4" />
              </button>

            <button 
              onClick={handleExport}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export</span>
              <span className="inline md:hidden">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Section (Collapsible on Mobile) */}
        <div className={`bg-[#1E293B] p-3 md:p-4 rounded-xl border border-gray-800 ${filterOpen ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0F172A] text-white text-sm px-3 py-2 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none"
              >
                <option>All</option>
                <option>Success</option>
                <option>Processing</option>
                <option>Failed</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Type</label>
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-[#0F172A] text-white text-sm px-3 py-2 rounded-lg border border-gray-700 focus:border-yellow-500 outline-none"
              >
                <option>All</option>
                <option>Credit</option>
                <option>Debit</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => {
                setStatusFilter('All');
                setTypeFilter('All');
              }}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors border border-gray-700 rounded-lg"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden flex-1 min-h-0">
          <DataTable
            data={filteredTransactions}
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