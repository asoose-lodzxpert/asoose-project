'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { ShoppingBag, Car, Package, MapPin, User, ChevronRight, Trash2, ShieldCheck } from 'lucide-react';
import { useSession, signOut } from "next-auth/react";

import { ProfileHeader } from '@/app/main/components/profile/ProfileHeader';
import { ProfileTabs, ProfileTab } from '@/app/main/components/profile/ProfileTabs';
import { AddressCard } from '@/app/main/components/profile/AddressCard';
import { AddAddressModal } from '@/app/main/components/profile/AddAddressModal';
import { EditProfileModal } from '@/app/main/components/profile/EditProfileModal';
import { OrderCard } from '@/app/main/components/profile/OrderCard';
import { RideCard } from '@/app/main/components/profile/ridecard';
import { DeliveryCard } from '@/app/main/components/profile/deliverycard';
import BottomNav from '@/app/main/components/layout/BottomNav';
import { EmptyState } from '@/app/main/components/profile/EmptyState';
import { ProfileSkeleton, ContentSkeleton } from '@/app/main/components/profile/skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('orders');
  
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const [profile, setProfile] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  const defaultAddr = useMemo(() => 
    addresses.find((a: any) => a.isDefault) || addresses[0] || null, 
    [addresses]
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  };

  const fetchWithAuth = useCallback(async (path: string, accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (res.status === 401) {
        await signOut({ callbackUrl: '/sign-in' });
        throw new Error('Session expired');
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      return await res.json();
    } catch (e) {
      console.error(`Fetch error for ${path}`, e);
      const resource = path.split('/').pop();
      toast.error(`Failed to load ${resource}`);
      return [];
    }
  }, []);

  const fetchTabData = useCallback(async (tab: ProfileTab, accessToken: string) => {
    setIsTabLoading(true);
    try {
      switch(tab) {
        case 'orders':
          setOrders(await fetchWithAuth('/users/orders', accessToken));
          break;
        case 'rides':
          setRides(await fetchWithAuth('/users/rides', accessToken));
          break;
        case 'deliveries':
          setDeliveries(await fetchWithAuth('/users/deliveries', accessToken));
          break;
      }
    } catch (e) {
      console.error("Tab load error", e);
    } finally {
      setIsTabLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    // ✅ ADDED: Super Admin Redirect Check
    // If the user is a Super Admin, redirect immediately to the dashboard.
    // We return early so 'init()' is never called, keeping 'isPageLoading' true
    // which prevents the profile content from flashing.
    if (session?.user?.role === 'SUPER_ADMIN') {
      router.push('/super-admin/dashboard');
      return;
    }

    const init = async () => {
      try {
        const accessToken = session?.accessToken;
        
        if (!accessToken) {
          console.error("Session exists but no Access Token found. Forcing logout.");
          await signOut({ callbackUrl: '/sign-in' }); 
          return;
        }
        
        setToken(accessToken);

        const [prof, addr] = await Promise.all([
          fetchWithAuth('/users/profile', accessToken),
          fetchWithAuth('/users/addresses', accessToken)
        ]);

        if (prof) {
          if (Array.isArray(prof) && prof.length === 0) {
            console.warn("Received empty array for profile. Check backend implementation.");
          }
          setProfile(prof);
        }

        if (addr) setAddresses(addr);
        
        await fetchTabData('orders', accessToken);
        
      } catch (err) {
        console.error("Profile init failed", err);
        toast.error("Failed to load profile data");
      } finally {
        setIsPageLoading(false);
      }
    };

    if (session) {
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router]);

  useEffect(() => {
    if (token) fetchTabData(activeTab, token);
  }, [activeTab, token]);

  const handleUpdateProfile = async (data: { name: string; phone: string }) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error('Update failed');
      
      setProfile((prev: any) => ({ ...prev, ...data }));
      toast.success("Profile updated");
      setIsEditProfileOpen(false);
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("Update failed");
    }
  };

  const handleAddAddress = async (addressData: any) => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/users/addresses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(addressData),
      });

      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Could not parse backend response:", text);
        throw new Error(`Invalid backend response (Status: ${res.status})`);
      }

      if (!res.ok) {
        const message = data.message 
          ? (Array.isArray(data.message) ? data.message.join(', ') : data.message)
          : data.error || "Failed to create address";
        throw new Error(message);
      }

      const updatedAddresses = await fetchWithAuth('/users/addresses', token);
      setAddresses(updatedAddresses);
      setIsAddressModalOpen(false);
      toast.success("Address added successfully");
      
    } catch (error: any) {
      console.error("Add address error:", error);
      toast.error(error.message || "Failed to add address");
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_URL}/users/profile`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Delete failed');

        await signOut({ callbackUrl: '/' });
        toast.success('Account deleted successfully');
      } catch (error) {
        console.error(error);
        toast.error('Failed to delete account');
      }
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!token) return;
    
    const isDark = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: 'Delete Address?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
      background: isDark ? '#1a1a1a' : '#fff',
      color: isDark ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_URL}/users/addresses/${id}`, { 
          method: 'DELETE', 
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Delete failed');

        setAddresses(prev => prev.filter(a => a.id !== id));
        toast.success('Address deleted');
      } catch (err) {
        console.error('Delete error:', err);
        toast.error('Delete failed');
        const refreshed = await fetchWithAuth('/users/addresses', token);
        setAddresses(refreshed);
      }
    }
  };

  if (status === 'loading' || isPageLoading) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24">
      <ProfileHeader 
        profile={profile} 
        greeting={getGreeting()} 
        defaultAddr={defaultAddr} 
        orderCount={orders.length} 
        onEditProfile={() => setIsEditProfileOpen(true)}
        onLogout={() => signOut({ callbackUrl: '/sign-in' })}
      />

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-4xl mx-auto px-4 py-8 min-h-[400px]">
        {isTabLoading ? <ContentSkeleton /> : (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {activeTab === 'orders' && (
               <div className="space-y-4">
                 {orders.length === 0 ? (
                   <EmptyState 
                     icon={ShoppingBag} 
                     title="No orders yet" 
                     desc="Looks like you haven't ordered anything yet." 
                     actionLabel="Start Shopping" 
                     actionLink="/main/store" 
                   />
                 ) : (
                   orders.map((order) => (
                     <Link 
                       href={`/main/orders/${order.id}`} 
                       key={order.id} 
                       className="block hover:scale-[1.01] transition-transform"
                     >
                       <OrderCard 
                         id={order.id.slice(0, 8).toUpperCase()} 
                         status={order.status}
                         date={new Date(order.createdAt).toLocaleDateString()}
                         total={`₦${order.total.toLocaleString()}`}
                         items={order.items.map((i: any) => `${i.quantity}x ${i.name}`)} 
                       />
                     </Link>
                   ))
                 )}
               </div>
             )}

             {activeTab === 'rides' && (
               <div className="space-y-4">
                 {rides.length === 0 ? (
                   <EmptyState 
                     icon={Car} 
                     title="No rides yet" 
                     desc="Need a ride? Book one now." 
                     actionLabel="Book a Ride" 
                     actionLink="/main/ride" 
                   />
                 ) : (
                   rides.map((ride) => <RideCard key={ride.id} {...ride} />)
                 )}
               </div>
             )}

             {activeTab === 'deliveries' && (
               <div className="space-y-4">
                 {deliveries.length === 0 ? (
                   <EmptyState 
                     icon={Package} 
                     title="No deliveries yet" 
                     desc="Send packages securely across the city." 
                     actionLabel="Send Package" 
                     actionLink="/main/delivery" 
                   />
                 ) : (
                   deliveries.map((delivery) => <DeliveryCard key={delivery.id} {...delivery} />)
                 )}
               </div>
             )}

             {activeTab === 'addresses' && (
               <div className="space-y-6">
                 <button 
                   onClick={() => setIsAddressModalOpen(true)} 
                   className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-400 font-bold hover:border-yellow-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-all"
                 >
                   <MapPin className="w-6 h-6" />
                   <span>Add New Address</span>
                 </button>
                 <div className="grid sm:grid-cols-2 gap-4">
                   {addresses.map((addr) => (
                     <AddressCard key={addr.id} {...addr} onDelete={handleDeleteAddress} />
                   ))}
                 </div>
               </div>
             )}

             {activeTab === 'settings' && (
               <div className="max-w-xl mx-auto space-y-6">
                 <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                   <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 font-bold flex items-center gap-2">
                     <User className="w-4 h-4"/> Personal Info
                   </div>
                   <div className="p-2">
                      <button 
                        onClick={() => setIsEditProfileOpen(true)} 
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-left font-medium text-sm"
                      >
                        <span>Edit Profile Details</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                   </div>
                 </div>
                 
                 <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                   <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 font-bold flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4"/> Security
                   </div>
                   <div className="p-6 flex items-start gap-4">
                     <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full">
                       <Trash2 className="w-6 h-6" />
                     </div>
                     <div>
                       <h4 className="font-bold text-red-600">Delete Account</h4>
                       <p className="text-sm text-gray-500 mt-1 mb-4">This action is irreversible.</p>
                       <button className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold text-sm rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                         Request Deletion
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </div>
        )}
      </main>

      <BottomNav />
      
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