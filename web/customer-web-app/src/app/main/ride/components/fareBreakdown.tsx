import { Info } from "lucide-react";

export interface PriceBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier?: number;
  total: number;
  currency: string;
}

interface FareBreakdownProps {
  breakdown: PriceBreakdown;
  rideType: string;
}

export default function FareBreakdown({
  breakdown,
  rideType,
}: FareBreakdownProps) {
  if (!breakdown) return null;

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-900 rounded-xl text-sm border border-gray-100 dark:border-zinc-800 animate-in slide-in-from-top-2">
      <h4 className="font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
        <Info size={14} className="text-blue-500" />
        Fare Breakdown ({rideType})
      </h4>

      <div className="space-y-2 text-gray-600 dark:text-zinc-400">
        <div className="flex justify-between">
          <span>Base Fare</span>
          <span>
            {breakdown.currency} {breakdown.baseFare.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Distance</span>
          <span>
            {breakdown.currency} {breakdown.distanceFare.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Time</span>
          <span>
            {breakdown.currency} {breakdown.timeFare.toFixed(2)}
          </span>
        </div>

        {breakdown.surgeMultiplier && breakdown.surgeMultiplier > 1 && (
          <div className="flex justify-between text-amber-600 dark:text-amber-500 font-medium">
            <span>Surge Pricing (x{breakdown.surgeMultiplier})</span>
            <span>Applied</span>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-zinc-700 pt-2 mt-2 flex justify-between font-bold text-gray-900 dark:text-white text-base">
          <span>Total Estimate</span>
          <span>
            {breakdown.currency} {breakdown.total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
