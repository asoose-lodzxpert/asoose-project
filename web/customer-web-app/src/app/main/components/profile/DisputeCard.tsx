import {
  ShieldAlert,
  Calendar,
  ShoppingBag,
  Car,
  Package,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface DisputeCardProps {
  id: string;
  status: "OPEN" | "RESOLVED" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  reason: string;
  category: string; // "Order" | "Ride" | "Delivery" | "General"
  createdAt: string;
  hoursOpen: number;
  orderId?: string | null;
  rideId?: string | null;
  deliveryId?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  RESOLVED:
    "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-gray-400",
  MEDIUM: "text-blue-400",
  HIGH: "text-orange-400",
  URGENT: "text-red-500",
};

const CategoryIcon = ({ category }: { category: string }) => {
  if (category === "Order") return <ShoppingBag className="w-5 h-5" />;
  if (category === "Ride") return <Car className="w-5 h-5" />;
  if (category === "Delivery") return <Package className="w-5 h-5" />;
  return <ShieldAlert className="w-5 h-5" />;
};

export const DisputeCard = ({
  id,
  status,
  priority,
  reason,
  category,
  createdAt,
  hoursOpen,
}: DisputeCardProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer group">
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0 text-red-500 dark:text-red-400">
        <CategoryIcon category={category} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="min-w-0">
            <span className="text-xs font-bold text-gray-400">
              DISPUTE #{id.slice(0, 8).toUpperCase()}
            </span>
            <h4 className="font-bold text-sm truncate">{reason}</h4>
            <span className="text-xs text-gray-500">{category} Dispute</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${
              STATUS_STYLES[status] ??
              "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
          {status === "OPEN" && (
            <div
              className={`flex items-center gap-1 font-semibold ${PRIORITY_STYLES[priority] ?? "text-gray-400"}`}
            >
              <AlertCircle className="w-3 h-3" />
              {priority} · {hoursOpen}h open
            </div>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center justify-center text-gray-300 group-hover:text-yellow-500 transition-colors">
        <ChevronRight className="w-5 h-5" />
      </div>
    </div>
  );
};
