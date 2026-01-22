'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, DollarSign, TrendingUp } from 'lucide-react';
import Swal from 'sweetalert2';
import useSWR from 'swr'; 
import { getSession } from 'next-auth/react'; 
import { fetcher } from '@/app/super-admin/hooks/useSuperAdminFetch';

// --- Components ---
import SkeletonLoader from './components/skeletonLoader';
import RevenueCard from './components/revenuecard';
import BusinessInfoCard from './components/businesscard';
import PerformanceChart from './components/performancechart';
import OrderHistoryTab from './components/orderhistorytab';
import ReviewsTab from './components/reviewstab';
import ActivityLogTab from './components/activitylogtab';
import VendorHeader from './components/vendorheader';
import HealthScoreCard from './components/healthcard';
import ProductsTabContent from './components/productstabcontent';
import PayoutsTabContent from './components/payoutstabcontent';
import DocumentsTab from '@/app/super-admin/component/documentstab';

// --- Types ---

// ✅ FIXED: Updated to match what ProductsTabContent expects
interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  image?: string;
  category: string; // Added required property
  stock?: number;
}

// ✅ FIXED: Updated to match what ActivityLogTab expects
interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  user: string;      // Added required property
  timestamp: string; // Added required property (replaces or maps to 'date')
}

// ✅ FIXED: Updated to match what PerformanceChart expects
interface PerformanceData {
  date: string;
  revenue: number;   // Changed from 'value' to 'revenue'
}

interface VendorDocument {
  id: string;
  name: string;
  url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  uploadedDate: string;
  type?: string; 
  createdAt?: string; 
}

interface VendorDetails {
  id: string;
  name: string;      
  ownerName: string; 
  email: string;
  phone: string;
  status: string;
  verification: string;
  totalRevenue: number;
  unpaidBalance: number;
  totalOrders: number;
  orders: any[];
  reviews: any[];
  address?: string;
  vendorDocuments: VendorDocument[];
}

// Payouts response structure
type PayoutsResponse = { history: any[] } | any[]; 

