"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  Search,
  MapPin,
  ChevronDown,
  Moon,
  Sun,
  User,
  Bell,
  ShoppingBag,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import { ApiService } from "@/services/api.service";
import { AddressService } from "@/services/address.service";
import { LocationDropdown } from "./LocationDropdown";
import { useRideStore } from "@/app/main/ride/store/ride";
import { useCityStore } from "@/store/useCityStore";
import { DesktopServicesMenu } from "@/app/main/components/layout/ServicesMenu";

const sanitizeInput = (input: string): string => {
  return input.replace(/[<>]/g, "").trim().slice(0, 100);
};

function HomeHeaderInner() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState<{
    label: string;
    details: string;
  } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const userLocation = useRideStore((state) => state.userLocation);
  const selectedCity = useCityStore((state) => state.selectedCity);
  const locationLabel = useCityStore((state) => state.locationLabel);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Logic for Search visibility (Only on main store page)
  const isStorePage = pathname === "/main/store";

  // Logic for Address visibility (Store page AND Store detail pages)
  const isStoreSection = ["/main/store", "/main/stays", "/main/ride", "/main/delivery"].some((path) => pathname.startsWith(path));

  // Logic for Branding visibility
  const showBranding = [
    "/main/store",
    "/main/ride",
    "/main/delivery",
    "/main/orders",
    "/main/profile",
    "/main/checkout",
    "/main/notifications",
    "/main/stays",
    "/main/bookings",
    "/product",
  ].some((path) => pathname.startsWith(path));

  const isActive = (path: string) => pathname.startsWith(path);

  // Stable primitive reference — prevents re-fetching when session object changes
  const accessToken = (session as any)?.accessToken as string | undefined;

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("asoose_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isLocationMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) {
        setIsLocationMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLocationMenuOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isLocationMenuOpen]);

  // Sync search term from URL params
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setSearchTerm(sanitizeInput(q));
    } else {
      setSearchTerm("");
    }
  }, [searchParams]);

  // Fetch address & notifications — depends on accessToken (primitive string),
  // NOT the session object, to avoid infinite re-fetch loops.
  useEffect(() => {
    if (!accessToken) {
      setDeliveryAddress(
        locationLabel
          ? { label: "Current location", details: locationLabel }
          : null,
      );
      return;
    }

    let cancelled = false;

    const fetchAddressAndNotifications = async () => {
      try {
        const [addressResult, notifResult] = await Promise.allSettled([
          AddressService.list(accessToken),
          ApiService.get<{ unreadCount: number }>("/notifications/unread-count", accessToken),
        ]);

        if (cancelled) return;

        if (userLocation && locationLabel) {
          setDeliveryAddress({
            label: "Current location",
            details: locationLabel,
          });
        } else if (addressResult.status === "fulfilled") {
          const addresses = addressResult.value;
          if (addresses && addresses.length > 0) {
            const active = addresses.find((a) => a.isDefault) || addresses[0];
            setDeliveryAddress({
              label: active.label || "Home",
              details:
                [active.street, active.city].filter(Boolean).join(", ") ||
                `${active.latitude.toFixed(4)}, ${active.longitude.toFixed(4)}`,
            });
          } else {
            setDeliveryAddress(null);
          }
        }

        if (notifResult.status === "fulfilled") {
          setUnreadCount(notifResult.value?.unreadCount ?? 0);
        }
      } catch (error) {
        console.error("Header data load failed:", error);
      }
    };

    fetchAddressAndNotifications();

    return () => {
      cancelled = true;
    };
  }, [accessToken, locationLabel, userLocation]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const addRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10); // Keep top 10
      localStorage.setItem("asoose_recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeInput(searchTerm);
    if (sanitized) {
      addRecentSearch(sanitized);
      router.push(`/main/store?q=${encodeURIComponent(sanitized)}`);
    } else {
      router.push("/main/store");
    }
    // Blur the active element to hide keyboard on mobile and hide dropdown
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsSearchFocused(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(sanitizeInput(e.target.value));
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchTerm(term);
    addRecentSearch(term);
    router.push(`/main/store?q=${encodeURIComponent(term)}`);
    setIsSearchFocused(false);
  };

  const RecentSearchesDropdown = () => {
    const suggestions = searchTerm.trim() 
      ? recentSearches.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10)
      : recentSearches.slice(0, 10);

    if (suggestions.length === 0) return null;
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111] border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {searchTerm.trim() ? "Search Suggestions" : "Recent Searches"}
          </div>
          <button 
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setRecentSearches([]);
              localStorage.removeItem("asoose_recent_searches");
            }}
            className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
          >
            Clear
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map(term => (
            <button
              key={term}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // prevent input blur
              onClick={() => handleSelectRecentSearch(term)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-6">
        {/* LEFT: Branding and location */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {/* 1. Branding */}
          {showBranding && (
            <Link
              href="/"
              aria-label="Back to Asoose home"
              title="Back to Asoose home"
              className="group flex shrink-0 items-center gap-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <div className="relative h-9 w-9 transition-transform group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="Asoose Logo"
                  width={36}
                  height={36}
                  className="object-cover"
                  priority
                />
              </div>
              <span className="hidden text-lg font-black tracking-tight text-zinc-900 dark:text-white xl:block">
                Asoose
              </span>
            </Link>
          )}

          {/* 2. Address (Visible only in Store Section) */}
          {isStoreSection && (
            <div ref={locationMenuRef} className="relative">
            <button
              onClick={() => setIsLocationMenuOpen((value) => !value)}
              aria-expanded={isLocationMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 sm:gap-3 group min-w-fit hover:bg-gray-50 dark:hover:bg-white/5 p-1.5 sm:p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Change delivery address"
            >
              {/* Icon - Smaller padding on mobile */}
              <div
                className={`p-1.5 sm:p-2 rounded-full transition-colors ${isActive("/main/profile") ? "bg-yellow-500 shadow-lg shadow-yellow-500/20" : "bg-yellow-500/10 group-hover:bg-yellow-500/20"}`}
              >
                <MapPin
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive("/main/profile") ? "text-white" : "text-yellow-500"}`}
                  aria-hidden="true"
                />
              </div>

              {/* Text Container - NOW VISIBLE ON MOBILE */}
              <div className="text-left">
                {/* Label: Hidden on mobile to save space */}
                <div className="hidden sm:block text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-1">
                  {pathname.startsWith("/main/stays") ? "Explore in" : pathname.startsWith("/main/ride") ? "Ride in" : "Deliver to"}
                </div>

                {/* Address Text: Visible but truncated on mobile */}
                <div className="flex items-center gap-1 font-bold text-sm leading-none dark:text-white">
                  <span className="max-w-[100px] sm:max-w-[200px] truncate block">
                    {deliveryAddress ? (
                      <>
                        {deliveryAddress.details}
                      </>
                    ) : locationLabel ? (
                      <span>{locationLabel}</span>
                    ) : selectedCity ? (
                      <span>{selectedCity.name}, {selectedCity.state}</span>
                    ) : (
                      <span>Set Location</span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 shrink-0 transition-transform ${isLocationMenuOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </button>
            {isLocationMenuOpen && (
              <LocationDropdown
                onClose={() => setIsLocationMenuOpen(false)}
                onSelect={setDeliveryAddress}
              />
            )}
            </div>
          )}
        </div>

        {/* CENTER: Search Bar (Desktop) */}
        <div className="hidden md:block flex-1 max-w-md mx-auto">
          {isStorePage && (
            <form
              onSubmit={handleSearch}
              className="relative group animate-in fade-in zoom-in-95 duration-200"
              role="search"
            >
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-yellow-500 transition-colors pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="desktop-search"
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search stores or items..."
                className="w-full bg-gray-100 dark:bg-white/5 h-11 rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 dark:text-white"
                maxLength={100}
                autoComplete="off"
              />
              {isSearchFocused && <RecentSearchesDropdown />}
            </form>
          )}
        </div>

        {/* RIGHT: Navigation & Actions */}
        <div className="flex items-center gap-4">
          <nav className="hidden lg:flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl mr-2">
            <DesktopServicesMenu />
            <Link
              href="/main/checkout"
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isActive("/main/checkout") ? "bg-white dark:bg-zinc-800 text-yellow-500 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Cart
            </Link>
          </nav>

          <div
            className="hidden md:block h-6 w-px bg-gray-200 dark:bg-white/10"
            aria-hidden="true"
          ></div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            )}

            <Link
              href="/main/notifications"
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 relative ${isActive("/main/notifications") ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"}`}
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
              className={`hidden md:block p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 ${isActive("/main/profile") ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"}`}
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
          <form
            onSubmit={handleSearch}
            className="relative group"
            role="search"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              id="mobile-search"
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="What are you looking for?"
              className="w-full bg-gray-100 dark:bg-white/5 h-10 rounded-xl pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all dark:text-white"
              maxLength={100}
              autoComplete="off"
            />
            {isSearchFocused && <RecentSearchesDropdown />}
          </form>
        </div>
      )}

      </header>
    </>
  );
}

export function HomeHeader() {
  return (
    <Suspense fallback={null}>
      <HomeHeaderInner />
    </Suspense>
  );
}

export default HomeHeader;
