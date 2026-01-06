'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, DollarSign, 
  ShoppingBag, Star, MoreHorizontal, Ban, MessageSquare, 
  Clock, Loader2
} from 'lucide-react';
import OrderHistoryTab from '../../vendors/[id]/components/orderhistorytab';
import Swal from 'sweetalert2';
import { CustomerDetailPageSkeleton } from './components/skeleton';
// import {CustomersDetailPageSkeleton} from "./components/skeleton"
// --- Types ---
type Address = {
  type: string;
  address: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  status: string;
  joined: string;
  lastLogin: string;
  totalSpent: string;
  totalOrders: number;
  avgRatingGiven: number;
  addresses: Address[];
};

type Order = {
  id: string;
  date: string;
  vendor: string;
  total: string;
  status: string;
};

// --- Mock Data (Fallback) ---
const mockCustomer: Customer = {
  id: 'CUS-001',
  name: 'Alice Johnson',
  email: 'alice.johnson@example.com',
  phone: '+1 (555) 987-6543',
  image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  status: 'Active',
  joined: '2023-11-15',
  lastLogin: '2 hours ago',
  totalSpent: '$1,245.50',
  totalOrders: 42,
  avgRatingGiven: 4.8,
  addresses: [
    { type: 'Home', address: '123 Maple Ave, Apt 4B, Brooklyn, NY' },
    { type: 'Work', address: '500 5th Ave, New York, NY' },
  ],
};

