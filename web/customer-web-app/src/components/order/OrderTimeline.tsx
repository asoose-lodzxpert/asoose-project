import { Check, ChefHat, Bike } from 'lucide-react';

interface TimelineProps {
  status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'CANCELLED';
}

export const OrderTimeline = ({ status }: TimelineProps) => {
  
  const steps = [
    { id: 'PENDING', label: 'Order Placed', icon: Check },
    { id: 'PROCESSING', label: 'Preparing', icon: ChefHat },
    { id: 'DELIVERED', label: 'Delivered', icon: Bike },
  ];

  // Helper to determine state of each step
  const getStepState = (stepId: string) => {
    if (status === 'CANCELLED') return 'cancelled';
    
    const statusOrder = ['PENDING', 'PROCESSING', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(status);
    const stepIndex = statusOrder.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'inactive';
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line (Background) */}
        <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-100 dark:bg-white/5 -z-10" />
        
        {steps.map((step, index) => {
          const state = getStepState(step.id);
          const Icon = step.icon;
          
          let circleClass = "bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-gray-500";
          if (state === 'completed') circleClass = "bg-green-500 text-white";
          if (state === 'active') circleClass = "bg-yellow-500 text-black ring-4 ring-yellow-500/20";
          if (status === 'CANCELLED') circleClass = "bg-red-100 text-red-500";

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-[#0a0a0a] px-2 z-10">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${circleClass}`}>
                  <Icon className="w-5 h-5" />
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