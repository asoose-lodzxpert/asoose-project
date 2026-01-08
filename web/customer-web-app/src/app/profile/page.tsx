'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, Edit2, LogOut, Trash2, 
  ShoppingBag, Car, Package, Settings, User, 
  ChevronRight, Calendar, ShieldCheck, Phone 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddressCard } from '@/components/profile/AddressCard';
import { AddAddressModal } from '@/components/profile/AddAddressModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { OrderCard } from '@/components/profile/OrderCard';
import { RideCard } from '@/components/profile/ridecard';
import { DeliveryCard } from '@/components/profile/deliverycard';

import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Tab = 'orders' | 'rides' | 'deliveries' | 'addresses' | 'settings';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  
  // -- State --
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  
  // Modals
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Data
  const [profile, setProfile] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  // -- Helpers --
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDefaultAddress = () => {
    if (!addresses || addresses.length === 0) return null;
    return addresses.find((a: any) => a.isDefault) || addresses[0];
  };

  // -- Fetchers --
  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setProfile(await res.json());
    } catch (e) { console.error('Profile fetch error', e); }
  }, []);

  const fetchAddresses = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}/users/addresses`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setAddresses(await res.json());
    } catch (e) { console.error('Addresses fetch error', e); }
  }, []);

  const fetchTabData = useCallback(async (tab: Tab, accessToken: string) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    setIsTabLoading(true);
    try {
      if (tab === 'orders' && orders.length === 0) {
        const res = await fetch(`${API_URL}/users/orders`, { headers });
        if (res.ok) setOrders(await res.json());
      } else if (tab === 'rides' && rides.length === 0) {
        const res = await fetch(`${API_URL}/users/rides`, { headers });
        if (res.ok) setRides(await res.json());
      } else if (tab === 'deliveries' && deliveries.length === 0) {
        const res = await fetch(`${API_URL}/users/deliveries`, { headers });
        if (res.ok) setDeliveries(await res.json());
      }
    } catch (error) {
      console.error(`Failed to fetch ${tab}`, error);
    } finally {
      setIsTabLoading(false);
    }
  }, [orders.length, rides.length, deliveries.length]);

  // -- Initialization --
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/sign-in'); return; }
      
      setToken(session.access_token);
      
      // Parallel Fetch for critical data
      await Promise.all([
        fetchProfile(session.access_token),
        fetchAddresses(session.access_token),
        fetchTabData('orders', session.access_token)
      ]);
      
      setIsPageLoading(false);
    };
    init();
  }, []);

  // Switch Tab Data
  useEffect(() => {
    if (token) fetchTabData(activeTab, token);
  }, [activeTab, token]);


  // -- Action Handlers (Update, Delete, etc.) --
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
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleAddAddress = async (addressData: any) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/users/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(addressData),
      });
      if (!res.ok) throw new Error();
      await fetchAddresses(token);
      toast.success("Address added");
    } catch {
      toast.error("Failed to add address");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!token) return;
    const isDark = document.documentElement.classList.contains('dark');
    const result = await Swal.fire({
      title: 'Delete Address?',
      text: "This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: isDark ? '#333' : '#ddd',
      confirmButtonText: 'Delete',
      background: isDark ? '#1a1a1a' : '#fff',
      color: isDark ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      setAddresses(prev => prev.filter(a => a.id !== id)); // Optimistic
      try {
        await fetch(`${API_URL}/users/addresses/${id}`, { 
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        toast.error('Could not delete from server');
        fetchAddresses(token); // Revert
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
  };

  if (isPageLoading) return <ProfileSkeleton />;

  const defaultAddr = getDefaultAddress();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24 font-sans">
      
      {/* 1. Enhanced Header */}
      <div className="bg-white dark:bg-[#151515] border-b border-gray-100 dark:border-white/5 pt-10 pb-8 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            
            {/* Avatar with Status Ring */}
            <div className="relative">
              <div className="w-24 h-24 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white dark:border-[#151515] shadow-xl overflow-hidden">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : profile.name?.charAt(0)}
              </div>
              <button 
                onClick={() => setIsEditProfileOpen(true)}
                className="absolute bottom-0 right-0 p-2 bg-yellow-500 text-black rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1">
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider">
                {getGreeting()}
              </span>
              <h1 className="text-3xl font-black mt-1 mb-2">{profile.name}</h1>
              
              {/* User Details Block */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-y-1 gap-x-4 text-gray-500 dark:text-gray-400 font-medium text-sm">
                <span className="flex items-center gap-1">
                    {profile.email}
                </span>
                
                {profile.phone && (
                   <span className="hidden sm:inline text-gray-300">•</span>
                )}
                
                {profile.phone && (
                   <span className="flex items-center gap-1">
                     <Phone className="w-3 h-3" /> {profile.phone}
                   </span>
                )}
              </div>

              {/* Address Display (New) */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-yellow-500 shrink-0" />
                {defaultAddr ? (
                   <span className="truncate max-w-xs sm:max-w-md">
                     {defaultAddr.street}, {defaultAddr.city} {defaultAddr.state}
                   </span>
                ) : (
                   <span className="italic opacity-60">No address set</span>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex items-center justify-center sm:justify-start gap-6 mt-6 pt-4 border-t border-gray-100 dark:border-white/5 sm:border-0 sm:pt-0">
                <div className="text-center sm:text-left">
                  <span className="block text-xl font-black text-gray-900 dark:text-white">
                    {orders.length || 0}
                  </span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Orders</span>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-white/10" />
                <div className="text-center sm:text-left">
                  <span className="block text-xl font-black text-gray-900 dark:text-white">
                    {new Date(profile.createdAt || Date.now()).getFullYear()}
                  </span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Member Since</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors rounded-xl font-bold text-sm"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sticky Pill Navigation */}
      <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm px-4 pt-4 pb-2 border-b border-gray-200 dark:border-white/5">
        <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide py-2">
          {[
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'rides', label: 'Rides', icon: Car },
            { id: 'deliveries', label: 'Deliveries', icon: Package },
            { id: 'addresses', label: 'Addresses', icon: MapPin },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-bold ${
                activeTab === tab.id 
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10' 
                  : 'bg-white dark:bg-[#151515] text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-[400px]">
        
        {isTabLoading ? (
          <ContentSkeleton />
        ) : (
          <>
            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {orders.length === 0 ? (
                  <EmptyState 
                    icon={ShoppingBag}
                    title="No orders yet" 
                    desc="Looks like you haven't ordered anything yet."
                    actionLabel="Start Shopping"
                    actionLink="/"
                  />
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
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {rides.length === 0 ? (
                  <EmptyState 
                    icon={Car}
                    title="No rides yet" 
                    desc="Need a ride? Book one now."
                    actionLabel="Book a Ride"
                    actionLink="/rides"
                  />
                ) : (
                  rides.map((ride) => (
                    <RideCard
                      key={ride.id}
                      id={ride.id}
                      status={ride.status}
                      date={new Date(ride.createdAt).toLocaleDateString()}
                      total={ride.total}
                      description={ride.description}
                    />
                  ))
                )}
              </div>
            )}

            {/* DELIVERIES TAB */}
            {activeTab === 'deliveries' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {deliveries.length === 0 ? (
                  <EmptyState 
                     icon={Package}
                     title="No deliveries yet" 
                     desc="Send packages securely across the city."
                     actionLabel="Send Package"
                     actionLink="/courier"
                  />
                ) : (
                  deliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      id={delivery.id}
                      status={delivery.status}
                      date={new Date(delivery.createdAt).toLocaleDateString()}
                      total={delivery.total}
                      description={delivery.description}
                      recipient={delivery.recipient}
                    />
                  ))
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setIsAddressModalOpen(true)}
                  className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-400 font-bold hover:border-yellow-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/5 transition-all group"
                >
                  <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-full group-hover:bg-yellow-100 dark:group-hover:bg-yellow-500/20 transition-colors">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <span>Add New Address</span>
                </button>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <AddressCard 
                      key={addr.id}
                      {...addr}
                      tag={addr.label || addr.city} 
                      onDelete={handleDeleteAddress} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    <h3 className="font-bold flex items-center gap-2"><User className="w-4 h-4"/> Personal Info</h3>
                  </div>
                  <div className="p-2">
                     <button onClick={() => setIsEditProfileOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-left">
                       <span className="font-medium text-sm">Edit Profile Details</span>
                       <ChevronRight className="w-4 h-4 text-gray-400" />
                     </button>
                     <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-colors text-left">
                       <span className="font-medium text-sm">Change Password</span>
                       <ChevronRight className="w-4 h-4 text-gray-400" />
                     </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                   <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Security</h3>
                  </div>
                   <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-red-600">Delete Account</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                            Permanently remove your account and all associated data. This action is irreversible.
                          </p>
                          <button className="px-4 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-lg hover:bg-red-100 transition-colors">
                            Request Deletion
                          </button>
                        </div>
                      </div>
                   </div>
                </div>

                 <div className="sm:hidden pt-4">
                     <button 
                      onClick={handleLogout}
                      className="w-full py-4 text-red-500 font-bold bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm"
                    >
                      Sign Out
                    </button>
                 </div>
              </div>
            )}
          </>
        )}
      </main>

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

// -- Helper Components --

const EmptyState = ({ icon: Icon, title, desc, actionLabel, actionLink }: any) => (
  <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#151515] rounded-3xl border border-dashed border-gray-200 dark:border-white/10 text-center px-4">
    <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 text-gray-300">
      <Icon className="w-10 h-10 opacity-50" />
    </div>
    <h3 className="text-lg font-bold mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-xs mb-8">{desc}</p>
    {actionLabel && (
      <Link href={actionLink} className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 transition-transform">
        {actionLabel}
      </Link>
    )}
  </div>
);

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 animate-pulse">
    <div className="h-48 bg-gray-200 dark:bg-white/5 w-full mb-8" />
    <div className="max-w-4xl mx-auto px-4 space-y-8">
       <div className="flex gap-4">
          <div className="w-24 h-24 rounded-full bg-gray-300 dark:bg-white/10" />
          <div className="space-y-2 flex-1 pt-4">
             <div className="h-6 w-48 bg-gray-300 dark:bg-white/10 rounded" />
             <div className="h-4 w-32 bg-gray-200 dark:bg-white/5 rounded" />
          </div>
       </div>
       <div className="flex gap-4 overflow-hidden">
          {[1,2,3,4].map(i => <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-white/5 rounded-full" />)}
       </div>
       <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 w-full bg-gray-200 dark:bg-white/5 rounded-2xl" />)}
       </div>
    </div>
  </div>
);

const ContentSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-24 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5" />
    ))}
  </div>
);