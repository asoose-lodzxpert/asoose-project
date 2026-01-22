import { Check, ChefHat, Bike, Package } from 'lucide-react';

interface TimelineProps {
  // Allow all possible backend statuses string
  status: string; 
}

export const OrderTimeline = ({ status }: TimelineProps) => {
  
  // FIX: Define visual steps that map to multiple backend statuses
  const steps = [
    { id: 'placed', label: 'Placed', icon: Check },
    { id: 'preparing', label: 'Preparing', icon: ChefHat },
    { id: 'dispatched', label: 'On the Way', icon: Bike },
    { id: 'delivered', label: 'Delivered', icon: Package },
  ];

  // FIX: Map backend enum statuses to visual progress level
  const getProgressLevel = (currentStatus: string) => {
    switch (currentStatus) {
      case 'PENDING': return 0; // Placed active
      case 'CONFIRMED': return 1; // Preparing active
      case 'PREPARING': return 1; // Preparing active
      case 'READY': return 1; // Preparing done, waiting for dispatch
      case 'DISPATCHED': return 2; // On the way active
      case 'ON_THE_WAY': return 2; // (Legacy/Fallback)
      case 'DELIVERED': return 3; // Delivered active
      case 'CANCELLED': return -1;
      case 'REJECTED': return -1;
      default: return 0;
    }
  };

  const currentLevel = getProgressLevel(status);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line (Background) */}
        <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-100 dark:bg-white/5 -z-10" />
        
        {steps.map((step, index) => {
          let state = 'inactive';
          if (status === 'CANCELLED' || status === 'REJECTED') {
            state = 'cancelled';
          } else {
            if (index < currentLevel) state = 'completed';
            if (index === currentLevel) state = 'active';
          }

          let circleClass = "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500";
          if (state === 'completed') circleClass = "bg-green-500 text-white";
          if (state === 'active') circleClass = "bg-yellow-500 text-black ring-4 ring-yellow-500/20";
          if (state === 'cancelled') circleClass = "bg-red-100 text-red-500";

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-[#0a0a0a] px-2 z-10">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${circleClass}`}>
                  <step.icon className="w-5 h-5" />
               </div>
               <span className={`text-xs font-bold ${state === 'active' ? 'text-yellow-600 dark:text-yellow-500' : 'text-gray-400'}`}>
                 {step.label}
               </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};