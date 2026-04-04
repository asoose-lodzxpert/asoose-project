import React from "react";
import { Order, Ride, AdminCustomerMessage } from "../types";
import { Mail, User } from "lucide-react";
import { Currency } from "@/app/main/components/Currency";
import { formatDateTime } from "@/utils/formatDate";

interface CustomerContentTabsProps {
  activeTab: "Orders" | "Rides" | "Logs" | "Messages";
  setActiveTab: (tab: "Orders" | "Rides" | "Logs" | "Messages") => void;
  orders: Order[];
  rides: Ride[];
  messages: AdminCustomerMessage[];
  isLoading: boolean;
  customerName: string;
}

// Safe Date Helper

export const CustomerContentTabs: React.FC<CustomerContentTabsProps> = ({
  activeTab,
  setActiveTab,
  orders,
  rides,
  messages,
  isLoading,
  customerName,
}) => {
  return (
    <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden min-h-[500px]">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-800 overflow-x-auto hide-scrollbar">
        {["Orders", "Rides", "Logs", "Messages"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-4 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab
                ? "text-yellow-500 border-yellow-500 bg-[#0F172A]/50"
                : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-0 relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-[#1E293B]/80 backdrop-blur-sm flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-500 rounded-full animate-spin border-t-transparent"></div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "Orders" && (
          <OrderHistoryTab
            orders={orders.map((order: any) => ({
              id: order.id,
              date: order.createdAt,
              customer: customerName,
              itemsCount: order.items?.length || 0,
              total: order.total || 0,
              status: order.status,
              storeName: order.store?.name || "Unknown Store",
            }))}
          />
        )}

        {/* RIDES TAB */}
        {activeTab === "Rides" &&
          (rides.length > 0 ? (
            <div className="divide-y divide-gray-800 animate-in fade-in duration-300">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  className="p-4 flex justify-between items-center hover:bg-[#0F172A] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">
                        {/* ✅ FIX: Cast to 'any' to allow accessing 'city' */}
                        Ride to{" "}
                        {ride.dropoffAddress?.street ||
                          (ride.dropoffAddress as any)?.city ||
                          "Unknown Destination"}
                      </p>
                        {formatDateTime(ride.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    {/* ✅ Use Currency Component */}
                    <Currency
                      amount={ride.totalFare}
                      className="text-white text-sm"
                    />

                    <div className="mt-1">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          ride.status === "COMPLETED"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : ride.status === "CANCELLED"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-gray-700 text-gray-400 border-gray-600"
                        }`}
                      >
                        {ride.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="text-center py-20 text-gray-500">
                <Car className="w-10 h-10 mx-auto mb-2 opacity-20" />
                No rides found
              </div>
            )
          ))}

        {/* LOGS TAB */}
        {activeTab === "Logs" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-400 bg-[#0F172A] p-4 rounded-lg border border-gray-800">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Activity logs are currently disabled for this user.
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === "Messages" &&
          (messages.length > 0 ? (
            <div className="divide-y divide-gray-800 animate-in fade-in duration-300">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-6 hover:bg-[#0F172A] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">
                          {msg.admin?.name || "Admin"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {formatDateTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-500/10 text-blue-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-blue-500/20">
                      Outgoing
                    </div>
                  </div>
                  <div className="ml-11">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="text-center py-20 text-gray-500">
                <Mail className="w-10 h-10 mx-auto mb-2 opacity-20" />
                No message history found
              </div>
            )
          ))}
      </div>
    </div>
  );
};
