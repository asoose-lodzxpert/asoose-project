"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Printer,
  User,
  Scale,
  Box,
  Camera,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import useSWR from "swr";
import { fetcher } from "../../hooks/useSuperAdminFetch";
import { formatDateTime } from "@/utils/formatDate";
import { formatTrackingId } from "@/lib/formatDeliveryId";
import { DeliveryDetailsSkeleton } from "./skeleton";
import { AssignRiderModal } from "../components/AssignRiderModal";
import { UpdateStatusModal } from "../components/UpdateStatusModal";
import { TrackingIDDisplay } from "../components/DeliveryIDDisplay";

// --- Types ---
interface DeliveryHistoryStep {
  status: string;
  loc: string;
  time: string;
  done: boolean;
  actor?: string;
}

interface DeliveryDetail {
  id: string;
  status: string;
  created: string;
  eta: string;
  type: string;
  package: { weight: string; dims: string; contents: string; fragile: boolean };
  sender: { name: string; address: string; phone: string };
  recipient: {
    name: string;
    address: string;
    phone: string;
    instructions: string;
  };
  courier: { name: string; id: string; vehicle: string; phone: string } | null;
  history: DeliveryHistoryStep[];
  isPaid?: boolean;
  paymentStatus?: string;
  deliveryOtp?: string;
}

