import { Currency } from "@/app/main/components/Currency";
import { TrendingUp, TrendingDown } from "lucide-react";

interface RevenueCardProps {
  title: string;
  amount: number | string; // Accepts raw number/string for Currency component
  change?: number;
  icon: any;
  color: string;
  onClick?: () => void;
}

const RevenueCard = ({ title, amount, change, icon: Icon, color, onClick }: RevenueCardProps) => (
  <div 
    className="bg-[#1E293B] border border-gray-800 rounded-2xl p-5 md:p-6 hover:border-gray-700 transition-all cursor-pointer min-w-0" 
    onClick={onClick}
  >
    <p className="text-gray-400 text-xs font-bold uppercase mb-2 truncate">{title}</p>
    
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        {/* Icon Container */}
        <div className={`p-2 bg-${color}-500/10 rounded-lg text-${color}-500 shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        
        {/* Amount Display (Naira) */}
        <span className="text-xl md:text-2xl font-black text-white truncate">
          <Currency amount={amount} currency="NGN" />
        </span>
      </div>

      {/* Percentage Change Badge */}
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  </div>
);

export default RevenueCard;