import { ChevronRight, Clock, CheckCircle } from "lucide-react";

interface OrderProps {
  id: string;
  status: string;
  date: string;
  total: string;
  items?: string[];
}

export const OrderCard = ({ id, status, date, total, items }: OrderProps) => {
  const isDelivered = status === "DELIVERED";
  const isCancelled = ["CANCELLED", "REJECTED"].includes(status);

  return (
    <article className="group flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition-all hover:border-yellow-400/50 sm:p-5 dark:border-white/[0.07] dark:bg-[#151515]">
      <div className="flex min-w-0 gap-3 sm:gap-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isDelivered ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400" : isCancelled ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400" : "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-500"}`}
        >
          {isDelivered ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Clock className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold">Order #{id}</h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDelivered ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : isCancelled ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500"}`}
            >
              {status}
            </span>
          </div>
          <p className="line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
            {items?.length ? items.join(", ") : "Order details"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {date} • {total}
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-yellow-600" />
    </article>
  );
};
