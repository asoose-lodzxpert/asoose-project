'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit, CheckCircle, XCircle, Mail, Phone, MapPin, 
  Star, Clock, Save, Loader2, Trash2, DollarSign, TrendingUp, 
  Settings, Percent, ToggleLeft, ToggleRight, Download, Upload,
  Search, FileCheck, Activity, TrendingDown,
  CheckSquare, Square, Eye, AlertCircle, BarChart3, RefreshCw,
  MessageSquare, UserCheck, ShieldAlert
} from 'lucide-react';
import Swal from 'sweetalert2';
import SkeletonLoader from './components/skeletonLoader';
import RevenueCard from './components/revenuecard';
import BusinessInfoCard from './components/businesscard';
import PerformanceChart from './components/performancechart';
import OrderHistoryTab from './components/orderhistorytab';
import DocumentsTab from './components/documentstab';
import ReviewsTab from './components/reviewstab';
import AdminNotesSection from './components/adminnotessection';
import ActivityLogTab from './components/activitylogtab';
interface Vendor {
  id: string;
  name: string;
  image: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  status: string;
  onlineStatus: string;
  totalRevenue: string;
  unpaidBalance: string;
  rating: number;
  reviews: number;
  totalOrders: number;
  revenueChange: number;
}

export default function VendorDetailPage() {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Order History');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: ''
  });

  // Mock Data
  const orders = [
    { id: '#ORD-999', date: '2024-05-20', customer: 'John Doe', status: 'Delivered', total: '$45.00' },
    { id: '#ORD-998', date: '2024-05-19', customer: 'Jane Smith', status: 'Pending', total: '$22.50' },
    { id: '#ORD-997', date: '2024-05-18', customer: 'Bob Wilson', status: 'Delivered', total: '$67.80' },
    { id: '#ORD-996', date: '2024-05-17', customer: 'Alice Brown', status: 'Cancelled', total: '$31.20' },
  ];

  const payouts = [
    { id: 'PAY-881', date: '2024-05-01', amount: '$450.00', status: 'Paid', method: 'Bank Transfer' },
    { id: 'PAY-882', date: '2024-04-15', amount: '$1,200.00', status: 'Paid', method: 'Stripe' },
  ];

  const documents = [
    { name: "Business Registration", file: "joes_pizza_reg.pdf", status: "Verified", uploadedDate: "2024-01-15" },
    { name: "Tax ID", file: "joes_pizza_tax.pdf", status: "Pending", uploadedDate: "2024-05-10" },
    { name: "Health Certificate", file: "health_cert.pdf", status: "Verified", uploadedDate: "2024-03-20" },
  ];

  const activityLogs = [
    { id: '1', action: 'Status Changed', user: 'Admin John', timestamp: '2 hours ago', details: 'Changed vendor status from Pending to Active' },
    { id: '2', action: 'Profile Updated', user: 'Admin Sarah', timestamp: '1 day ago', details: 'Updated phone number and address' },
    { id: '3', action: 'Document Verified', user: 'Admin Mike', timestamp: '3 days ago', details: 'Verified Business Registration document' },
    { id: '4', action: 'Payout Processed', user: 'System', timestamp: '5 days ago', details: 'Processed payout of $450.00' },
  ];

  // New Data
  const reviews = [
    { id: '1', user: 'Alice M.', rating: 5, comment: 'Amazing packaging and fast delivery!', date: '2 days ago', orderId: '#ORD-999' },
    { id: '2', user: 'Bob D.', rating: 2, comment: 'Food was cold when it arrived.', date: '1 week ago', orderId: '#ORD-997' },
  ];

  const adminNotes = [
    { id: '1', admin: 'Super Admin', note: 'Vendor called regarding commission rates. Agreed to review next month.', date: '3 days ago' },
  ];

  // Fetch Data
  useEffect(() => {
    const fetchVendor = async () => {
      setTimeout(() => {
        const mockData: Vendor = {
          id: 'VDR-001',
          name: "Joe's Pizza",
          image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop",
          email: "joe@pizza.com",
          phone: "+1 (555) 123-4567",
          address: "123 Main St, Brooklyn, NY",
          category: "Restaurant",
          status: "Active",
          onlineStatus: "Online",
          totalRevenue: "$45,230.00",
          unpaidBalance: "$1,250.00",
          rating: 4.8,
          reviews: 1234,
          totalOrders: 1234,
          revenueChange: 12.5
        };

        setVendor(mockData);
        setFormData({
          name: mockData.name,
          phone: mockData.phone,
          address: mockData.address,
          email: mockData.email
        });
        setIsLoading(false);
      }, 1500);
    };

    fetchVendor();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setTimeout(() => {
      setVendor({ ...vendor!, ...formData });
      setIsEditing(false);
      setIsSaving(false);
      Swal.fire({
        title: 'Success!',
        text: 'Vendor profile updated successfully',
        icon: 'success',
        background: '#1E293B',
        color: '#fff',
        confirmButtonColor: '#eab308'
      });
    }, 1000);
  };

  const handleStatusChange = async (newStatus: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Change status to ${newStatus}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Active' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, change it!',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      setVendor({ ...vendor!, status: newStatus });
      Swal.fire({ title: 'Updated!', text: `Vendor status changed to ${newStatus}`, icon: 'success', background: '#1E293B', color: '#fff', confirmButtonColor: '#eab308' });
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Vendor?',
      text: "This action cannot be undone!",
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      Swal.fire({ title: 'Deleted!', text: 'Vendor has been deleted', icon: 'success', background: '#1E293B', color: '#fff', confirmButtonColor: '#eab308' });
    }
  };

  const handleImpersonate = () => {
    Swal.fire({
      title: 'Impersonating Vendor',
      text: 'Redirecting you to the Vendor Dashboard as "Joe\'s Pizza"...',
      icon: 'info',
      timer: 2000,
      timerProgressBar: true,
      background: '#1E293B',
      color: '#fff'
    });
  }

  // Document Handlers (kept same as before)
  const handleDocumentVerify = (name: string) => Swal.fire({ title: 'Verified!', icon: 'success', background: '#1E293B', color: '#fff' });
  const handleDocumentReject = (name: string) => Swal.fire({ title: 'Rejected!', icon: 'error', background: '#1E293B', color: '#fff' });

  if (isLoading) return <SkeletonLoader />;
  if (!vendor) return <div className="text-white p-10">Vendor not found</div>;

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <button className="text-gray-400 hover:text-white flex items-center gap-1 text-sm mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to List
            </button>
            <h1 className="text-3xl font-bold text-white">Vendor Profile: {vendor.name}</h1>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleImpersonate}
              className="flex items-center gap-2 px-4 py-2 border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
              title="Log in as this vendor"
            >
              <UserCheck className="w-4 h-4" /> Impersonate
            </button>

            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-all">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 disabled:opacity-50 transition-all">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:text-yellow-500 hover:border-yellow-500 transition-all">
                <Edit className="w-4 h-4" /> Edit Profile
              </button>
            )}
            <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${
          vendor.status === 'Pending' ? 'bg-yellow-500/10 border-yellow-500/20' : 
          vendor.status === 'Active' ? 'bg-green-500/10 border-green-500/20' : 
          'bg-red-500/10 border-red-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${vendor.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' : vendor.status === 'Active' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-sm uppercase tracking-wider ${vendor.status === 'Pending' ? 'text-yellow-500' : vendor.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                Current Status: {vendor.status}
              </h3>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {vendor.status !== 'Active' && (
              <button onClick={() => handleStatusChange('Active')} className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg flex items-center gap-2 transition-all">
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            )}
            {vendor.status !== 'Rejected' && (
              <button onClick={() => handleStatusChange('Rejected')} className="px-6 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 font-bold rounded-lg flex items-center gap-2 transition-all">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Business Info */}
          <BusinessInfoCard 
            vendor={vendor}
            formData={formData}
            isEditing={isEditing}
            onFormChange={setFormData}
          />

          {/* Right Column: Financial & Operational Stats */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Financial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RevenueCard
                title="Total Lifetime Revenue"
                amount={vendor.totalRevenue}
                change={vendor.revenueChange}
                icon={DollarSign}
                color="green"
                onClick={() => setActiveTab('Order History')}
              />
              <RevenueCard
                title="Unpaid Balance"
                amount={vendor.unpaidBalance}
                icon={TrendingUp}
                color="yellow"
                onClick={() => setActiveTab('Payouts')}
              />
            </div>

            {/* Performance Chart */}
            <PerformanceChart />
          </div>
        </div>
      </div>

      {/* Tabs Container */}
     <div className="mt-8 w-full bg-[#1E293B] border-t border-gray-800 min-h-[600px]">
        
        {/* Inner Content Constrained to max-w-7xl to match top section alignment */}
        <div className="max-w-7xl mx-auto">
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-800 overflow-x-auto px-6">
            {['Order History', 'Payouts', 'Documents', 'Reviews', 'Activity Log', 'Settings'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab 
                    ? 'text-yellow-500 border-yellow-500 bg-[#0F172A]/50' 
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="p-6">
            
            {/* 1. ORDER HISTORY */}
            {activeTab === 'Order History' && <OrderHistoryTab orders={orders} />}


            {/* 2. PAYOUTS */}
           {activeTab === 'Payouts' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-[#0F172A] border border-gray-700 rounded-xl">
                  <div>
                    <p className="text-gray-400 text-sm font-bold uppercase">Available for Payout</p>
                    <h3 className="text-3xl font-black text-white mt-1">{vendor.unpaidBalance}</h3>
                  </div>
                  <button className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg flex items-center gap-2 transition-all">
                    <DollarSign className="w-4 h-4" /> Pay Now
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Payout History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase font-bold border-b border-gray-700">
                        <tr>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Method</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {payouts.map((pay) => (
                          <tr key={pay.id} className="hover:bg-[#0F172A] transition-colors">
                            <td className="py-4 text-white">{pay.date}</td>
                            <td className="py-4 text-gray-400">{pay.method}</td>
                            <td className="py-4 font-bold text-white">{pay.amount}</td>
                            <td className="py-4">
                              <span className="text-green-500 font-bold">{pay.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. REVIEWS */}
           {activeTab === 'Reviews' && <ReviewsTab reviews={reviews} />}
            {activeTab === 'Activity Log' && <ActivityLogTab logs={activityLogs} />}

            {/* 4. DOCUMENTS */}
             {activeTab === 'Documents' && (
              <DocumentsTab 
                documents={documents} 
                onVerify={handleDocumentVerify}
                onReject={handleDocumentReject}
              />
            )}

            {/* 5. SETTINGS (With Admin Notes) */}
            {activeTab === 'Settings' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Configuration Controls */}
                  <div className="space-y-6">
                     <h3 className="font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4" /> Configuration</h3>
                     <div className="p-4 bg-[#0F172A] border border-gray-800 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                           <span className="text-white font-bold">Featured Vendor</span>
                           <ToggleLeft className="w-8 h-8 text-gray-600 cursor-pointer" />
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-white font-bold">Active Status</span>
                           <ToggleRight className="w-8 h-8 text-green-500 cursor-pointer" />
                        </div>
                     </div>
                  </div>

                  {/* Admin Notes Section */}
                  <div className="space-y-6">
                     <h3 className="font-bold text-white flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Admin Notes</h3>
                     <div className="p-4 bg-[#0F172A] border border-gray-800 rounded-xl">

                  <AdminNotesSection notes={adminNotes} />

                        <div className="bg-gray-800/50 p-3 rounded text-gray-300 text-sm">Vendor requested lower commission.</div>
                     </div>
                  </div>
               </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}