"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DeliveryService, type Delivery } from "@/services/delivery.service";
import { DeliveryCard } from "@/app/main/components/profile/deliverycard";

const filters = [
  "All",
  "Scheduled",
  "Active",
  "Completed",
  "Cancelled",
] as const;
type Filter = (typeof filters)[number];
export function ParcelHistory({ token }: { token: string }) {
  const [filter, setFilter] = useState<Filter>("All");
  const [parcels, setParcels] = useState<Delivery[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (filter === "Active"
      ? DeliveryService.listActiveParcels(page, token)
      : filter === "Cancelled"
        ? DeliveryService.listCancelledParcels(page, token)
        : DeliveryService.listParcels(
          page,
          token,
          filter === "Scheduled"
            ? "SCHEDULED"
            : filter === "Completed"
              ? "DELIVERED"
              : undefined,
        )
    )
      .then((result) => {
        if (!active) return;
        setParcels(result.parcels);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((cause) => {
        if (active) setError(cause?.message || "Couldn’t load your parcels.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, token, filter, attempt]);
  const visible = parcels;
  return (
    <section className="space-y-4" aria-label="Parcel history">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Your parcels</h2>
        <Link
          href="/main/delivery"
          className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black"
        >
          Book a delivery
        </Link>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Filter parcels">
        {filters.map((item) => (
          <button
            key={item}
            aria-pressed={filter === item}
            onClick={() => {
              setFilter(item);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-bold ${item === filter ? "bg-zinc-900 text-white dark:bg-yellow-400 dark:text-black" : "bg-white text-zinc-500 dark:bg-white/5"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {loading ? (
        <p
          role="status"
          className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 dark:bg-white/5"
        >
          Loading parcels…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 p-5 text-sm"
        >
          {error}
          <button
            className="ml-3 underline"
            onClick={() => setAttempt(attempt + 1)}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {visible.length ? (
            visible.map((parcel) => (
              <DeliveryCard
                key={parcel.id}
                id={parcel.id}
                status={parcel.status}
                date={new Date(parcel.createdAt).toLocaleDateString()}
                total={parcel.deliveryFee}
                description={
                  parcel.packageDetails ||
                  `${parcel.size?.toLowerCase() || "Standard"} parcel`
                }
                recipient={parcel.recipientName || "Recipient"}
                scheduledAt={parcel.scheduledAt}
                paymentMethod={parcel.paymentMethod}
                paymentStatus={parcel.paymentStatus}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <h3 className="font-bold">
                No {filter === "All" ? "" : filter.toLowerCase()} parcels yet
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                Your delivery bookings will appear here.
              </p>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <button
                disabled={page <= 1}
                className="rounded-lg border px-3 py-2 disabled:opacity-40"
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                className="rounded-lg border px-3 py-2 disabled:opacity-40"
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
