"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Search,
  Users,
  ShoppingCart,
  Car,
  ChevronRight,
  ArrowRight,
  Package,
  Bike,
} from "lucide-react";
import { fetcher } from "../hooks/useSuperAdminFetch";

// --- 1. Define Data Interfaces ---

interface Vendor {
  id: string;
  name: string;
  email: string;
  store?: { name: string };
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Rider {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
}

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  createdAt: string;
  status: string;
}

// Generic wrapper for your paginated API responses
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export default function GlobalSearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const router = useRouter();

  // Local input state with 300ms debounce to URL
  const [inputValue, setInputValue] = useState(q);

  // Sync input when URL changes externally
  useEffect(() => {
    setInputValue(q);
  }, [q]);

  // Debounce: push new URL 300ms after user stops typing
  useEffect(() => {
    if (inputValue === q) return;
    const t = setTimeout(() => {
      router.push(
        inputValue
          ? `/super-admin/search?q=${encodeURIComponent(inputValue)}`
          : "/super-admin/search",
      );
    }, 300);
    return () => clearTimeout(t);
  }, [inputValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- 2. Corrected API Endpoints (Removed '/users' prefix) ---

  // Vendors: Backend mapped to 'super-admin/vendors'
  const { data: vendors, isLoading: loadingVendors } = useSWR<
    PaginatedResponse<Vendor>
  >(q ? `/super-admin/vendors?search=${q}&limit=5` : null, fetcher);

  // Customers: Backend mapped to 'super-admin/customers'
  const { data: customers, isLoading: loadingCustomers } = useSWR<
    PaginatedResponse<Customer>
  >(q ? `/super-admin/customers?search=${q}&limit=5` : null, fetcher);

  // Riders: Backend mapped to 'super-admin/riders'
  const { data: riders, isLoading: loadingRidersList } = useSWR<
    PaginatedResponse<Rider>
  >(q ? `/super-admin/riders?search=${q}&limit=5` : null, fetcher);

  // Orders: Backend mapped to 'super-admin/orders'
  const { data: orders, isLoading: loadingOrders } = useSWR<
    PaginatedResponse<Order>
  >(q ? `/super-admin/orders?search=${q}&limit=5` : null, fetcher);

  // Rides: Backend mapped to 'super-admin/rides'
  const { data: rides, isLoading: loadingRides } = useSWR<
    PaginatedResponse<Ride>
  >(q ? `/super-admin/rides?search=${q}&limit=5` : null, fetcher);

  const isLoading =
    loadingVendors ||
    loadingCustomers ||
    loadingRidersList ||
    loadingOrders ||
    loadingRides;

  // Safe access to check if any results exist
  const hasResults =
    (vendors?.data?.length || 0) +
      (customers?.data?.length || 0) +
      (riders?.data?.length || 0) +
      (orders?.data?.length || 0) +
      (rides?.data?.length || 0) >
    0;

  if (!q) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-500 px-4">
        <Search className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg mb-6">Enter a keyword to search globally.</p>
        <input
          type="text"
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && inputValue.trim()) {
              router.push(
                `/super-admin/search?q=${encodeURIComponent(inputValue.trim())}`,
              );
            }
          }}
          placeholder="Search users, orders, rides…"
          className="w-full max-w-md px-4 py-3 bg-[#1E293B] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors text-sm"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Search Results</h1>
        <p className="text-gray-400">
          Showing results for{" "}
          <span className="text-yellow-500 font-mono">"{q}"</span>
        </p>
        {/* Search input — debounced, supports Enter key */}
        <div className="relative mt-4 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                router.push(
                  `/super-admin/search?q=${encodeURIComponent(inputValue.trim())}`,
                );
              }
            }}
            placeholder="Refine search…"
            className="w-full pl-9 pr-4 py-2.5 bg-[#1E293B] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 bg-[#1E293B] rounded-xl border border-gray-800"
            ></div>
          ))}
        </div>
      ) : !hasResults ? (
        <div className="min-h-[40vh] bg-[#1E293B] border border-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-400">
          <Search className="w-12 h-12 mb-3 opacity-20" />
          <p>No matches found for "{q}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vendors Section */}
          {vendors?.data && vendors.data.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" /> Vendors
                </h3>
                <button
                  onClick={() => router.push("/super-admin/users/vendors")}
                  className="text-xs text-blue-400 hover:text-white flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
                {vendors.data.map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      router.push(`/super-admin/users/vendors/${item.id}`)
                    }
                    className="p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors flex justify-between items-center last:border-0"
                  >
                    <div>
                      <p className="font-bold text-white">
                        {item.store?.name || item.name}
                      </p>
                      <p className="text-xs text-gray-500">{item.email}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Customers Section */}
          {customers?.data && customers.data.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-400" /> Customers
                </h3>
                <button
                  onClick={() => router.push("/super-admin/users/customers")}
                  className="text-xs text-green-400 hover:text-white flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
                {customers.data.map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      router.push(`/super-admin/users/customers/${item.id}`)
                    }
                    className="p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors flex justify-between items-center last:border-0"
                  >
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.email}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Riders Section */}
          {riders?.data && riders.data.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bike className="w-5 h-5 text-orange-400" /> Riders
                </h3>
                <button
                  onClick={() => router.push("/super-admin/users/riders")}
                  className="text-xs text-orange-400 hover:text-white flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
                {riders.data.map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      router.push(`/super-admin/users/riders/${item.id}`)
                    }
                    className="p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors flex justify-between items-center last:border-0"
                  >
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.email} • {item.phone}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Orders Section */}
          {orders?.data && orders.data.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-yellow-400" /> Orders
                </h3>
                <button
                  onClick={() => router.push("/super-admin/orders")}
                  className="text-xs text-yellow-400 hover:text-white flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
                {orders.data.map((item) => (
                  <div
                    key={item.id}
                    onClick={() =>
                      router.push(`/super-admin/orders/${item.id}`)
                    }
                    className="p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors flex justify-between items-center last:border-0"
                  >
                    <div>
                      <p className="font-bold text-white">
                        Order #{item.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        ₦{item.totalAmount?.toLocaleString()} • {item.status}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Rides Section */}
          {rides?.data && rides.data.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Car className="w-5 h-5 text-purple-400" /> Rides
                </h3>
                <button
                  onClick={() => router.push("/super-admin/rides")}
                  className="text-xs text-purple-400 hover:text-white flex items-center gap-1"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden">
                {rides.data.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/super-admin/rides/${item.id}`)}
                    className="p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors flex justify-between items-center last:border-0"
                  >
                    <div>
                      <p className="font-bold text-white">
                        {item.pickupAddress?.split(",")[0]} →{" "}
                        {item.dropoffAddress?.split(",")[0]}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()} •{" "}
                        {item.status}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
