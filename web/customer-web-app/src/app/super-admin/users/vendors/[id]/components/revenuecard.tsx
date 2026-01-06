import { TrendingUp,TrendingDown } from "lucide-react";
const RevenueCard = ({ title, amount, change, icon: Icon, color, onClick }: any) => (
  <div className="bg-[#1E293B] border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-all cursor-pointer" onClick={onClick}>
    <p className="text-gray-400 text-xs font-bold uppercase mb-2">{title}</p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-${color}-500/10 rounded-lg text-${color}-500`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-2xl font-black text-white">{amount}</span>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  </div>
);

export default RevenueCard