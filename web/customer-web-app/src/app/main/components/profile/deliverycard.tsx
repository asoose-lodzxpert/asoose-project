import Link from "next/link";
import { Package, Calendar, ArrowRight, Box } from "lucide-react";

interface DeliveryCardProps {
  id: string;
  status: string;
  date: string;
  total: number;
  description: string;
  recipient: string;
}

export const DeliveryCard = ({
  id,
  status,
  date,
  total,
  description,
  recipient,
}: DeliveryCardProps) => {
  return (
    <Link
      href={`/main/delivery/${id}`}
      className="group flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition-all hover:border-yellow-500/40 sm:gap-4 dark:border-white/[0.07] dark:bg-[#151515]"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
        <Box className="w-6 h-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-bold text-gray-400">
              DELIVERY #{id.slice(0, 8).toUpperCase()}
            </span>
            <h4 className="line-clamp-2 text-sm font-bold sm:text-base">{description}</h4>
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-bold sm:text-[10px] ${
              status === "DELIVERED"
                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                : status === "CANCELLED"
                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            To: {recipient}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {date}
          </div>
          <div className="font-bold text-gray-900 dark:text-gray-200">
            ₦{total.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="hidden self-center items-center justify-center text-gray-300 transition-colors group-hover:text-yellow-500 sm:flex">
        <ArrowRight className="w-5 h-5" />
      </div>
    </Link>
  );
};
