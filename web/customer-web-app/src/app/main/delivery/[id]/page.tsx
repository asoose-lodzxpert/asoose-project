"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { Loader2, ArrowLeft, AlertTriangle, Package } from "lucide-react";
import DeliveryProgressUI from "../components/DeliveryProgressUi";
import { DeliveryService, Delivery } from "@/services/delivery.service";
import { socketService } from "@/services/socket.service";
import BottomNav from "../../components/layout/BottomNav";
import ReportDisputeModal from "../../orders/component/reportDisputeModal";
import { useDeliveryStore } from "@/store/useDeliveryStore";

export default function DeliveryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  const deliveryId = params.id as string;
  const resetDelivery = useDeliveryStore((s) => s.resetDelivery);

  // Fetch initial data
  useEffect(() => {
    if (status === "loading") return;

    const fetchDelivery = async () => {
      try {
        const token =
          (session as any)?.accessToken || (session?.user as any)?.accessToken;
        const data = await DeliveryService.getDelivery(deliveryId, token);
        setDelivery(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load delivery details");
      } finally {
        setLoading(false);
      }
    };

    if (deliveryId) fetchDelivery();
  }, [deliveryId, session, status]);

  // Socket Connection
  // ⚠️  The effect must depend on `session` so it reconnects once next-auth
  //     has finished loading — on first mount `session` may be null.
  useEffect(() => {
    const token =
      (session as any)?.accessToken || (session?.user as any)?.accessToken;
    if (!token || !deliveryId) return;

    socketService.connect(token);

    const handleUpdate = (data: any) => {
      if (data.deliveryId === deliveryId || data.id === deliveryId) {
        setDelivery((prev) => {
          if (!prev) return null;

          // ⚠️  The backend emits `rider.vehicle` as a FLAT STRING
          // (e.g. "red Honda") but DeliveryProgressUI expects a
          // { model, color, plateNumber } object fetched from DB.
          // Only update top-level scalar fields from the socket; preserve
          // the full rider object (including structured `vehicle`) from the
          // HTTP fetch.  Merge rider name/phone only when socket provides them.
          const updatedRider: typeof prev.rider =
            data.rider && prev.rider
              ? {
                  ...prev.rider, // preserve DB-fetched vehicle object & required `id`
                  name: data.rider.name ?? prev.rider.name,
                  phone: data.rider.phone ?? prev.rider.phone,
                  // Never overwrite `vehicle` from socket — it is a flat string there
                }
              : prev.rider;

          return {
            ...prev,
            status: data.status,
            rider: updatedRider,
          };
        });

        if (data.status === "ASSIGNED" || data.status === "ACCEPTED") {
          toast.info("A rider has accepted your request!");
        }
        if (data.status === "PICKED_UP") toast.info("Package picked up.");
        if (data.status === "IN_TRANSIT")
          toast.info("Your package is on the way!");
        if (data.status === "DELIVERED") toast.success("Delivery completed!");
      }
    };

    socketService.on("delivery_update", handleUpdate);
    return () => {
      socketService.off("delivery_update", handleUpdate);
    };
  }, [deliveryId, session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="animate-spin text-yellow-500 w-8 h-8" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-[#0a0a0a]">
        <p className="text-zinc-500 mb-4">Delivery not found</p>
        <button
          onClick={() => router.push("/main/delivery")}
          className="text-yellow-500 font-bold"
        >
          Start a new delivery
        </button>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-white transition-colors duration-500 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/main/delivery")}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Delivery Details</h1>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Main Delivery Progress */}
        <DeliveryProgressUI delivery={delivery} />

        {/* Actions Section */}
        <div className="space-y-4">
          {/* Send Another Package Button - Only if Delivered */}
          {delivery.status === "DELIVERED" && (
            <button
              onClick={() => {
                // Reset the persisted Zustand store so returning to /main/delivery
                // starts a fresh flow instead of being immediately redirected back
                // here by the stage-tracking redirect guard.
                resetDelivery();
                router.push("/main/delivery");
              }}
              className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-2xl shadow-lg hover:shadow-xl transform active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Package size={20} />
              Send Another Package
            </button>
          )}

          {/* Report Issue Card - Only if Delivered or Cancelled */}
          {["DELIVERED", "CANCELLED"].includes(delivery.status) && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-white mb-1">
                    Had an issue with this delivery?
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Report missing items, delays, or other problems. Our support
                    team will review your case.
                  </p>
                  <button
                    onClick={() => setIsDisputeModalOpen(true)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Report an Issue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      {/* Report Dispute Modal */}
      {delivery && (
        <ReportDisputeModal
          isOpen={isDisputeModalOpen}
          onClose={() => setIsDisputeModalOpen(false)}
          referenceId={delivery.id}
          type="DELIVERY"
          onSuccess={() =>
            toast.info("Our support team will review your report shortly.")
          }
        />
      )}
    </div>
  );
}
