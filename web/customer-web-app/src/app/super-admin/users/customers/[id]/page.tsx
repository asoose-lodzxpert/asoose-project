"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { CustomerDetailPageSkeleton } from "./components/skeleton";
import { fetcher } from "@/app/super-admin/hooks/useSuperAdminFetch";
import { CustomerHeader } from "./components/customerHeader";
import { CustomerSidebar } from "./components/customerSidebar";
import { CustomerStats } from "./components/CustomerStats";
import { CustomerContentTabs } from "./components/CustomerContentTabs";
import { AppAlert } from "./alerts";

import { CustomerProfile, Order, Ride } from "./types";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = React.use(params);
  const [activeTab, setActiveTab] = useState<"Orders" | "Rides" | "Logs">(
    "Orders",
  );

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const {
    data: customer,
    error,
    isLoading,
    mutate: mutateProfile,
  } = useSWR<CustomerProfile>(
    customerId ? `/super-admin/customers/${customerId}` : null,
    fetcher,
  );

  const { data: orders, isLoading: ordersLoading } = useSWR<Order[]>(
    customerId && activeTab === "Orders"
      ? `/super-admin/customers/${customerId}/orders`
      : null,
    fetcher,
  );

  const { data: rides, isLoading: ridesLoading } = useSWR<Ride[]>(
    customerId && activeTab === "Rides"
      ? `/super-admin/customers/${customerId}/rides`
      : null,
    fetcher,
  );

  const isTabLoading =
    (activeTab === "Orders" && ordersLoading) ||
    (activeTab === "Rides" && ridesLoading);

  // ===========================================================================
  //  ✅ REFACTORED HANDLERS (Fixes 404 and Port issues)
  // ===========================================================================

  const handleUpdateProfile = async (data: Partial<CustomerProfile>) => {
    try {
      // ✅ FIX: Using standardized fetcher handles URL and Auth automatically
      await fetcher(`/super-admin/customers/${customerId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });

      AppAlert.success("Profile Updated Successfully");
      mutateProfile();
    } catch (error: any) {
      console.error("Update Error:", error);
      AppAlert.error(
        "Update Failed",
        error.message || "Could not update profile",
      );
      throw error;
    }
  };

  const handleToggleStatus = async () => {
    if (!customer) return;
    const isBanning = customer.status !== "BANNED";

    const result = await AppAlert.confirm(
      isBanning ? "Ban Customer?" : "Unban Customer?",
      isBanning
        ? "User will be logged out and restricted immediately."
        : "User access will be restored.",
      isBanning ? "Yes, Ban" : "Yes, Unban",
      isBanning,
    );

    if (result.isConfirmed) {
      try {
        const newStatus = isBanning ? "BANNED" : "ACTIVE";

        // ✅ FIX: fetcher prevents /api/v1/api duplication
        await fetcher(`/super-admin/customers/${customerId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });

        AppAlert.success(isBanning ? "Customer Banned" : "Customer Unbanned");
        mutateProfile();
      } catch (err: any) {
        AppAlert.error(
          "Update Failed",
          err.message || "Could not update user status.",
        );
      }
    }
  };

  const handleSendMessage = async () => {
    const result = await AppAlert.input("Send Message", "Type your message...");
    if (result.isConfirmed && result.value) {
      try {
        await fetcher(`/super-admin/customers/${customerId}/message`, {
          method: "POST",
          body: JSON.stringify({ message: result.value }),
        });
        AppAlert.success("Message Sent!");
      } catch (err: any) {
        AppAlert.error("Error", "Failed to send message");
      }
    }
  };

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isLoading) return <CustomerDetailPageSkeleton />;

  if (error || !customer) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest text-sm">
        Customer data unavailable
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 font-sans">
      <CustomerHeader
        customer={customer}
        onToggleStatus={handleToggleStatus}
        onSendMessage={handleSendMessage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CustomerSidebar customer={customer} onUpdate={handleUpdateProfile} />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <CustomerStats
            stats={
              customer.stats || { totalOrders: 0, totalRides: 0, totalSpent: 0 }
            }
          />

          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl overflow-hidden shadow-xl min-h-[500px]">
            <CustomerContentTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              orders={orders || []}
              rides={rides || []}
              isLoading={isTabLoading}
              customerName={customer.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
