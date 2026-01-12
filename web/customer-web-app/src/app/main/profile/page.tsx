'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import Link from 'next/link';
import { ShoppingBag, Car, Package, MapPin, User, ChevronRight, Trash2, ShieldCheck } from 'lucide-react';

import { createClient } from '../../../../utils/supabase/client';
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
import { ProfileSkeleton,ContentSkeleton } from '@/app/main/components/profile/skeleton';
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // -- State --
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

  // -- Memoized Data --
  const defaultAddr = useMemo(() => 
    addresses.find((a: any) => a.isDefault) || addresses[0], [addresses]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  };

  // -- API Helpers --
  const fetchWithAuth = useCallback(async (path: string, accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return res.ok ? await res.json() : [];
    } catch (e) {
      console.error(`Fetch error for ${path}`, e);
      return [];
    }
  }, []);

  const fetchTabData = useCallback(async (tab: ProfileTab, accessToken: string) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    setIsTabLoading(true);
    try {
      if (tab === 'orders' && orders.length === 0) {
        setOrders(await fetchWithAuth('/users/orders', accessToken));
      } else if (tab === 'rides' && rides.length === 0) {
        setRides(await fetchWithAuth('/users/rides', accessToken));
      } else if (tab === 'deliveries' && deliveries.length === 0) {
        setDeliveries(await fetchWithAuth('/users/deliveries', accessToken));
      }
    } finally {
      setIsTabLoading(false);
    }
  }, [orders.length, rides.length, deliveries.length, fetchWithAuth]);

  // -- Initialization --
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/sign-in'); return; }
      
      const accessToken = session.access_token;
      setToken(accessToken);
      
      const [prof, addr] = await Promise.all([
        fetchWithAuth('/users/profile', accessToken),
        fetchWithAuth('/users/addresses', accessToken)
      ]);
      
      if (prof) setProfile(prof);
      if (addr) setAddresses(addr);
      
      // Default to loading orders
      await fetchTabData('orders', accessToken);
      setIsPageLoading(false);
    };
    init();
  }, [supabase, router, fetchWithAuth, fetchTabData]);

  useEffect(() => {
    if (token) fetchTabData(activeTab, token);
  }, [activeTab, token, fetchTabData]);

  // -- Action Handlers --
  const handleUpdateProfile = async (data: { name: string; phone: string }) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      setProfile((prev: any) => ({ ...prev, ...data }));
      toast.success("Profile updated");
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!token) return;
    const isDark = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: 'Delete Address?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      background: isDark ? '#1a1a1a' : '#fff',
      color: isDark ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      setAddresses(prev => prev.filter(a => a.id !== id));
      try {
        await fetch(`${API_URL}/users/addresses/${id}`, { 
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        toast.error('Delete failed');
        const refreshed = await fetchWithAuth('/users/addresses', token);
        setAddresses(refreshed);
      }
    }
  };

  if (isPageLoading) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24">
      <ProfileHeader 
        profile={profile} 
        greeting={getGreeting()} 
        defaultAddr={defaultAddr} 
        orderCount={orders.length} 
        onEditProfile={() => setIsEditProfileOpen(true)}
        onLogout={() => supabase.auth.signOut().then(() => router.push('/sign-in'))}
      />

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-4xl mx-auto px-4 py-8 min-h-[400px]">
        {isTabLoading ? <ContentSkeleton /> : (
           <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* ORDERS TAB */}
             {activeTab === 'orders' && (
               <div className="space-y-4">
                 {orders.length === 0 ? (
                   <EmptyState icon={ShoppingBag} title="No orders yet" desc="Looks like you haven't ordered anything yet." actionLabel="Start Shopping" actionLink="/" />
                 ) : (
                   orders.map((order) => (
                     <Link href={`/orders/${order.id}`} key={order.id} className="block hover:scale-[1.01] transition-transform">
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

             {/* RIDES TAB */}
             {activeTab === 'rides' && (
               <div className="space-y-4">
                 {rides.length === 0 ? (
                   <EmptyState icon={Car} title="No rides yet" desc="Need a ride? Book one now." actionLabel="Book a Ride" actionLink="/rides" />
                 ) : (
                   rides.map((ride) => <RideCard key={ride.id} {...ride} />)
                 )}
               </div>
             )}

             {/* DELIVERIES TAB */}
             {activeTab === 'deliveries' && (
               <div className="space-y-4">
                 {deliveries.length === 0 ? (
                   <EmptyState icon={Package} title="No deliveries yet" desc="Send packages securely across the city." actionLabel="Send Package" actionLink="/courier" />
                 ) : (
                   deliveries.map((delivery) => <DeliveryCard key={delivery.id} {...delivery} />)
                 )}
               </div>
             )}

             {/* ADDRESSES TAB */}
             {activeTab === 'addresses' && (
               <div className="space-y-6">
                 <button onClick={() => setIsAddressModalOpen(true)} className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-400 font-bold hover:border-yellow-500 hover:text-yellow-500 hover:bg-yellow-50 transition-all">
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

             {/* SETTINGS TAB */}
             {activeTab === 'settings' && (
               <div className="max-w-xl mx-auto space-y-6">
                 <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                   <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 font-bold flex items-center gap-2">
                     <User className="w-4 h-4"/> Personal Info
                   </div>
                   <div className="p-2">
                      <button onClick={() => setIsEditProfileOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-left font-medium text-sm">
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
                     <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full"><Trash2 className="w-6 h-6" /></div>
                     <div>
                       <h4 className="font-bold text-red-600">Delete Account</h4>
                       <p className="text-sm text-gray-500 mt-1 mb-4">Irreversible action.</p>
                       <button className="px-4 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-lg hover:bg-red-100">Request Deletion</button>
                     </div>
                   </div>
                 </div>
               </div>
             )}

           </div>
        )}
      </main>

      <BottomNav />
      <AddAddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} onSave={(data) => { /* call fetchAddresses after */ }} />
      <EditProfileModal isOpen={isEditProfileOpen} initialData={{ name: profile.name, phone: profile.phone }} onClose={() => setIsEditProfileOpen(false)} onSave={handleUpdateProfile} />
    </div>
  );
}