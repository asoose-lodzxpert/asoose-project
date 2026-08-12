import { Calendar, ArrowRight, Car } from "lucide-react";

interface RideCardProps {
  id: string;
  trackingId?: string;
  status: string;
  date: string;
  total: number;
  description: string;
  isScheduled?: boolean;
  scheduledAt?: string;
}

export const RideCard = ({
  id,
  trackingId,
  status,
  date,
  total,
  description,
  isScheduled,
  scheduledAt,
}: RideCardProps) => {
  return (
    <article className="group flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm transition-all hover:border-yellow-500/40 sm:gap-4 dark:border-white/[0.07] dark:bg-[#151515]">
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
        <Car className="w-6 h-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-400">
                {trackingId || `RIDE #${id.slice(0, 8).toUpperCase()}`}
              </span>
              {isScheduled && (
                <span className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                  Scheduled
                </span>
              )}
            </div>
            <h4 className="line-clamp-2 text-sm font-bold sm:text-base">{description}</h4>
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-bold sm:text-[10px] ${
              status === "COMPLETED"
                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                : status.startsWith("CANCELLED")
                  ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
            }`}
          >
            {status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {isScheduled && scheduledAt 
              ? new Date(scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : date}
          </div>
          <div className="font-bold text-gray-900 dark:text-gray-200">
            ₦{(total ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="hidden self-center items-center justify-center text-gray-300 transition-colors group-hover:text-yellow-500 sm:flex">
        <ArrowRight className="w-5 h-5" />
      </div>
    </article>
  );
};
