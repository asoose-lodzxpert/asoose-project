import { MapPin, PlusCircle } from "lucide-react";

export const DeliveryCard = () => {
  return (
    <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 p-2 bg-yellow-500/10 rounded-full">
          <MapPin className="w-5 h-5 text-yellow-600 dark:text-yellow-500 fill-yellow-500/20" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-sm">Home</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            123 Main Street, Apt 4B
            <br />
            Brooklyn, NY 11201
          </p>
          <button className="flex items-center gap-2 text-xs font-bold text-yellow-600 dark:text-yellow-500 hover:opacity-80 transition-opacity">
            <PlusCircle className="w-4 h-4" />
            Add Delivery Instructions
          </button>
        </div>
      </div>
    </div>
  );
};
