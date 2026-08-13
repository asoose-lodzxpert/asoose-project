"use client";

import React, {
  useState,
  useEffect,
  useCallback,
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
  BedDouble,
  CalendarDays,
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
import { EmptyState } from "@/app/main/components/profile/EmptyState";
import { WalletTab } from "@/app/main/components/profile/WalletTab";
import {
  ProfileSkeleton,
  ContentSkeleton,
} from "@/app/main/components/profile/skeleton";
import { ApiService } from "@/services/api.service";
import type { Booking } from "@/services/property.service";
import { AddressService, type CreateAddressInput, type SavedAddress } from "@/services/address.service";

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
    "bookings",
    "rides",
    "deliveries",
    "wallet",
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  // Use ref to track current tab for race condition prevention
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

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
            data = await fetchWithAuth(
              "/orders?page=1&limit=20",
              accessToken,
            );
            if (activeTabRef.current === "orders") {
              setOrders(data?.orders || []);
            }
            break;
          case "bookings":
            data = await fetchWithAuth("/bookings?page=1&limit=20", accessToken);
            if (activeTabRef.current === "bookings") setBookings(data?.bookings || []);
            break;
          case "rides":
            data = await fetchWithAuth("/rides?page=1&limit=20", accessToken);
            if (activeTabRef.current === "rides") setRides(data?.rides || []);
            break;
          case "deliveries":
            // "Deliveries" here means parcels the customer has sent — the
            // backend's separate /deliveries module is for order-delivery
            // tracking, not for listing a customer's own delivery history.
            data = await fetchWithAuth("/parcels?page=1&limit=20", accessToken);
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
          AddressService.list(accessToken),
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
    if (
      token &&
      activeTab !== "addresses" &&
      activeTab !== "settings" &&
      activeTab !== "wallet"
    ) {
      fetchTabData(activeTab, token);
    }
  }, [activeTab, token, fetchTabData]);

  const handleUpdateProfile = async (data: {
    firstName: string;
    lastName: string;
    phone: string;
  }) => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }

    try {
      const updatedProfile = await fetchWithAuth("/users/me/profile", token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone.trim(),
          avatar: profile?.avatar || undefined,
          cityId: profile?.cityId || undefined,
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

  const handleAddAddress = async (addressData: CreateAddressInput) => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      throw new Error("Session expired");
    }

    try {
      await AddressService.create(addressData, token);
      const updatedAddresses = await AddressService.list(token);
      setAddresses(updatedAddresses || []);
      setIsAddressModalOpen(false);
      toast.success("Address added successfully");
    } catch (error: any) {
      console.error("Add address error:", error);
      toast.error(error.message || "Failed to add address");
      throw error;
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
        await AddressService.delete(id, token);

        setAddresses((prev) => prev.filter((a) => a.id !== id));
        toast.success("Address deleted successfully");
      } catch (err: any) {
        console.error("Delete error:", err);
        toast.error(err.message || "Failed to delete address");

        // Refresh addresses on error
        try {
          const refreshed = await AddressService.list(token);
          setAddresses(refreshed || []);
        } catch (refreshErr) {
          console.error("Failed to refresh addresses:", refreshErr);
        }
      }
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!token) return;
    try {
      const updated = await AddressService.setDefault(id, token);
      setAddresses((current) => current.map((address) => ({
        ...address,
        isDefault: address.id === updated.id,
      })));
      toast.success("Default address updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update default address");
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
    <div className="min-h-screen bg-[#f7f7f5] pb-28 text-gray-900 dark:bg-[#0a0a0a] dark:text-gray-100 sm:pb-24">
      <ProfileHeader
        profile={profile}
        greeting={getGreeting()}
        onEditProfile={() => setIsEditProfileOpen(true)}
        onLogout={() => signOut({ callbackUrl: "/sign-in" })}
      />

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto min-h-[400px] max-w-5xl px-4 py-6 sm:py-8">
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
                        id={order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                        status={order.status}
                        date={new Date(order.createdAt).toLocaleDateString()}
                        total={`₦${Number(order.total).toLocaleString()}`}
                        items={order.items?.map(
                          (i: any) => `${i.quantity}x ${i.name}`,
                        )}
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
                  rides.map((ride) => (
                    <Link
                      key={ride.id}
                      href={`/main/ride/history/${ride.id}`}
                      className="block"
                    >
                      <RideCard
                        id={ride.id}
                        trackingId={ride.trackingId}
                        status={ride.status}
                        date={new Date(ride.createdAt).toLocaleDateString()}
                        total={ride.fare ?? 0}
                        description={`${ride.pickupAddress?.address || ride.pickupAddress?.street || "Pickup"} → ${ride.dropoffAddress?.address || ride.dropoffAddress?.street || "Dropoff"}`}
                        isScheduled={ride.isScheduled}
                        scheduledAt={ride.scheduledAt}
                      />
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <EmptyState icon={BedDouble} title="No accommodation booked" desc="Find hotels, apartments and shortlets in your city." actionLabel="Explore Accommodation" actionLink="/main/stays" />
                ) : bookings.map((booking) => (
                  <Link href={`/main/bookings/${booking.id}`} key={booking.id} className="flex items-center gap-4 rounded-3xl border border-black/[0.06] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 dark:border-white/[0.07] dark:bg-[#151515] sm:p-5">
                    <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"><BedDouble className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-black">{booking.propertyName}</h3><span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:bg-white/5">{booking.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-gray-500">{booking.roomTypeName}</p><p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-gray-400"><CalendarDays className="h-3.5 w-3.5" />{new Date(booking.checkIn).toLocaleDateString()} – {new Date(booking.checkOut).toLocaleDateString()}</p></div>
                    <div className="text-right"><p className="text-sm font-black">₦{Number(booking.total).toLocaleString()}</p><ChevronRight className="ml-auto mt-2 h-4 w-4 text-gray-300" /></div>
                  </Link>
                ))}
              </div>
            )}

            {activeTab === "deliveries" && (
              <div className="space-y-4">
                {deliveries.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No deliveries yet"
                    desc="Send items securely across the city."
                    actionLabel="Send a Delivery"
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
                      description={delivery.description || `${delivery.size?.toLowerCase() || "Standard"} delivery`}
                      recipient={delivery.recipientName}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "wallet" && token && <WalletTab token={token} />}

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
              <div className="space-y-5 sm:space-y-6">
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 px-4 py-5 text-sm font-bold text-gray-500 transition-all hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 sm:rounded-3xl sm:py-6 dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-400 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-500"
                >
                  <MapPin className="h-5 w-5" />
                  <span>Add New Address</span>
                </button>
                {addresses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No addresses saved yet
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                    {addresses.map((addr) => (
                      <AddressCard
                        key={addr.id}
                        {...addr}
                        onDelete={handleDeleteAddress}
                        onSetDefault={handleSetDefaultAddress}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
                <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm sm:rounded-3xl dark:border-white/[0.07] dark:bg-[#151515]">
                  <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 p-4 font-bold dark:border-white/5 dark:bg-white/5">
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

                <div className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm sm:rounded-3xl dark:border-red-900/20 dark:bg-[#151515]">
                  <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 p-4 font-bold dark:border-white/5 dark:bg-white/5">
                    <ShieldCheck className="w-4 h-4" /> Security
                  </div>
                  <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
                    <div className="shrink-0 rounded-xl bg-red-100 p-2.5 text-red-600 sm:rounded-full sm:p-3 dark:bg-red-900/20">
                      <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-600">Delete Account</h4>
                      <p className="text-sm text-gray-500 mt-1 mb-4">
                        This action is irreversible. All data will be
                        permanently deleted.
                      </p>
                      <button
                        onClick={handleDeleteAccount}
                        className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
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

      <AddAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleAddAddress}
      />

      <EditProfileModal
        isOpen={isEditProfileOpen}
        initialData={{
          firstName: profile?.firstName || "",
          lastName: profile?.lastName || "",
          phone: profile?.phone || "",
        }}
        onClose={() => setIsEditProfileOpen(false)}
        onSave={handleUpdateProfile}
      />
    </div>
  );
}
