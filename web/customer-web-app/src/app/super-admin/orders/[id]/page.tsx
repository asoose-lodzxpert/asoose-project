"use client";

import React from "react";
import {
  ArrowLeft,
  Printer,
  XCircle,
  Phone,
  MapPin,
  User,
  AlertTriangle,
  Package,
  CreditCard,
  Check,
  Copy,
  RefreshCw,
  Clock,
  Navigation,
  Layers, // Icon for Group context
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import useSWR from "swr";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import OrderActionsPanel from "./component/OrderActionsPanel";
import { Currency } from "@/app/main/components/Currency";
import { OrderDetailsSkeleton } from "./component/skeleton";

// --- Types ---
interface OrderDetail {
  id: string;
  groupId?: string; // ✅ Multi-vendor context
  serviceType: string;
  status: string;
  amount: number;
  updatedAt: string;
  isLate: boolean;
  dispute?: { id: string; reason: string };
  customer: { name: string; email: string; phone: string; address: string };
  vendor: {
    name: string;
    address: string;
    ownerName: string;
    ownerPhone: string;
  };
  rider?: { name: string; phone: string; vehicle: string };
  items: {
    name: string;
    quantity: number;
    price: number;
    options?: any;
    modifiers?: { name: string; price: number }[]; // ✅ Added modifiers support
    image?: string;
  }[];
  payment: { 
    status: string; 
    method: string; 
    total: number;
    isGroupPayment?: boolean; // ✅ Detects if payment was a multi-cart transaction
  };
  logs: { date: string; user: string; action: string; details?: string }[];
}

const renderItemDetails = (item: OrderDetail['items'][0]) => {
  const parts = [];
  if (item.options) parts.push(typeof item.options === 'string' ? item.options : JSON.stringify(item.options));
  if (item.modifiers && item.modifiers.length > 0) {
    parts.push(...item.modifiers.map(m => m.name));
  }
  return parts.length > 0 ? parts.join(", ") : "Standard";
};

const OrderStepper = ({ status }: { status: string }) => {
  const STEPS = ["PENDING", "PREPARING", "READY", "DISPATCHED", "DELIVERED"];

  const statusMap: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    PREPARING: 1,
    READY: 2,
    DISPATCHED: 3,
    DELIVERED: 4,
    COMPLETED: 4,
  };

  const activeIndex = statusMap[status] ?? 0;

  if (["CANCELLED", "REJECTED"].includes(status)) {
    return (
      <div className="w-full bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-center justify-center gap-2 text-red-500 font-bold mb-6 text-sm md:text-base">
        <XCircle className="w-5 h-5" /> Order was {status.toLowerCase()}
      </div>
    );
  }

  return (
    <div
      className="w-full bg-[#1E293B] p-4 md:p-6 rounded-xl border border-gray-800 mb-6 overflow-x-auto print:hidden shadow-sm no-scrollbar"
    >
      <div className="flex items-center justify-between min-w-[600px] md:min-w-full pb-2 md:pb-0">
        {STEPS.map((step, i) => (
          <div key={step} className="flex flex-col items-center relative z-10 w-full">
            {i !== 0 && (
              <div
                className={`absolute top-3 -left-1/2 w-full h-1 transition-colors duration-500 ${
                  i <= activeIndex ? "bg-green-500" : "bg-gray-700"
                }`}
              />
            )}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all bg-slate-900 ${
                i <= activeIndex
                  ? "bg-green-500 border-green-500 text-slate-900"
                  : "border-gray-600 text-gray-500"
              }`}
            >
              {i < activeIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-[10px] uppercase mt-3 font-bold transition-colors ${
                i <= activeIndex ? "text-white" : "text-gray-500"
              }`}
            >
              {step.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function OrderDetailsPage() {
  const params = useParams();
  const id = params?.id as string;

  const {
    data: order,
    error,
    isLoading,
    mutate,
  } = useSWR<OrderDetail>(id ? `/super-admin/orders/${id}` : null, fetcher, {
    refreshInterval: 15000,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} Copied!`);
  };

  if (isLoading) return <OrderDetailsSkeleton />;

  if (error || !order)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Order Not Found</h2>
          <Link href="/super-admin/orders" className="text-yellow-500 hover:underline mt-2 block">
            Back to Orders
          </Link>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pb-20 print:p-0 print:bg-white overflow-hidden">
      {/* Sticky Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 print:hidden sticky top-0 z-20 bg-[#0F172A]/95 backdrop-blur-md py-4 border-b border-gray-800 -mx-4 px-4 md:-mx-6 md:px-6 shadow-xl">
        <div className="w-full md:w-auto">
          <Link
            href="/super-admin/orders"
            className="text-gray-400 hover:text-white flex items-center gap-1 text-xs font-bold uppercase transition-colors mb-2"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Orders
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg md:text-2xl font-bold text-white whitespace-nowrap">
              Order <span className="text-yellow-500">#{order.id.substring(0, 8).toUpperCase()}</span>
            </h1>
            
            {/* ✅ Multi-vendor Group Badge */}
            {order.groupId && (
              <div 
                className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-help"
                title={`Part of Multi-vendor Group: ${order.groupId}`}
              >
                <Layers className="w-3 h-3" /> GROUP ORDER
              </div>
            )}

            <button
              onClick={() => copyToClipboard(order.id, "Order ID")}
              className="p-1.5 rounded bg-slate-800 text-gray-400 hover:text-white transition-all"
            >
              <Copy className="w-4 h-4" />
            </button>
            {order.isLate && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                LATE
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-1">
            Status: <span className="text-white font-bold">{order.status}</span>
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
          <button
            onClick={() => mutate()}
            className="p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:text-white transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 md:flex-none justify-center px-5 py-2.5 bg-white text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" /> PRINT INVOICE
          </button>
        </div>
      </div>

      <OrderStepper status={order.status} />

      {/* Dispute Alert */}
      {order.dispute && (
        <div className="bg-red-500 border border-red-400 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 text-white shadow-md">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <div className="flex-1 w-full">
            <h3 className="font-bold uppercase text-sm text-left">Active Dispute Reported</h3>
            <p className="text-sm opacity-90 break-words text-left">Reason: {order.dispute.reason}</p>
          </div>
          <Link
            href={`/super-admin/disputes/${order.dispute.id}`}
            className="w-full md:w-auto text-center px-6 py-2 bg-white text-red-600 text-xs font-bold rounded-lg hover:bg-gray-100 uppercase"
          >
            View Dispute
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 md:p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-yellow-500" /> Items Breakdown
              </h2>
              <span className="text-[10px] font-bold text-gray-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 uppercase">
                {order.serviceType}
              </span>
            </div>
            <div className="p-4 md:p-5 divide-y divide-slate-800">
              {order.items.map((item, i) => (
                <div key={i} className="py-4 flex items-start justify-between gap-3 md:gap-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate pr-2">{item.name}</p>
                      <p className="text-gray-500 text-[10px] font-medium uppercase truncate">
                        {renderItemDetails(item)}
                      </p>
                      <span className="text-yellow-500 text-[10px] font-bold md:hidden">x{item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-sm font-bold"><Currency amount={item.price * item.quantity} /></p>
                    <p className="text-gray-500 text-[10px] font-bold hidden md:block"><Currency amount={item.price} /> Each</p>
                    <p className="text-gray-500 text-[10px] font-bold hidden md:block">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-900/50 p-4 md:p-5 space-y-2 border-t border-slate-800">
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-bold text-white uppercase">Order Total</span>
                <span className="text-xl font-bold text-yellow-500"><Currency amount={order.amount} /></span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 md:p-5 shadow-sm">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Activity History
            </h2>
            <div className="space-y-6">
              {order.logs.map((log, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i !== order.logs.length - 1 && <div className="absolute top-6 left-3 w-px h-full bg-slate-800" />}
                  <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                  <div className="flex-1 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 min-w-0">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1 gap-1">
                      <p className="text-xs text-white font-bold uppercase">{log.action.replace("_", " ")}</p>
                      <span className="text-[10px] text-gray-500 font-medium">{new Date(log.date).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 break-words">
                      Performed by <span className="text-blue-400 font-bold">{log.user}</span> • {new Date(log.date).toLocaleDateString()}
                    </p>
                    {log.details && (
                      <div className="mt-2 text-[10px] text-gray-400 bg-black/20 p-2 rounded border border-slate-800 break-words">
                        {log.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 space-y-6 print:hidden min-w-0">
          {/* Recipient */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 md:p-5 shadow-sm">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" /> Recipient Information
            </h2>
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 mb-4">
              <p className="text-white font-bold text-lg mb-1 truncate">{order.customer.name}</p>
              <p className="text-gray-500 text-xs font-medium truncate">{order.customer.email}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => copyToClipboard(order.customer.phone, "Phone")}
                className="w-full flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 group"
              >
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span className="text-white text-xs font-bold">{order.customer.phone}</span>
                </div>
                <Copy className="w-3 h-3 text-gray-600" />
              </button>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex gap-3">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-xs leading-relaxed font-medium break-words">{order.customer.address}</span>
              </div>
            </div>
          </div>

          {/* Fulfillment */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 md:p-5 shadow-sm">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-purple-500" /> Fulfillment
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 min-w-0">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Store / Vendor</p>
                <p className="text-white font-bold text-sm mb-1 truncate">{order.vendor.name}</p>
                <p className="text-gray-500 text-[10px] font-bold">{order.vendor.ownerPhone}</p>
                <a href={`tel:${order.vendor.ownerPhone}`} className="block w-full mt-3 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-[10px] font-bold text-center uppercase hover:bg-purple-500 hover:text-white transition-all">
                  Call Vendor
                </a>
              </div>

              {order.rider ? (
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 min-w-0">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Logistics / Rider</p>
                  <p className="text-white font-bold text-sm mb-1 truncate">{order.rider.name}</p>
                  <p className="text-gray-500 text-[10px] font-bold truncate">{order.rider.vehicle} • {order.rider.phone}</p>
                  <a href={`tel:${order.rider.phone}`} className="block w-full mt-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold text-center uppercase hover:bg-blue-500 hover:text-white transition-all">
                    Call Rider
                  </a>
                </div>
              ) : (
                <div className="p-5 border border-dashed border-slate-700 rounded-xl text-center bg-slate-900/20">
                  <p className="text-gray-500 text-[10px] font-bold uppercase mb-3">No Rider Assigned</p>
                  <button className="w-full py-2 bg-yellow-500 text-slate-900 text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-yellow-400 transition-all">
                    Assign Rider
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 md:p-5 shadow-sm">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" /> Payment Details
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-[10px] font-bold uppercase">Status</span>
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${
                  order.payment?.status === "PAID" || order.payment?.status === "COMPLETED" || order.payment?.status === "PARTIALLY_REFUNDED"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                }`}>
                  {order.payment?.status || "UNPAID"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-[10px] font-bold uppercase">Method</span>
                <span className="text-white text-[10px] font-bold uppercase bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  {order.payment?.method || "CASH"}
                </span>
              </div>
              {/* ✅ Information about group transaction total */}
              {order.payment?.isGroupPayment && (
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-[10px] text-gray-500 italic">
                    Note: This order was part of a larger transaction totaling <Currency amount={order.payment.total} />.
                  </p>
                </div>
              )}
            </div>
          </div>

          <OrderActionsPanel
            orderId={order.id}
            currentStatus={order.status}
            onUpdate={() => mutate()}
          />
        </div>
      </div>
    </div>
  );
}