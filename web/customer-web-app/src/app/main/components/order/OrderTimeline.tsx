"use client";

import { Check, ChefHat, Bike, Package, XCircle } from "lucide-react";

interface TimelineProps {
  status: string;
}

export const OrderTimeline = ({ status }: TimelineProps) => {
  const steps = [
    { id: "placed", label: "Placed", icon: Check },
    { id: "preparing", label: "Preparing", icon: ChefHat },
    { id: "dispatched", label: "On the Way", icon: Bike },
    { id: "delivered", label: "Delivered", icon: Package },
  ];

  const getProgressLevel = (currentStatus: string) => {
    switch (currentStatus) {
      case "PENDING":
        return 0;
      case "CONFIRMED":
        return 1;
      case "PREPARING":
        return 1;
      case "READY":
        return 1;
      case "DISPATCHED":
        return 2;
      case "ON_THE_WAY":
        return 2;
      case "DELIVERED":
        return 3;
      case "CANCELLED":
        return -1;
      case "REJECTED":
        return -1;
      default:
        return 0;
    }
  };

  const currentLevel = getProgressLevel(status);
  const isCancelled = currentLevel === -1;

  return (
    <div className="w-full">
      <div className="flex items-start justify-between w-full">
        {steps.map((step, index) => {
          // Determine State
          let state = "inactive";
          if (isCancelled) {
            state = index === 0 ? "cancelled" : "inactive";
          } else {
            if (index < currentLevel) state = "completed";
            if (index === currentLevel) state = "active";
          }

          // Styles
          const isCompleted = state === "completed";
          const isActive = state === "active";
          const isBad = state === "cancelled";

          return (
            <div
              key={step.id}
              className="relative flex-1 flex flex-col items-center group"
            >
              {/* Connector Line (Right side) */}
              {index !== steps.length - 1 && (
                <div
                  className={`absolute top-5 left-[50%] right-[-50%] h-[2px] w-full transition-colors duration-500 ${
                    index < currentLevel
                      ? "bg-green-500" // Completed line
                      : "bg-gray-100 dark:bg-white/10" // Inactive line
                  }`}
                />
              )}

              {/* Icon Circle */}
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20"
                    : isActive
                      ? "bg-yellow-500 border-yellow-500 text-black shadow-lg shadow-yellow-500/30 scale-110"
                      : isBad
                        ? "bg-red-500 border-red-500 text-white"
                        : "bg-white dark:bg-[#151515] border-gray-200 dark:border-white/10 text-gray-300 dark:text-gray-600"
                }`}
              >
                {isBad ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}

                {/* Active Pulse Effect */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-bold uppercase tracking-wider mt-3 transition-colors duration-300 ${
                  isActive
                    ? "text-gray-900 dark:text-white translate-y-0"
                    : isCompleted
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-400 dark:text-gray-600"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