// --- Validation Helper ---
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// --- Simple Tab Loader Component ---
const TabLoader = () => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in">
    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
    <p className="text-gray-500 text-sm font-medium">Loading tab data...</p>
  </div>
);

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slugOrId = params?.id as string; 
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // --- UI State ---
  const [activeTab, setActiveTab] = useState('Order History');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local form state
  const [formData, setFormData] = useState({ 
    storeName: '', ownerName: '', phone: '', email: '' , address: ''
  });

  // Helper to get auth token
  const getAuthHeader = async () => {
    const session = await getSession();
    const token = (session as any)?.accessToken;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
    };
  };

  // DATA FETCHING (Main & Tabs)

  // 1. Main Vendor Profile
  const { 
    data: vendor, 
    error, 
    isLoading: isVendorLoading, 
    mutate: mutateVendor 
  } = useSWR<VendorDetails>(
    slugOrId ? `/super-admin/vendors/${slugOrId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (!isEditing) {
            setFormData({
                storeName: data.name,     
                ownerName: data.ownerName || '',
                phone: data.phone || '',
                address: data.address || '', 
                email: data.email
            });
        }
      }
    }
  );

  // 2. Performance Charts
  const { data: performanceData } = useSWR<PerformanceData[]>(
    vendor?.id ? `/super-admin/vendors/${vendor.id}/performance?days=30` : null,
    fetcher
  );

  // 3. Tab Specific Data
  
  // -- Products --
  const { 
    data: products, 
    mutate: mutateProducts,
    isLoading: isProductsLoading 
  } = useSWR<Product[]>(
    vendor?.id && activeTab === 'Products' ? `/super-admin/vendors/${vendor.id}/products` : null,
    fetcher
  );

  // -- Documents --
  const { 
    data: documentsData, 
    mutate: mutateDocuments,
    isLoading: isDocumentsLoading
  } = useSWR<VendorDocument[]>(
    vendor?.id && activeTab === 'Documents' ? `/super-admin/vendors/${vendor.id}/documents` : null,
    fetcher
  );

  // -- Payouts --
  const { 
    data: payoutsData, 
    mutate: mutatePayouts,
    isLoading: isPayoutsLoading
  } = useSWR<PayoutsResponse>(
    vendor?.id && activeTab === 'Payouts' ? `/super-admin/vendors/${vendor.id}/payouts` : null,
    fetcher
  );

  // Normalize payouts structure
  const payoutsHistory = (payoutsData && 'history' in payoutsData 
    ? payoutsData.history 
    : Array.isArray(payoutsData) ? payoutsData : []) || [];

  // -- Activity Log --
  const { 
    data: activityLogs,
    isLoading: isActivityLoading
  } = useSWR<ActivityLog[]>(
    vendor?.id && activeTab === 'Activity Log' ? `/super-admin/vendors/${vendor.id}/activity` : null,
    fetcher
  );

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const handleSave = async () => {
    if (!validateEmail(formData.email)) {
      Swal.fire({ icon: 'warning', title: 'Invalid Email', background: '#1E293B', color: '#fff' });
      return;
    }

    setIsSaving(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/api/super-admin/vendors/${vendor?.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed');
      
      mutateVendor();
      setIsEditing(false);
      Swal.fire({ icon: 'success', title: 'Updated!', timer: 1500, showConfirmButton: false, background: '#1E293B', color: '#fff' });
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Could not save changes.', background: '#1E293B', color: '#fff' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProductBan = async (productId: string, currentStatus: string) => {
    const newStatus = (currentStatus === 'BANNED' || currentStatus === 'DISABLED') ? 'ACTIVE' : 'DISABLED';
    
    // Optimistic Update
    if (products) {
        mutateProducts(products.map((p) => p.id === productId ? { ...p, status: newStatus } : p), false);
    }

    try {
      const headers = await getAuthHeader();
      await fetch(`${API_URL}/api/super-admin/vendors/products/${productId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      Swal.fire({ icon: 'success', title: `Product ${newStatus === 'ACTIVE' ? 'Activated' : 'Banned'}`, toast: true, position: 'bottom-end', timer: 1500, showConfirmButton: false, background: '#1E293B', color: '#fff' });
      mutateProducts();
    } catch {
      mutateProducts();
      Swal.fire({ icon: 'error', title: 'Action Failed', toast: true, position: 'top-end', background: '#1E293B', color: '#fff' });
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string) => {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/api/super-admin/verification/documents/${docId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status, rejectionReason })
      });

      if (!res.ok) throw new Error('Action failed');

      Swal.fire({
        title: status === 'VERIFIED' ? 'Verified' : 'Rejected',
        icon: status === 'VERIFIED' ? 'success' : 'warning',
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false,
        background: '#1E293B', color: '#fff'
      });
      mutateDocuments();
      mutateVendor(); 
    } catch (error) {
      Swal.fire({ title: 'Error', text: 'Could not update document', icon: 'error' });
    }
  };

  const handleProcessPayout = async () => {
    if (!vendor?.unpaidBalance || vendor.unpaidBalance <= 0) return;

    const result = await Swal.fire({
      title: 'Confirm Payout',
      text: `Send $${vendor.unpaidBalance.toLocaleString()} to vendor?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Pay',
      confirmButtonColor: '#10b981',
      background: '#1E293B', color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const headers = await getAuthHeader();
        const res = await fetch(`${API_URL}/api/super-admin/vendors/${vendor.id}/payouts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ amount: vendor.unpaidBalance })
        });
        
        if (!res.ok) throw new Error('Payout failed');
        
        mutatePayouts();
        mutateVendor();
        Swal.fire({ title: 'Paid!', icon: 'success', background: '#1E293B', color: '#fff' });
      } catch {
        Swal.fire({ title: 'Error', text: 'Payout failed', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  const handleMessageVendor = async () => {
    const { value: text } = await Swal.fire({
      title: 'Message Vendor',
      input: 'textarea',
      inputLabel: `Send an email to ${vendor?.name}`,
      inputPlaceholder: 'Type your message here...',
      showCancelButton: true,
      confirmButtonText: 'Send Email',
      confirmButtonColor: '#3b82f6', 
      cancelButtonColor: '#ef4444',
      background: '#1E293B',
      color: '#fff',
      showLoaderOnConfirm: true,
      preConfirm: async (message) => {
        if (!message) return Swal.showValidationMessage('Message cannot be empty');
        
        try {
          const headers = await getAuthHeader();
          
          const response = await fetch(`${API_URL}/super-admin/vendors/${vendor?.id}/message`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ message })
          });

          if (!response.ok) throw new Error(response.statusText);
          return await response.json();
        } catch (error) {
          Swal.showValidationMessage(`Request failed: ${error}`);
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (text) {
      Swal.fire({
        title: 'Sent!',
        text: 'The vendor has been emailed.',
        icon: 'success',
        background: '#1E293B',
        color: '#fff',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isVendorLoading) return <SkeletonLoader />;
  if (error || !vendor) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-gray-400">Vendor not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6 pb-20">
      
      {/* 1. Header Component */}
      <VendorHeader 
        name={vendor.name} 
        status={vendor.status} 
        isEditing={isEditing} 
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onBack={() => router.back()}
        onMessage={handleMessageVendor}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* 2. Info Columns */}
        <div className="space-y-6">
            <HealthScoreCard totalOrders={vendor.totalOrders} />
            <BusinessInfoCard 
              vendor={vendor}
              formData={formData}
              isEditing={isEditing}
              onFormChange={(data) => setFormData(prev => ({...prev, ...data}))}
            />
        </div>

        {/* 3. Financials Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RevenueCard 
              title="Total Revenue" 
              amount={`$${vendor.totalRevenue?.toLocaleString() || '0.00'}`} 
              change={0} 
              icon={DollarSign} 
              color="green" 
              onClick={() => setActiveTab('Order History')} 
            />
            <RevenueCard 
              title="Unpaid Balance" 
              amount={`$${vendor.unpaidBalance?.toLocaleString() || '0.00'}`} 
              icon={TrendingUp} 
              color="yellow" 
              onClick={() => setActiveTab('Payouts')} 
            />
          </div>
          {/* ✅ Passed array fallback */}
          <PerformanceChart data={performanceData || []} />
        </div>
      </div>

      {/* 4. Tabs Section */}
      <div className="mt-8 w-full bg-[#1E293B] border-t border-gray-800 rounded-t-xl overflow-hidden min-h-[500px]">
        <div className="flex border-b border-gray-800 overflow-x-auto px-6 hide-scrollbar">
          {['Order History', 'Products', 'Payouts', 'Documents', 'Reviews', 'Activity Log'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab 
                  ? 'text-yellow-500 border-yellow-500 bg-[#0F172A]/50' 
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
            {/* --- ORDERS --- */}
            {activeTab === 'Order History' && (
                <OrderHistoryTab orders={vendor.orders || []} />
            )}
            
            {/* --- PRODUCTS --- */}
            {activeTab === 'Products' && (
              <ProductsTabContent 
                products={products || []} 
                onToggleBan={toggleProductBan} 
                isLoading={isProductsLoading} 
              />
            )}

            {/* --- PAYOUTS --- */}
            {activeTab === 'Payouts' && (
              isPayoutsLoading ? <TabLoader /> : (
                <PayoutsTabContent 
                  unpaidBalance={vendor.unpaidBalance} 
                  payouts={payoutsHistory} 
                  onProcessPayout={handleProcessPayout} 
                />
              )
            )}

            {/* --- DOCUMENTS --- */}
            {activeTab === 'Documents' && (
              isDocumentsLoading ? <TabLoader /> : (
                <DocumentsTab 
                  documents={(documentsData || vendor?.vendorDocuments || []).map((doc) => ({
                    id: doc.id,
                    url: doc.url,
                    status: doc.status,
                    rejectionReason: doc.rejectionReason,
                    type: doc.type || doc.name || 'Document', 
                    createdAt: doc.createdAt || doc.uploadedDate || new Date().toISOString()
                  }))} 
                  
                  onVerify={(id) => handleVerifyDocument(id, 'VERIFIED')}
                  onReject={(id, reason) => handleVerifyDocument(id, 'REJECTED', reason)}
                  showUploadButton={true}
                />
              )
            )}

            {/* --- REVIEWS --- */}
            {activeTab === 'Reviews' && (
                <ReviewsTab reviews={vendor.reviews || []} />
            )}

            {/* --- ACTIVITY --- */}
            {activeTab === 'Activity Log' && (
                isActivityLoading ? <TabLoader /> : (
                    <ActivityLogTab logs={activityLogs || []} />
                )
            )}
        </div>
      </div>
    </div>
  );
}