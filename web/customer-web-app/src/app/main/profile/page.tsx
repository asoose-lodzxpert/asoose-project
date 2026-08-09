"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Link from "next/link";
import {
  ShoppingBag,
  Car,
  Package,
  MapPin,
  User,
  ChevronRight,
  Trash2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";

import { ProfileHeader } from "@/app/main/components/profile/ProfileHeader";
import {
  ProfileTabs,
  ProfileTab,
} from "@/app/main/components/profile/ProfileTabs";
import { AddressCard } from "@/app/main/components/profile/AddressCard";
import { AddAddressModal } from "@/app/main/components/profile/AddAddressModal";
import { EditProfileModal } from "@/app/main/components/profile/EditProfileModal";
import { OrderCard } from "@/app/main/components/profile/OrderCard";
import { RideCard } from "@/app/main/components/profile/ridecard";
import { DeliveryCard } from "@/app/main/components/profile/deliverycard";
import { DisputeCard } from "@/app/main/components/profile/DisputeCard";
import BottomNav from "@/app/main/components/layout/BottomNav";
import { EmptyState } from "@/app/main/components/profile/EmptyState";
import { LinkedAccountsSection } from "@/app/main/components/profile/LinkedAccountsSection";
import {
  ProfileSkeleton,
  ContentSkeleton,
} from "@/app/main/components/profile/skeleton";
import { ApiService } from "@/services/api.service";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export default function ProfilePage() {
  return (
    <React.Suspense fallback={null}>
      <ProfilePageContent />
    </React.Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const VALID_TABS: ProfileTab[] = [
    "orders",
    "rides",
    "deliveries",
    "disputes",
    "addresses",
    "settings",
  ];
  const tabFromUrl = searchParams.get("tab") as ProfileTab | null;
  const initialTab: ProfileTab =
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "orders";

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState<ProfileTab>(initialTab);

  const setActiveTab = React.useCallback(
    (tab: ProfileTab) => {
      setActiveTabState(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const [profile, setProfile] = useState<any>(null); // Changed from {} to null
  const [orders, setOrders] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  // Use ref to track current tab for race condition prevention
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const defaultAddr = useMemo(
    () => addresses.find((a: any) => a.isDefault) || addresses[0] || null,
    [addresses],
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12
      ? "Good Morning"
      : hour < 18
        ? "Good Afternoon"
        : "Good Evening";
  };

  // Enhanced fetch with 401 handling — delegates to ApiService (centralised timeout, error normalisation, 401 redirect)
  const fetchWithAuth = useCallback(
    async (path: string, accessToken: string, options: RequestInit = {}) => {
      try {
        const method = (options.method || "GET").toUpperCase();
        const data = options.body
          ? JSON.parse(options.body as string)
          : undefined;
        switch (method) {
          case "POST":
            return await ApiService.post<any>(path, data, accessToken);
          case "PATCH":
            return await ApiService.patch<any>(path, data, accessToken);
          case "PUT":
            return await ApiService.put<any>(path, data, accessToken);
          case "DELETE":
            return await ApiService.delete<any>(path, accessToken);
          default:
            return await ApiService.get<any>(path, accessToken);
        }
      } catch (e: any) {
        console.error(`Fetch error for ${path}`, e?.message ?? e);
        // ApiService already redirects on 401; suppress toast for session errors
        const isSessionError = e?.status === 401 || e?.type === "unauthorized";
        if (!isSessionError) {
          const resource = path.split("/").pop();
          toast.error(e?.message || `Failed to load ${resource}`);
        }
        throw e;
      }
    },
    [],
  );

  const fetchTabData = useCallback(
    async (tab: ProfileTab, accessToken: string) => {
      setIsTabLoading(true);

      try {
        let data;
        switch (tab) {
          case "orders":
            data = await fetchWithAuth("/orders", accessToken);
            if (activeTabRef.current === "orders") {
              setOrders(data?.orders || []);
            }
            break;
          case "rides":
            data = await fetchWithAuth("/rides", accessToken);
            if (activeTabRef.current === "rides") setRides(data?.rides || []);
            break;
          case "deliveries":
            // "Deliveries" here means parcels the customer has sent — the
            // backend's separate /deliveries module is for order-delivery
            // tracking, not for listing a customer's own send-a-package history.
            data = await fetchWithAuth("/parcels", accessToken);
            if (activeTabRef.current === "deliveries")
              setDeliveries(data?.parcels || []);
            break;
          case "disputes":
            // TODO: no confirmed customer-facing "my disputes" endpoint yet —
            // leaving this tab pointed at its old (wrong) path rather than
            // guessing one, so it fails visibly instead of silently.
            data = await fetchWithAuth(
              "/super-admin/disputes/mine",
              accessToken,
            );
            if (activeTabRef.current === "disputes")
              setDisputes(data?.data || []);
            break;
        }
      } catch (e) {
        console.error("Tab load error", e);
      } finally {
        // Only clear loading if still on same tab
        if (activeTabRef.current === tab) {
          setIsTabLoading(false);
        }
      }
    },
    [fetchWithAuth],
  );

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/sign-in");
      return;
    }

    if (session?.user?.role === "SUPER_ADMIN") {
      router.push("/super-admin/dashboard");
      return;
    }

    const init = async () => {
      try {
        const accessToken = session?.accessToken;

        if (!accessToken) {
          console.error(
            "Session exists but no Access Token found. Forcing logout.",
          );
          await signOut({ callbackUrl: "/sign-in" });
          return;
        }

        setToken(accessToken);

        const [prof, addr] = await Promise.all([
          fetchWithAuth("/users/me", accessToken),
          fetchWithAuth("/addresses", accessToken),
        ]);

        // Handle profile data properly
        if (prof) {
          if (Array.isArray(prof)) {
            console.warn("Profile returned as array, expected object");
            setProfile(prof.length > 0 ? prof[0] : null);
          } else {
            setProfile(prof);
          }
        }

        if (addr && Array.isArray(addr)) {
          setAddresses(addr);
        }

        await fetchTabData("orders", accessToken);
      } catch (err) {
        console.error("Profile init failed", err);
        // Don't show error if it's session expiry (already handled)
        if ((err as Error).message !== "Session expired") {
          toast.error("Failed to load profile data");
        }
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
    if (token && activeTab !== "addresses" && activeTab !== "settings") {
      fetchTabData(activeTab, token);
    }
  }, [activeTab, token, fetchTabData]);

  const handleUpdateProfile = async (data: { name: string; phone: string }) => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    try {
      const parts = data.name.trim().split(/\s+/);
      const updatedProfile = await fetchWithAuth("/users/me/profile", token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: parts[0] ?? "",
          lastName: parts.slice(1).join(" ") || parts[0] || "",
          phone: data.phone,
        }),
      });

      setProfile((prev: any) => ({ ...prev, ...updatedProfile }));
      toast.success("Profile updated successfully");
      setIsEditProfileOpen(false);
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast.error(err.message || "Failed to update profile");
    }
  };

  const handleAddAddress = async (addressData: any) => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    // AddAddressModal collects { street, isDefault, lat, lng } — backend
    // requires latitude/longitude.
    const { lat, lng, ...rest } = addressData;
    addressData = { ...rest, latitude: lat, longitude: lng };

    try {
      await fetchWithAuth("/addresses", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressData),
      });

      const updatedAddresses = await fetchWithAuth("/addresses", token);
      setAddresses(updatedAddresses || []);
      setIsAddressModalOpen(false);
      toast.success("Address added successfully");
    } catch (error: any) {
      console.error("Add address error:", error);
      toast.error(error.message || "Failed to add address");
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    const isDark = document.documentElement.classList.contains("dark");
    const result = await Swal.fire({
      title: "Delete Account?",
      text: "This action cannot be undone. All your data will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete my account",
      cancelButtonText: "Cancel",
      background: isDark ? "#1a1a1a" : "#fff",
      color: isDark ? "#fff" : "#000",
    });

    if (result.isConfirmed) {
      try {
        await fetchWithAuth("/users/me", token, {
          method: "DELETE",
        });

        await Swal.fire({
          title: "Account Deleted",
          text: "Your account has been successfully deleted.",
          icon: "success",
          background: isDark ? "#1a1a1a" : "#fff",
          color: isDark ? "#fff" : "#000",
        });

        await signOut({ callbackUrl: "/" });
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Failed to delete account");
      }
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    const isDark = document.documentElement.classList.contains("dark");
    const result = await Swal.fire({
      title: "Delete Address?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      background: isDark ? "#1a1a1a" : "#fff",
      color: isDark ? "#fff" : "#000",
    });

    if (result.isConfirmed) {
      try {
        await fetchWithAuth(`/addresses/${id}`, token, {
          method: "DELETE",
        });

        setAddresses((prev) => prev.filter((a) => a.id !== id));
        toast.success("Address deleted successfully");
      } catch (err: any) {
        console.error("Delete error:", err);
        toast.error(err.message || "Failed to delete address");

        // Refresh addresses on error
        try {
          const refreshed = await fetchWithAuth("/addresses", token);
          setAddresses(refreshed || []);
        } catch (refreshErr) {
          console.error("Failed to refresh addresses:", refreshErr);
        }
      }
    }
  };

  if (status === "loading" || isPageLoading) return <ProfileSkeleton />;

  // Handle null profile
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Failed to load profile</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24">
      <ProfileHeader
        profile={profile}
        greeting={getGreeting()}
        defaultAddr={defaultAddr}
        orderCount={orders.length}
        onEditProfile={() => setIsEditProfileOpen(true)}
        onLogout={() => signOut({ callbackUrl: "/sign-in" })}
      />

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-4xl mx-auto px-4 py-8 min-h-[400px]">
        {isTabLoading ? (
          <ContentSkeleton />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === "orders" && (
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
                        type={order.type ?? "ORDER"}
                        status={order.status}
                        date={new Date(order.createdAt).toLocaleDateString()}
                        total={`₦${Number(order.total).toLocaleString()}`}
                        items={order.items?.map(
                          (i: any) => `${i.quantity}x ${i.name}`,
                        )}
                        stores={order.stores}
                        orderCount={order.orderCount}
                      />
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === "rides" && (
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

            {activeTab === "deliveries" && (
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
                  deliveries.map((delivery) => (
                    <DeliveryCard
                      key={delivery.id}
                      id={delivery.id}
                      status={delivery.status}
                      date={new Date(delivery.createdAt).toLocaleDateString()}
                      total={delivery.total ?? 0}
                      description={delivery.description}
                      recipient={delivery.recipient}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "disputes" && (
              <div className="space-y-4">
                {disputes.length === 0 ? (
                  <EmptyState
                    icon={ShieldAlert}
                    title="No disputes filed"
                    desc="You haven't opened any disputes yet."
                    actionLabel="Contact Support"
                    actionLink="/main/support"
                  />
                ) : (
                  disputes.map((dispute) => (
                    <DisputeCard
                      key={dispute.id}
                      id={dispute.id}
                      status={dispute.status}
                      priority={dispute.priority}
                      reason={dispute.reason}
                      category={dispute.category}
                      createdAt={dispute.createdAt}
                      hoursOpen={dispute.hoursOpen ?? 0}
                      orderId={dispute.orderId}
                      rideId={dispute.rideId}
                      deliveryId={dispute.deliveryId}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "addresses" && (
              <div className="space-y-6">
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 text-gray-400 font-bold hover:border-yellow-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-all"
                >
                  <MapPin className="w-6 h-6" />
                  <span>Add New Address</span>
                </button>
                {addresses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No addresses saved yet
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <AddressCard
                        key={addr.id}
                        {...addr}
                        onDelete={handleDeleteAddress}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 font-bold flex items-center gap-2">
                    <User className="w-4 h-4" /> Personal Info
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
                    <ShieldCheck className="w-4 h-4" /> Linked Accounts
                  </div>
                  <div className="p-4">
                    <LinkedAccountsSection />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#151515] rounded-3xl border border-gray-100 dark:border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Security
                  </div>
                  <div className="p-6 flex items-start gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-600">Delete Account</h4>
                      <p className="text-sm text-gray-500 mt-1 mb-4">
                        This action is irreversible. All data will be
                        permanently deleted.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 font-bold text-sm rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
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
        initialData={{ name: profile?.name || "", phone: profile?.phone || "" }}
        onClose={() => setIsEditProfileOpen(false)}
        onSave={handleUpdateProfile}
      />
    </div>
  );
}