const mockOrders: Order[] = [
  { id: 'ORD-101', date: '2024-05-10', vendor: "Joe's Pizza", total: '$28.50', status: 'Delivered' },
  { id: 'ORD-098', date: '2024-05-08', vendor: 'FreshMart', total: '$145.20', status: 'Delivered' },
  { id: 'ORD-095', date: '2024-05-05', vendor: 'Pharmacy Now', total: '$12.00', status: 'Cancelled' },
  { id: 'ORD-092', date: '2024-05-01', vendor: 'Burger King', total: '$35.00', status: 'Delivered' },
];

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customerId = params?.id ?? 'CUS-001';
  
  // --- State ---
  const [activeTab, setActiveTab] = useState<'Orders' | 'Rides' | 'Transactions' | 'Logs'>('Orders');
  const [customer, setCustomer] = useState<Customer>(mockCustomer);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Customer Details
        const customerRes = await fetch(`/api/customers/${customerId}`);
        if (customerRes.ok) {
          const data = await customerRes.json();
          setCustomer(data);
        } else {
          console.warn("Using fallback mock data for Customer");
          setCustomer(mockCustomer);
        }

        // 2. Fetch Customer Orders
        const ordersRes = await fetch(`/api/customers/${customerId}/orders`);
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data);
        } else {
          console.warn("Using fallback mock data for Orders");
          setOrders(mockOrders);
        }

      } catch (error) {
        console.error("Failed to fetch data, falling back to mocks", error);
        setCustomer(mockCustomer);
        setOrders(mockOrders);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [customerId]);

  // --- Actions ---
  const handleSuspendAccount = async () => {
    const action = customer.status === 'Suspended' ? 'activate' : 'suspend';
    
    const result = await Swal.fire({
      title: `${action === 'suspend' ? 'Suspend' : 'Activate'} Account?`,
      text: `Are you sure you want to ${action} ${customer.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: action === 'suspend' ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`,
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        // API Call
        const response = await fetch(`/api/customers/${customerId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action === 'suspend' ? 'Suspended' : 'Active' })
        });

        if (!response.ok) throw new Error('Failed to update status');

        // Optimistic Update
        setCustomer(prev => ({
          ...prev,
          status: action === 'suspend' ? 'Suspended' : 'Active'
        }));

        Swal.fire({
          title: 'Success',
          text: `Account has been ${action}ed.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false
        });

      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Could not update account status.',
          icon: 'error',
          background: '#1E293B',
          color: '#fff'
        });
      }
    }
  };

  const handleSendMessage = () => {
    Swal.fire({
      title: 'Send Message',
      input: 'textarea',
      inputLabel: `Message to ${customer.name}`,
      inputPlaceholder: 'Type your message here...',
      inputAttributes: { 'aria-label': 'Type your message here' },
      showCancelButton: true,
      confirmButtonText: 'Send',
      confirmButtonColor: '#eab308',
      cancelButtonColor: '#6b7280',
      background: '#1E293B',
      color: '#fff',
      customClass: { input: 'bg-gray-700 text-white border-gray-600' }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        // API Call would go here
        Swal.fire({
          title: 'Sent!',
          text: 'Your message has been sent.',
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  if (isLoading) {
    return (
      <CustomerDetailPageSkeleton/>
   );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link
            href="/super-admin/users/customers"
            className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Customers
          </Link>
          <h1 className="text-3xl font-bold text-white">Customer Profile</h1>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleSendMessage}
            className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Send Message
          </button>
          
          <button 
            onClick={handleSuspendAccount}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              customer.status === 'Suspended'
                ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500 hover:text-white'
                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
            }`}
          >
            <Ban className="w-4 h-4" /> 
            {customer.status === 'Suspended' ? 'Activate Account' : 'Suspend Account'}
          </button>

          <button className="p-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: User Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 text-center">
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 border-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={customer.image}
                alt={customer.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-bold text-white">{customer.name}</h2>
            <p className="text-gray-400 text-sm font-mono mb-4">{customer.id}</p>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                customer.status === 'Active'
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
              }`}
            >
              {customer.status}
            </span>

            <div className="mt-8 space-y-4 text-left">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Mail className="w-4 h-4 text-gray-500" /> {customer.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Phone className="w-4 h-4 text-gray-500" /> {customer.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Calendar className="w-4 h-4 text-gray-500" /> Joined {customer.joined}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Clock className="w-4 h-4 text-gray-500" /> Last seen {customer.lastLogin}
              </div>
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Saved Addresses</h3>
            <div className="space-y-4">
              {customer.addresses.map((addr, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start p-3 bg-[#0F172A] rounded-xl border border-gray-800"
                >
                  <MapPin className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">{addr.type}</p>
                    <p className="text-sm text-white">{addr.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Stats & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-800">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total Spent</p>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-white">{customer.totalSpent}</span>
              </div>
            </div>
            <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-800">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total Orders</p>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-white">{customer.totalOrders}</span>
              </div>
            </div>
            <div className="bg-[#1E293B] p-5 rounded-xl border border-gray-800">
              <p className="text-gray-400 text-xs font-bold uppercase mb-1">
                Avg Rating Given
              </p>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">
                  <Star className="w-5 h-5 fill-yellow-500" />
                </div>
                <span className="text-2xl font-black text-white">
                  {customer.avgRatingGiven}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs & Content */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl overflow-hidden min-h-[400px]">
            {/* Tabs */}
            <div className="flex border-b border-gray-800 overflow-x-auto">
              {['Orders', 'Rides', 'Transactions', 'Logs'].map((tab) => (
                <button
                  key={tab}
                  onClick={() =>
                    setActiveTab(tab as 'Orders' | 'Rides' | 'Transactions' | 'Logs')
                  }
                  className={`px-6 py-4 text-sm font-bold transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'text-yellow-500 border-b-2 border-yellow-500 bg-[#0F172A]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'Orders' && <OrderHistoryTab orders={orders} />}

              {activeTab === 'Logs' && (
                <div className="space-y-4">
                  {[
                    { action: 'Login detected', ip: '192.168.1.1', time: '2 hours ago' },
                    { action: 'Password changed', ip: '192.168.1.1', time: '2 days ago' },
                    { action: 'Added new address', ip: '192.168.1.1', time: '1 week ago' },
                  ].map((log, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{log.action}</p>
                        <p className="text-xs text-gray-500">IP: {log.ip}</p>
                      </div>
                      <span className="text-xs text-gray-400">{log.time}</span>
                    </div>
                  ))}
                </div>
              )}

              {(activeTab === 'Rides' || activeTab === 'Transactions') && (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                  <Ban className="w-10 h-10 mb-2 opacity-20" />
                  No recent {activeTab.toLowerCase()} data found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}