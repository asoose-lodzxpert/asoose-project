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
      href={`/main/deliveries/${id}`}
      className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer group"
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
        <Box className="w-6 h-6" />
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="text-xs font-bold text-gray-400">
              DELIVERY #{id.slice(0, 8).toUpperCase()}
            </span>
            <h4 className="font-bold text-base">{description}</h4>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-md ${
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

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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

      <div className="hidden sm:flex items-center justify-center text-gray-300 group-hover:text-yellow-500 transition-colors">
        <ArrowRight className="w-5 h-5" />
      </div>
    </Link>
  );
};
