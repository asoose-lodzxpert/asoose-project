'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, MapPin, ChevronDown, Moon, Sun, Car, Package, Utensils, User, Bell, ShoppingBag } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSession } from "next-auth/react"; // ✅ NextAuth Import

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 100);
};

export const HomeHeader = () => {
  const { data: session } = useSession(); // ✅ Get NextAuth Session
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState<{ label: string; details: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Logic for Search visibility (Only on main store page)
  const isStorePage = pathname === '/main/store';

  // Logic for Address visibility (Store page AND Store detail pages)
  const isStoreSection = pathname.startsWith('/main/store');

  // NEW: Logic for Branding visibility (Ride, Delivery, Cart, Order, Checkout, Notifications)
  const showBranding = [
    '/main/ride', 
    '/main/delivery', 
    '/main/cart', 
    '/main/orders', 
    '/main/checkout',
    '/main/notifications' // Added this route
  ].some(path => pathname.startsWith(path));

  const isActive = (path: string) => pathname.startsWith(path);

  useEffect(() => {
    setMounted(true);
    
    const q = searchParams.get('q');
    if (q) {
      setSearchTerm(sanitizeInput(q));
    } else {
      setSearchTerm('');
    }

    const fetchAddressAndNotifications = async () => {
      try {
        // ✅ Check for session via NextAuth hook
        // Ensure your authOptions callbacks expose the accessToken
        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
        
        if (!session || !token) {
          setDeliveryAddress({ label: 'Guest', details: 'Login to set address' });
          return;
        }

        const [addressRes, notifRes] = await Promise.all([
          fetch(`${API_URL}/users/addresses`, {
            headers: { Authorization: `Bearer ${token}` } // ✅ Use NextAuth Token
          }),
          fetch(`${API_URL}/notifications`, {
            headers: { Authorization: `Bearer ${token}` } // ✅ Use NextAuth Token
          })
        ]);

        if (addressRes.ok) {
          const addresses = await addressRes.json();
          if (addresses && addresses.length > 0) {
            const active = addresses.find((a: any) => a.isDefault) || addresses[0];
            setDeliveryAddress({
              label: active.label || 'Home',
              details: `${active.street}, ${active.city}`
            });
          } else {
            setDeliveryAddress(null);
          }
        }

        if (notifRes.ok) {
          const response = await notifRes.json();
          // ✅ FIX: Handle both Array (legacy) and Object (paginated) responses safely
          const notificationsList = Array.isArray(response) ? response : (response.data || []);
          
          const unread = notificationsList.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Header data load failed:", error);
      }
    };

    fetchAddressAndNotifications();
  }, [searchParams, session]); // ✅ Depend on session

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeInput(searchTerm);
    if (sanitized) {
      router.push(`/main/store?q=${encodeURIComponent(sanitized)}`);
    } else {
      router.push('/main/store');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(sanitizeInput(e.target.value));
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        
        {/* LEFT: Branding OR Address */}
        <div className="flex items-center gap-6">
          
          {/* 1. Branding (Visible on Ride, Delivery, Cart, Order, Checkout, Notifications) */}
          {showBranding && (
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 relative transition-transform group-hover:scale-105">
                <Image 
                  src="/logo.png" 
                  alt="Asoose Logo"
                  width={36}
                  height={36}
                  className="object-cover"
                  priority
                />
              </div>
              <span className="text-lg font-black tracking-tight hidden sm:block text-zinc-900 dark:text-white">
                Asoose 
              </span>
            </Link>
          )}

          {/* 2. Address (Visible only in Store Section) */}
          {isStoreSection && (
            <Link href="/main/profile" 
              className="flex items-center gap-3 group min-w-fit hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Change delivery address"
            >
              <div className={`p-2 rounded-full transition-colors ${isActive('/main/profile') ? 'bg-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-yellow-500/10 group-hover:bg-yellow-500/20'}`}>
                <MapPin className={`w-5 h-5 ${isActive('/main/profile') ? 'text-white' : 'text-yellow-500'}`} aria-hidden="true" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">
                  Deliver to
                </div>
                <div className="flex items-center gap-1 font-bold text-sm leading-none whitespace-nowrap max-w-[150px] sm:max-w-[200px] truncate dark:text-white">
                  {deliveryAddress ? (
                     <>{deliveryAddress.label} - {deliveryAddress.details}</>
                  ) : (
                     <span>Set Location</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* CENTER: Search Bar (Desktop) */}
        <div className="hidden md:block flex-1 max-w-md mx-auto">
          {isStorePage && (
            <form onSubmit={handleSearch} className="relative group animate-in fade-in zoom-in-95 duration-200" role="search">
              <Search 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-yellow-500 transition-colors pointer-events-none" 
                aria-hidden="true"
              />
              <input
                id="desktop-search"
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search stores or items..."
                className="w-full bg-gray-100 dark:bg-white/5 h-11 rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 dark:text-white"
                maxLength={100}
              />
            </form>
          )}
        </div>

        {/* RIGHT: Navigation & Actions */}
        <div className="flex items-center gap-4">
          <nav className="hidden lg:flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl mr-2">
            <Link href="/main/store" className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isActive('/main/store') ? 'bg-white dark:bg-zinc-800 text-yellow-500 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <Utensils className="w-3.5 h-3.5" /> Food
            </Link>
            <Link href="/main/ride" className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isActive('/main/ride') ? 'bg-white dark:bg-zinc-800 text-yellow-500 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <Car className="w-3.5 h-3.5" /> Ride
            </Link>
            <Link href="/main/delivery" className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isActive('/main/delivery') ? 'bg-white dark:bg-zinc-800 text-yellow-500 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <Package className="w-3.5 h-3.5" /> Send
            </Link>
            
            <Link href="/main/checkout" className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isActive('/main/checkout') ? 'bg-white dark:bg-zinc-800 text-yellow-500 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              <ShoppingBag className="w-3.5 h-3.5" /> Cart
            </Link>
          </nav>

          <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}

            <Link 
              href="/main/notifications" 
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 relative ${isActive('/main/notifications') ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`}
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 border-2 border-white dark:border-[#0a0a0a] rounded-full" />
              )}
            </Link>

            {/* Profile Icon - Only visible on Desktop (hidden md:block) */}
            <Link 
              href="/main/profile" 
              className={`hidden md:block p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isActive('/main/profile') ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`}
              aria-label="View profile"
            >
              <User className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      {isStorePage && (
        <div className="md:hidden px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSearch} className="relative group" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="mobile-search"
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="What are you looking for?"
              className="w-full bg-gray-100 dark:bg-white/5 h-10 rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all dark:text-white"
              maxLength={100}
            />
          </form>
        </div>
      )}
    </header>
  );
};