'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, ChevronDown, Moon, Sun, Car, Package, Utensils } from 'lucide-react';
import { useTheme } from 'next-themes';
import { createClient } from '../../../utils/supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Sanitize search input to prevent XSS
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 100);
};

export const HomeHeader = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState<{ label: string; details: string } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    
    // 1. Sync local search state with URL param
    const q = searchParams.get('q');
    if (q) {
      setSearchTerm(sanitizeInput(q));
    } else {
      setSearchTerm('');
    }

    // 2. Fetch User Address
    const fetchAddress = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setDeliveryAddress({ label: 'Guest', details: 'Login to set address' });
          return;
        }

        const res = await fetch(`${API_URL}/users/addresses`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (res.ok) {
          const addresses = await res.json();
          if (addresses && addresses.length > 0) {
            // Prefer default, otherwise first
            const active = addresses.find((a: any) => a.isDefault) || addresses[0];
            setDeliveryAddress({
              label: active.label || 'Home',
              details: `${active.street}, ${active.city}`
            });
          } else {
            setDeliveryAddress(null); // Will show "Set Location"
          }
        }
      } catch (error) {
        console.error("Failed to load address:", error);
      }
    };

    fetchAddress();

  }, [searchParams]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeInput(searchTerm);
    
    if (sanitized) {
      router.push(`/store?q=${encodeURIComponent(sanitized)}`);
    } else {
      router.push('/store');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeInput(e.target.value);
    setSearchTerm(value);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        
        {/* LEFT: Logo & Address */}
        <div className="flex items-center gap-6">
          <Link href="/profile" 
            className="flex items-center gap-3 group min-w-fit hover:bg-gray-50 dark:hover:bg-white/5 p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="Change delivery address"
          >
            <div className="p-2 bg-yellow-500/10 rounded-full group-hover:bg-yellow-500/20 transition-colors">
              <MapPin className="w-5 h-5 text-yellow-500 fill-yellow-500/20" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                Deliver to
              </div>
              <div className="flex items-center gap-1 font-bold text-sm leading-none whitespace-nowrap max-w-[150px] sm:max-w-[200px] truncate">
                {deliveryAddress ? (
                   <>
                     {deliveryAddress.label} - {deliveryAddress.details}
                   </>
                ) : (
                   <span>Set Location</span>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
              </div>
            </div>
          </Link>
        </div>

        {/* CENTER: Search Bar */}
        <div className="hidden md:block flex-1 max-w-md mx-auto">
          <form onSubmit={handleSearch} className="relative group" role="search">
            <label htmlFor="desktop-search" className="sr-only">
              Search restaurants, items, or services
            </label>
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-yellow-500 transition-colors pointer-events-none" 
              aria-hidden="true"
            />
            <input
              id="desktop-search"
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search restaurants, items, or services..."
              className="w-full bg-gray-100 dark:bg-white/5 h-11 rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
              maxLength={100}
            />
          </form>
        </div>

        {/* RIGHT: Navigation */}
        <div className="flex items-center gap-4">
          {/* Service Tabs */}
          <nav 
            className="hidden lg:flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl mr-2"
            aria-label="Service navigation"
          >
            <Link 
              href="/store" 
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Browse food delivery"
            >
              <Utensils className="w-3.5 h-3.5" aria-hidden="true" /> Food
            </Link>
            <Link 
              href="/ride" 
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Request a ride"
            >
              <Car className="w-3.5 h-3.5" aria-hidden="true" /> Ride
            </Link>
            <Link 
              href="/logistics" 
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Send a package"
            >
              <Package className="w-3.5 h-3.5" aria-hidden="true" /> Send
            </Link>
          </nav>

          {/* Main Navigation Links */}
          <nav 
            className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-600 dark:text-gray-300"
            aria-label="Main navigation"
          >
            <Link 
              href="/orders" 
              className="hover:text-yellow-500 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded px-2 py-1"
            >
              Orders
            </Link>
            <Link 
              href="/wallet" 
              className="hover:text-yellow-500 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded px-2 py-1"
            >
              Wallet
            </Link>
          </nav>

          {/* Divider */}
          <div className="hidden md:block h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true"></div>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Moon className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          )}

          {/* Profile Avatar */}
          <Link 
            href="/profile" 
            className="w-9 h-9 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden border border-gray-200 dark:border-white/5 hover:border-yellow-500 transition-colors cursor-pointer relative focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="View profile"
          >
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
              JD
            </div>
          </Link>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="relative group" role="search">
          <label htmlFor="mobile-search" className="sr-only">
            Search for food, items, or services
          </label>
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" 
            aria-hidden="true"
          />
          <input
            id="mobile-search"
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="What are you looking for?"
            className="w-full bg-gray-100 dark:bg-white/5 h-10 rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
            maxLength={100}
          />
        </form>
      </div>
    </header>
  );
};