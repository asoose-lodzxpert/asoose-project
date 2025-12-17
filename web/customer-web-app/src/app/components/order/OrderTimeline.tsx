import { Check, ChefHat, Bike, MapPin } from 'lucide-react';

interface TimelineStepProps {
  title: string;
  subtitle: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: any;
  isLast?: boolean;
}

const TimelineStep = ({ title, subtitle, status, icon: Icon, isLast }: TimelineStepProps) => {
  let circleColor = "bg-gray-100 dark:bg-white/10 text-gray-400";
  let lineColor = "bg-gray-100 dark:bg-white/10";
  let iconColor = "text-gray-400";

  if (status === 'completed') {
    circleColor = "bg-green-500 text-white shadow-lg shadow-green-500/30";
    lineColor = "bg-green-500";
    iconColor = "text-white";
  } else if (status === 'current') {
    circleColor = "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30 animate-pulse";
    lineColor = "bg-gray-100 dark:bg-white/10";
    iconColor = "text-black";
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        {/* Circle Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors duration-300 ${circleColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        {/* Connecting Line */}
        {!isLast && (
          <div className={`w-0.5 h-12 my-1 rounded-full transition-colors duration-300 ${lineColor}`} />
        )}
      </div>
      <div className="pb-8 pt-1">
        <h4 className={`font-bold text-sm ${status === 'upcoming' ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

export const OrderTimeline = () => {
  return (
    <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      <h3 className="font-bold text-lg mb-6 text-gray-900 dark:text-white">Order Status</h3>
      <div className="flex flex-col">
        <TimelineStep 
          title="Order Placed" 
          subtitle="Just now" 
          status="completed" 
          icon={Check} 
        />
        <TimelineStep 
          title="Preparing" 
          subtitle="In progress" 
          status="current" 
          icon={ChefHat} 
        />
        <TimelineStep 
          title="On the way" 
          subtitle="Estimated 12:45 PM" 
          status="upcoming" 
          icon={Bike} 
        />
        <TimelineStep 
          title="Delivered" 
          subtitle="Pending" 
          status="upcoming" 
          icon={MapPin} 
          isLast
        />
      </div>
    </div>
  );
};