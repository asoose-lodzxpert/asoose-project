'use client';

import React, { useState } from 'react';
import useSWR from 'swr'; 
import { getSession } from 'next-auth/react'; // ✅ Import NextAuth
import { CustomerDetailPageSkeleton } from './components/skeleton';
import { fetcher } from '@/app/super-admin/hooks/useSuperAdminFetch';
import { CustomerHeader } from './components/customerHeader';
import { CustomerSidebar } from './components/customerSidebar';
import { CustomerStats } from './components/CustomerStats';
import { CustomerContentTabs } from './components/CustomerContentTabs';
import { AppAlert } from './alerts';

import { CustomerProfile, Order, Ride } from './types';

// ✅ Fix API URL Logic
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + (process.env.NEXT_PUBLIC_API_URL?.endsWith('/api') ? '' : '/api');

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = React.use(params);
  const [activeTab, setActiveTab] = useState<'Orders' | 'Rides' | 'Logs'>('Orders');

  // ✅ Helper: Get Auth Header using NextAuth
  const getAuthHeader = async () => {
    const session = await getSession();
    const token = (session as any)?.accessToken;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
    };
  };

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const { 
    data: customer, 
    error, 
    isLoading, 
    mutate: mutateProfile 
  } = useSWR<CustomerProfile>(
    customerId ? `/super-admin/customers/${customerId}` : null,
    fetcher
  );

  const { data: orders, isLoading: ordersLoading } = useSWR<Order[]>(
    customerId && activeTab === 'Orders' ? `/super-admin/customers/${customerId}/orders` : null,
    fetcher
  );

  const { data: rides, isLoading: ridesLoading } = useSWR<Ride[]>(
    customerId && activeTab === 'Rides' ? `/super-admin/customers/${customerId}/rides` : null,
    fetcher
  );

  const isTabLoading = (activeTab === 'Orders' && ordersLoading) || (activeTab === 'Rides' && ridesLoading);

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleUpdateProfile = async (data: Partial<CustomerProfile>) => {
    try {
      const headers = await getAuthHeader(); // ✅ Get Headers
      const res = await fetch(`${API_URL}/super-admin/customers/${customerId}`, {
        method: 'PATCH',
        headers, // ✅ Add Headers
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update');
      }

      AppAlert.success('Profile Updated Successfully');
      mutateProfile();
    } catch (error: any) {
      console.error(error);
      AppAlert.error('Update Failed', error.message);
      throw error; 
    }
  };

  const handleToggleStatus = async () => {
    if (!customer) return;
    const isBanning = customer.status !== 'BANNED'; // Logic: If not banned, action is to BAN
    
    const result = await AppAlert.confirm(
      isBanning ? 'Ban Customer?' : 'Unban Customer?', 
      isBanning ? 'User will be logged out immediately.' : 'User access will be restored.',
      isBanning ? 'Yes, Ban' : 'Yes, Unban', 
      isBanning 
    );

    if (result.isConfirmed) {
      try {
        const newStatus = isBanning ? 'BANNED' : 'ACTIVE';
        const headers = await getAuthHeader(); // ✅ Get Headers
        
        await fetch(`${API_URL}/super-admin/customers/${customerId}/status`, {
          method: 'PATCH',
          headers, // ✅ Add Headers
          body: JSON.stringify({ status: newStatus })
        });

        AppAlert.success(isBanning ? 'Customer Banned' : 'Customer Unbanned'); 
        mutateProfile();
      } catch (err) {
        AppAlert.error('Update Failed', 'Could not update user status.');
      }
    }
  };

  const handleSendMessage = async () => {
    const result = await AppAlert.input('Send Message', 'Type your message...');
    if (result.isConfirmed) {
      // Placeholder for future API integration
      AppAlert.success('Message Sent!');
    }
  };

  if (isLoading) return <CustomerDetailPageSkeleton />;
  if (error || !customer) return <div className="text-white text-center p-10">Customer not found</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20">
      <CustomerHeader 
        customer={customer} 
        onToggleStatus={handleToggleStatus} 
        onSendMessage={handleSendMessage} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CustomerSidebar customer={customer} onUpdate={handleUpdateProfile} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <CustomerStats stats={customer.stats || { totalOrders: 0, totalRides: 0, totalSpent: 0 }} />
          
          <CustomerContentTabs 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            orders={orders || []}
            rides={rides || []}
            isLoading={isTabLoading}
            customerName={customer.name}
          />
        </div>
      </div>
    </div>
  );
}