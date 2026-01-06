import { Package, ChevronRight, Clock, CheckCircle } from 'lucide-react';

interface OrderProps {
  id: string;
  status: 'DELIVERED' | 'PROCESSING' | 'CANCELLED';
  date: string;
  total: string;
  items: string[];
}

export const OrderCard = ({ id, status, date, total, items }: OrderProps) => {
  const isDelivered = status === 'DELIVERED';
  
  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all cursor-pointer">
      <div className="flex gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isDelivered ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-500'}`}>
          {isDelivered ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-sm">Order #{id}</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDelivered ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'}`}>
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{items.join(', ')}</p>
          <p className="text-xs text-gray-400 mt-1">{date} • {total}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors hidden sm:block" />
    </div>
  );
};