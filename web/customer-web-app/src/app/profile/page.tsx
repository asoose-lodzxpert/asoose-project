'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Loader2, Edit2, LogOut, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddressCard } from '@/components/profile/AddressCard';
import { AddAddressModal } from '@/components/profile/AddAddressModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { OrderCard } from '@/components/profile/OrderCard';
import { toast } from 'react-toastify'
import Swal from 'sweetalert2';
import Link from 'next/link';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';


export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    addresses: [] as any[]
  });

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/sign-in'); return; }
      setToken(session.access_token);

      // 1. Fetch Profile Info
      const profileRes = await fetch(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }

      // 2. Fetch Orders (NEW)
      const ordersRes = await fetch(`${API_URL}/users/orders`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (ordersRes.ok) {
        setOrders(await ordersRes.json());
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

const handleUpdateProfile = async (data: { name: string; phone: string }) => {
    if (!token) return;
    
    const toastId = toast.loading("Updating profile...");

    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to update');

      setProfile(prev => ({ ...prev, ...data }));

      toast.update(toastId, { 
        render: "Profile updated successfully!", 
        type: "success", 
        isLoading: false, 
        autoClose: 3000 
      });

    } catch (error) {
      console.error(error);
      toast.update(toastId, { 
        render: "Failed to update profile.", 
        type: "error", 
        isLoading: false, 
        autoClose: 3000 
      });
    }
  };

 const handleAddAddress = async (addressData: any) => {
    if (!token) return;
    
    const toastId = toast.loading("Saving address...");

    try {
      const res = await fetch(`${API_URL}/users/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(addressData),
      });

      if (!res.ok) throw new Error('Failed to save');

      await fetchProfile();
      
      toast.update(toastId, { render: "Address added successfully!", type: "success", isLoading: false, autoClose: 3000 });
      
    } catch (error) {
      toast.update(toastId, { render: "Could not save address.", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

const handleDeleteAddress = async (id: string) => {
    if (!token) return;
const isDarkMode = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
        background: isDarkMode ? '#1a1a1a' : '#ffffff',
  color: isDarkMode ? '#ffffff' : '#000000',
      title: 'Delete Address?',
      text: "You won't be able to undo this action.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000000', 
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      customClass: {
        popup: 'rounded-2xl' 
      }
    });

    if (result.isConfirmed) {
      const toastId = toast.loading("Deleting address...");

      try {
        const res = await fetch(`${API_URL}/users/address/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed');

        setProfile(prev => ({ 
          ...prev, 
          addresses: prev.addresses.filter(a => a.id !== id) 
        }));
        
        toast.update(toastId, { 
          render: "Address deleted successfully.", 
          type: "success", 
          isLoading: false, 
          autoClose: 3000 
        });

      } catch (error) {
        toast.update(toastId, { 
          render: "Failed to delete address.", 
          type: "error", 
          isLoading: false, 
          autoClose: 3000 
        });
      }
    }
  };

  const handleDeleteAccount = async () => {
    const result = await Swal.fire({
      title: 'Delete your account?',
      text: "This will deactivate your account immediately. You won't be able to log in.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33', 
      cancelButtonColor: '#000000',
      confirmButtonText: 'Yes, delete it',
      background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
      color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      const toastId = toast.loading("Deactivating account...");

      try {
        const res = await fetch(`${API_URL}/users/profile`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed');

        toast.update(toastId, { render: "Account deactivated.", type: "success", isLoading: false });
        
        await supabase.auth.signOut();
        router.push('/sign-in');
        
      } catch (error) {
        toast.update(toastId, { render: "Could not delete account.", type: "error", isLoading: false });
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24">
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* header */}
        <div className="flex flex-col sm:flex-row items-start justify-between mb-8 sm:mb-10 gap-4">
          <div className="flex gap-3 sm:gap-5 w-full sm:w-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold border-2 border-white dark:border-[#0a0a0a] shadow-sm overflow-hidden flex-shrink-0">
               {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : profile.name?.charAt(0)}
            </div>
            <div className="pt-1 sm:pt-2 flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black truncate">{profile.name}</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mb-1 truncate">{profile.email}</p>
              <p className="text-xs sm:text-sm text-gray-400 truncate">{profile.phone || 'No phone added'}</p>
            </div>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="p-2.5 sm:p-3 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={handleSignOut}
              className="p-2.5 sm:p-3 rounded-full bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 2. address */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold">My Addresses</h2>
            <button onClick={() => setIsAddressModalOpen(true)} className="text-xs sm:text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:underline">
              + Add New
            </button>
          </div>
          
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {profile.addresses && profile.addresses.length > 0 ? (
              profile.addresses.map((addr: any) => (
                <div key={addr.id} className="min-w-[260px] sm:min-w-[280px]">
                  <AddressCard 
                    {...addr} 
                    tag={addr.city} 
                    onDelete={handleDeleteAddress} 
                  />
                </div>
              ))
            ) : (
              <div 
                onClick={() => setIsAddressModalOpen(true)}
                className="w-full py-6 sm:py-8 border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-yellow-500/50 hover:bg-yellow-50 dark:hover:bg-yellow-500/5 transition-all"
              >
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 mb-2 opacity-50" />
                <span className="text-xs sm:text-sm font-bold">Add your first address</span>
              </div>
            )}
          </div>
        </div>

        
        {/* 3. ORDER HISTORY */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-base sm:text-lg font-bold mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {orders.length > 0 ? (
              orders.map((order: any) => (
                <Link href={`/orders/${order.id}`} key={order.id}>
                  <OrderCard 
                  key={order.id} 
                  id={order.id.slice(0, 8).toUpperCase()} 
                  status={order.status}
                  date={new Date(order.createdAt).toLocaleDateString('en-GB', { 
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                  })}
                  total={`₦${order.total.toLocaleString()}`}
                  items={order.items.map((i: any) => `${i.quantity}x ${i.name}`)} 
                />

                </Link>
              ))
            ) : (
               // Empty State
               <div className="text-center py-8 sm:py-10 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                 <p className="text-sm sm:text-base text-gray-400 font-medium">No orders yet</p>
               </div>
            )}
          </div>
        </div>

        {/* 4. DANGER ZONE - DELETE ACCOUNT */}
        <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-gray-200 dark:border-white/10">
          <h2 className="text-base sm:text-lg font-bold text-red-600 dark:text-red-500 mb-3">Danger Zone</h2>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 text-sm sm:text-base">Delete Account</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Permanently deactivate your account. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto sm:ml-4 flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>

      </div>

      <BottomNav />
      
      {/* Modals */}
      <AddAddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
        onSave={handleAddAddress} 
      />
      
      <EditProfileModal
        isOpen={isEditProfileOpen}
        initialData={{ name: profile.name, phone: profile.phone }}
        onClose={() => setIsEditProfileOpen(false)}
        onSave={handleUpdateProfile}
      />
    </div>
  );
}