// Visual Barcode Component
const Barcode = () => (
  <div className="flex items-center gap-0.5 h-8 select-none opacity-50 group-hover:opacity-100 transition-opacity">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className={`h-full ${Math.random() > 0.5 ? "w-1" : "w-0.5"} bg-white`}
      ></div>
    ))}
  </div>
);

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);

  // ===========================================================================
  //  ✅ SWR DATA FETCHING
  // ===========================================================================

  const {
    data: delivery,
    error,
    isLoading,
    mutate,
  } = useSWR<DeliveryDetail>(
    id ? `/super-admin/deliveries/${id}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      onError: () => {
        toast.error("Delivery not found");
        router.push("/super-admin/deliveries");
      },
    },
  );

  // ===========================================================================
  //  HANDLERS
  // ===========================================================================

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      autoClose: 1000,
      hideProgressBar: true,
    });
  };

  const openMap = (address: string) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      "_blank",
    );
  };

  const printLabel = () => {
    window.print();
  };

  // ===========================================================================
  //  RENDER
  // ===========================================================================

  if (isLoading) return <DeliveryDetailsSkeleton />;

  if (error || !delivery) return null;

  return (
    <>
      <div className="min-h-screen bg-[#0F172A] pb-20 print:bg-white print:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 print:p-0">
          {/* 1. Header */}
          <div className="flex flex-col xl:flex-row justify-between items-start gap-6 print:hidden">
            <div className="w-full xl:w-auto">
              <div className="flex items-center gap-2 mb-4">
                <Link
                  href="/super-admin/deliveries"
                  className="text-gray-400 hover:text-white flex items-center gap-1 text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Link>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3 md:gap-4 group">
                  <div className="space-y-1">
                    <p className="text-gray-400 text-xs">Tracking ID</p>
                    <TrackingIDDisplay 
                      fullId={delivery.id}
                      variant="detailed"
                      showCopy={true}
                      showTooltip={true}
                      truncateTooltip={false}
                    />
                  </div>
                  <div className="hidden sm:block pl-4 border-l border-gray-700">
                    <Barcode />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded border ${delivery.status === "Delivered"
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                  >
                    {delivery.status}
                  </span>
                  {delivery.isPaid === false && (
                    <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded border bg-red-500/10 text-red-500 border-red-500/20 animate-pulse">
                      UNPAID
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">{delivery.type}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full xl:w-auto">
              <button
                onClick={printLabel}
                className="flex-1 xl:flex-none justify-center px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-bold flex items-center gap-2 hover:bg-gray-700 transition-colors"
              >
                <Printer className="w-4 h-4" />{" "}
                <span className="hidden sm:inline">Print Label</span>
                <span className="sm:hidden">Print</span>
              </button>
              <button
                onClick={() => setShowUpdateStatusModal(true)}
                className="flex-1 xl:flex-none justify-center px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm font-bold hover:bg-yellow-400 transition-colors shadow-lg shadow-yellow-500/10">
                Update Status
              </button>
            </div>
          </div>

          {/* 2. Responsive Chain of Custody Timeline */}
          <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 md:p-8 print:border-gray-200 print:bg-white print:p-0">
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-6 md:mb-8 print:text-black">
              Chain of Custody
            </h3>

            <div className="relative">
              {/* Connector Lines */}
              {/* Mobile Vertical Line */}
              <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-gray-800 -z-0 md:hidden print:hidden"></div>
              {/* Desktop Horizontal Line */}
              <div className="hidden md:block absolute left-0 right-0 top-[14px] h-0.5 bg-gray-700 -z-0 print:bg-gray-300"></div>

              <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-4">
                {delivery.history.map((step, i) => (
                  <div
                    key={i}
                    className="relative z-10 flex md:flex-col items-start md:items-center gap-4 md:gap-3"
                  >
                    {/* Icon */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 ${step.done
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-[#0F172A] border-gray-600 text-gray-600 print:bg-white"
                        } ${!step.done && "bg-[#1E293B]"}`}
                    >
                      {step.done ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <div className="w-2 h-2 bg-gray-600 rounded-full" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="md:text-center pt-1 md:pt-0">
                      <p
                        className={`text-sm md:text-xs font-bold mb-1 ${step.done ? "text-white print:text-black" : "text-gray-500"}`}
                      >
                        {step.status}
                      </p>
                      <p className="text-xs md:text-[10px] text-gray-400 font-mono mb-2">
                        {step.time ? formatDateTime(step.time) : "-"}
                      </p>

                      {step.done && (
                        <div className="inline-flex items-center gap-1.5 bg-[#0F172A] py-1 px-2 rounded border border-gray-700 print:border-gray-300 print:bg-gray-100">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="text-[10px] text-gray-300 print:text-black whitespace-nowrap">
                            {i === 0
                              ? "System"
                              : i === 3
                                ? delivery.recipient.name
                                : delivery.courier?.name || "Logistics"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              {/* Addresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sender */}
                <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-5 md:p-6 relative group print:border-gray-300 print:bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-gray-400 uppercase text-xs font-bold">
                      <Package className="w-4 h-4" /> From
                    </div>
                    <button
                      onClick={() => copyToClipboard(delivery.sender.address)}
                      className="md:opacity-0 md:group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white print:hidden"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-white font-bold mb-1 print:text-black">
                    {delivery.sender.name}
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed mb-3 print:text-gray-600">
                    {delivery.sender.address}
                  </p>
                  <a
                    href={`tel:${delivery.sender.phone}`}
                    className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors inline-block"
                  >
                    {delivery.sender.phone}
                  </a>
                </div>

                {/* Recipient */}
                <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-5 md:p-6 relative group print:border-gray-300 print:bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-green-500 uppercase text-xs font-bold">
                      <MapPin className="w-4 h-4" /> To
                    </div>
                    <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity print:hidden">
                      <button
                        onClick={() =>
                          copyToClipboard(delivery.recipient.address)
                        }
                        className="text-gray-500 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => openMap(delivery.recipient.address)}
                        className="text-gray-500 hover:text-white"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-white font-bold mb-1 print:text-black">
                    {delivery.recipient.name}
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed mb-3 print:text-gray-600">
                    {delivery.recipient.address}
                  </p>
                  <a
                    href={`tel:${delivery.recipient.phone}`}
                    className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors inline-block"
                  >
                    {delivery.recipient.phone}
                  </a>

                  {delivery.recipient.instructions !== "N/A" && (
                    <div className="mt-3 p-2 bg-yellow-500/5 border border-yellow-500/20 text-yellow-500 text-xs rounded flex gap-2">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="italic">
                        "{delivery.recipient.instructions}"
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="bg-[#1E293B] border border-gray-800 rounded-2xl h-48 md:h-64 relative overflow-hidden group print:hidden">
                <div
                  className="absolute inset-0 opacity-40 bg-gray-800"
                  style={{
                    backgroundImage:
                      "radial-gradient(#334155 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-blue-500/20 p-4 rounded-full animate-pulse">
                    <div className="bg-blue-500 p-3 rounded-full shadow-xl shadow-blue-500/50">
                      <Truck className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-700 p-3 rounded-lg backdrop-blur">
                  <p className="text-xs text-gray-400">ETA</p>
                  <p className="text-sm font-bold text-white">{delivery.eta}</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-1 space-y-6">
              {/* Package Info */}
              <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-5 md:p-6 print:border-gray-300 print:bg-white">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">
                  Shipment Specs
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-800 print:border-gray-200">
                    <span className="text-gray-400 text-sm flex gap-2 items-center">
                      <Scale className="w-4 h-4" /> Weight
                    </span>
                    <span className="text-white font-mono print:text-black">
                      {delivery.package.weight}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-800 print:border-gray-200">
                    <span className="text-gray-400 text-sm flex gap-2 items-center">
                      <Box className="w-4 h-4" /> Dims
                    </span>
                    <span className="text-white font-mono print:text-black">
                      {delivery.package.dims}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-gray-400 text-sm block mb-2">
                      Contents
                    </span>
                    <p className="text-white text-sm bg-gray-800 p-2 rounded print:bg-gray-100 print:text-black">
                      {delivery.package.contents}
                    </p>
                  </div>
                  {delivery.package.fragile && (
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase justify-center border border-red-500/20 bg-red-500/10 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" /> Fragile Handling
                    </div>
                  )}
                  {delivery.deliveryOtp && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <span className="text-gray-500 text-xs uppercase font-bold block mb-2">Delivery Verification Code</span>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-2xl font-black text-green-500 tracking-widest">{delivery.deliveryOtp}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-green-500/60 font-bold uppercase">
                          <CheckCircle className="w-3 h-3" /> Mandatory OTP
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Courier Card */}
              <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-5 md:p-6 print:hidden">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">
                  Assigned Courier
                </h3>
                {delivery.courier ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                        {delivery.courier.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-bold text-sm truncate">
                          {delivery.courier.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {delivery.courier.id}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-800/50 p-2 rounded text-center border border-gray-700">
                        <span className="block text-gray-500 mb-1">
                          Vehicle
                        </span>
                        <span className="text-white font-bold block truncate">
                          {delivery.courier.vehicle || 'Not registered'}
                        </span>
                      </div>
                      <a
                        href={`tel:${delivery.courier.phone}`}
                        className="bg-blue-500/10 p-2 rounded text-center border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                      >
                        <span className="block text-blue-400 mb-1">
                          Contact
                        </span>
                        <span className="text-blue-300 font-bold block">
                          Call Driver
                        </span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-gray-700 rounded-xl bg-gray-800/20">
                    <p className="text-gray-500 text-sm mb-3">
                      No courier assigned
                    </p>
                    <button
                      onClick={() => delivery.isPaid !== false ? setShowAssignModal(true) : toast.error("Cannot assign rider to an unpaid delivery.")}
                      className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${delivery.isPaid !== false
                          ? "bg-yellow-500 text-black hover:bg-yellow-400"
                          : "bg-gray-800 text-gray-500 cursor-not-allowed opacity-50"
                        }`}
                    >
                      Assign Rider
                    </button>
                    {delivery.isPaid === false && (
                      <p className="text-red-400 text-[10px] mt-2 font-bold animate-pulse">Payment required before dispatch</p>
                    )}
                  </div>
                )}
              </div>

              {/* Proof of Delivery */}
              <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-5 md:p-6 print:hidden">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">
                  Proof of Delivery
                </h3>
                {delivery.status === "Delivered" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700 cursor-pointer hover:border-gray-500">
                      <Camera className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="aspect-square bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700 cursor-pointer hover:border-gray-500">
                      <FileText className="w-6 h-6 text-gray-500" />
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-700 rounded-xl h-32 flex flex-col items-center justify-center text-gray-600 bg-gray-800/20">
                    <Camera className="w-6 h-6 mb-2 opacity-50" />
                    <span className="text-xs">Pending Upload</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Rider Modal */}
      {showAssignModal && (
        <AssignRiderModal
          deliveryId={id}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => mutate()}
        />
      )}

      {/* Update Status Modal */}
      {showUpdateStatusModal && (
        <UpdateStatusModal
          deliveryId={id}
          currentStatus={delivery.status}
          onClose={() => setShowUpdateStatusModal(false)}
          onSuccess={() => mutate()}
        />
      )}
    </>
  );
}
