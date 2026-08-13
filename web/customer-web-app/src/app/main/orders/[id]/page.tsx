"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  MessageSquare,
  NotebookPen,
  Phone,
  ReceiptText,
  ShoppingBag,
  Store,
  Wallet,
} from "lucide-react";
import { toast } from "react-toastify";
import { OrderTimeline } from "@/app/main/components/order/OrderTimeline";
import ReportDisputeModal from "../component/reportDisputeModal";
import { CustomerOrder, OrderService } from "@/services/order.service";

const TERMINAL_STATUSES = ["DELIVERED", "CANCELLED", "REJECTED"];

const statusClass = (status: string) => {
  if (status === "DELIVERED")
    return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  if (["CANCELLED", "REJECTED"].includes(status))
    return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  if (["DISPATCHED", "READY"].includes(status))
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const orderId = params.id as string;
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  const fetchOrder = useCallback(async (): Promise<CustomerOrder> => {
    if (!session?.accessToken) throw new Error("Authentication required");
    return OrderService.getOrder(orderId, session.accessToken);
  }, [orderId, session?.accessToken]);

  const { data: order, error, isLoading, mutate } = useSWR(
    status === "authenticated" && orderId
      ? ["customer-order", orderId]
      : null,
    fetchOrder,
    {
      refreshInterval: (currentOrder) =>
        currentOrder && TERMINAL_STATUSES.includes(currentOrder.status)
          ? 0
          : 5000,
      revalidateOnFocus: true,
    },
  );

  useEffect(() => {
    if (status !== "authenticated" || !orderId || !session?.accessToken)
      return;

    OrderService.getDeliveryCode(orderId, session.accessToken)
      .then((result) => setDeliveryCode(result.deliveryCode))
      .catch(() => setDeliveryCode(null));
  }, [orderId, session?.accessToken, status]);

  const copyDeliveryCode = async () => {
    if (!deliveryCode) return;
    try {
      await navigator.clipboard.writeText(deliveryCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1800);
    } catch {
      toast.error("Could not copy the delivery code.");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] dark:bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f7f5] p-6 text-center dark:bg-[#0a0a0a]">
        <AlertCircle className="mb-4 h-12 w-12 text-gray-300" />
        <h1 className="text-xl font-black">Order not found</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          {error?.message || "We could not load this order."}
        </p>
        <Link href="/main/orders" className="mt-5 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black">
          Back to orders
        </Link>
      </div>
    );
  }

  const merchantName =
    order.restaurantName || order.storeName || "Asoose merchant";
  const canReport = ["DELIVERED", "CANCELLED"].includes(order.status);
  const isTerminal = TERMINAL_STATUSES.includes(order.status);

  return (
    <div className="min-h-screen bg-[#f7f7f5] pb-28 text-gray-900 dark:bg-[#0a0a0a] dark:text-white">
      <header className="sticky top-[64px] z-20 border-b border-black/[0.06] bg-[#f7f7f5]/95 px-4 py-3 backdrop-blur-xl dark:border-white/5 dark:bg-[#0a0a0a]/95">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button type="button" onClick={() => router.back()} aria-label="Go back" className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white dark:border-white/5 dark:bg-[#151515]">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black sm:text-lg">Order details</h1>
            <p className="truncate font-mono text-xs text-gray-500">{order.orderNumber}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${statusClass(order.status)}`}>
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-4xl gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6 dark:border-white/[0.07] dark:bg-[#151515]">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Current status</p>
                <h2 className="mt-1 text-2xl font-black capitalize sm:text-3xl">
                  {order.status.replace(/_/g, " ").toLowerCase()}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-4 w-4 text-yellow-500" />
                {order.actualDeliveryAt
                  ? `Delivered ${new Date(order.actualDeliveryAt).toLocaleString("en-NG")}`
                  : order.estimatedDeliveryAt
                    ? `Estimated ${new Date(order.estimatedDeliveryAt).toLocaleString("en-NG")}`
                    : "Estimate pending"}
              </div>
            </div>
            <OrderTimeline status={order.status} />
          </section>

          {deliveryCode && !isTerminal && (
            <section className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-500/20 dark:bg-yellow-500/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-700 dark:text-yellow-400">Delivery code</p>
                  <p className="mt-2 font-mono text-3xl font-black tracking-[0.2em] sm:text-4xl">{deliveryCode}</p>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-gray-600 dark:text-gray-400">
                    Give this code to the rider only after you have received your complete order. The rider uses it to complete delivery.
                  </p>
                </div>
                <button type="button" onClick={copyDeliveryCode} aria-label="Copy delivery code" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/10">
                  {codeCopied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                </button>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6 dark:border-white/[0.07] dark:bg-[#151515]">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-xl bg-yellow-100 p-2 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
                <Store className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-black">{merchantName}</h2>
                <p className="text-xs text-gray-500">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-black dark:bg-white/5">{item.quantity}×</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{item.name}</p>
                    {item.instructions && <p className="mt-1 text-xs text-gray-500">{item.instructions}</p>}
                  </div>
                  <p className="shrink-0 text-sm font-black">₦{Number(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>

          {(order.deliveryNote || order.alternatePhone) && (
            <section className="grid gap-3 sm:grid-cols-2">
              {order.deliveryNote && (
                <div className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.07] dark:bg-[#151515]">
                  <NotebookPen className="mb-3 h-5 w-5 text-yellow-500" />
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">Delivery note</p>
                  <p className="mt-1 text-sm font-bold">{order.deliveryNote}</p>
                </div>
              )}
              {order.alternatePhone && (
                <a href={`tel:${order.alternatePhone}`} className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.07] dark:bg-[#151515]">
                  <Phone className="mb-3 h-5 w-5 text-yellow-500" />
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">Alternate phone</p>
                  <p className="mt-1 text-sm font-bold">{order.alternatePhone}</p>
                </a>
              )}
            </section>
          )}

          {order.workflowUpdates?.length > 0 && (
            <section className="rounded-3xl border border-black/[0.06] bg-white p-5 dark:border-white/[0.07] dark:bg-[#151515]">
              <h2 className="mb-4 font-black">Order updates</h2>
              <div className="space-y-4">
                {order.workflowUpdates.map((update, index) => (
                  <div key={update.id || `${update.status}-${index}`} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-500" />
                    <div>
                      <p className="text-sm font-bold">{update.message || update.status?.replace(/_/g, " ")}</p>
                      {update.createdAt && <p className="mt-1 text-xs text-gray-400">{new Date(update.createdAt).toLocaleString("en-NG")}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm dark:border-white/[0.07] dark:bg-[#151515]">
            <h2 className="mb-5 flex items-center gap-2 font-black">
              <ReceiptText className="h-5 w-5 text-yellow-500" /> Payment summary
            </h2>
            <div className="space-y-3 text-sm">
              <PriceRow label="Subtotal" value={order.subtotal} />
              <PriceRow label="Delivery fee" value={order.deliveryFee} />
              <PriceRow label="Service fee" value={order.serviceFee} />
              <PriceRow label="VAT" value={order.vat} />
              {order.discount > 0 && <PriceRow label="Discount" value={-order.discount} />}
              <div className="border-t border-dashed border-gray-200 pt-3 dark:border-white/10">
                <div className="flex items-center justify-between text-lg font-black">
                  <span>Total</span>
                  <span>₦{Number(order.total).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
              {order.paymentMethod === "WALLET" ? <Wallet className="h-5 w-5 text-yellow-600" /> : <CreditCard className="h-5 w-5 text-yellow-600" />}
              <div>
                <p className="text-xs font-black">{order.paymentMethod === "CARD" ? "Pay online" : "Wallet"}</p>
                <p className="text-[10px] font-bold text-gray-400">{order.paymentStatus}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-black/[0.06] bg-white p-5 dark:border-white/[0.07] dark:bg-[#151515]">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-gray-400">Placed</p>
                <p className="text-sm font-bold">{new Date(order.createdAt).toLocaleString("en-NG")}</p>
              </div>
            </div>
          </section>

          <Link href="/main/store" className="block w-full rounded-xl bg-yellow-500 py-4 text-center text-sm font-black text-black transition hover:bg-yellow-400">
            Continue shopping
          </Link>

          {canReport && (
            <button type="button" onClick={() => setIsDisputeModalOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-4 text-sm font-black text-red-600 dark:border-red-500/20 dark:bg-[#151515]">
              <MessageSquare className="h-4 w-4" /> Report an issue
            </button>
          )}
        </aside>
      </main>

      <ReportDisputeModal
        isOpen={isDisputeModalOpen}
        onClose={() => setIsDisputeModalOpen(false)}
        referenceId={orderId}
        type="ORDER"
        onSuccess={() => {
          toast.success("Dispute created successfully.");
          mutate();
        }}
      />
    </div>
  );
}

function PriceRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
      <span>{label}</span>
      <span className="font-bold text-gray-900 dark:text-white">
        {value < 0 ? "−" : ""}₦{Math.abs(Number(value)).toLocaleString()}
      </span>
    </div>
  );
}
