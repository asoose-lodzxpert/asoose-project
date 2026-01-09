import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  iconColorClass?: string; // e.g., "bg-blue-500/20 text-blue-500"
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionCard = ({ 
  title, 
  icon: Icon, 
  iconColorClass = "bg-gray-700/20 text-gray-400", 
  children, 
  action,
  className = ""
}: SectionCardProps) => {
  return (
    <div className={`bg-[#1E293B] border border-gray-700 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-bold flex items-center gap-3">
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <span>{title}</span>
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
};