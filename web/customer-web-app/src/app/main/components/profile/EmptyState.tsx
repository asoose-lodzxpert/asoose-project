import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  actionLabel?: string;
  actionLink?: string;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  desc, 
  actionLabel, 
  actionLink = "/" 
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#151515] rounded-3xl border border-dashed border-gray-200 dark:border-white/10 text-center px-4 animate-in fade-in duration-700">
    <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 text-gray-300">
      <Icon className="w-10 h-10 opacity-50" />
    </div>
    <h3 className="text-lg font-bold mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-xs mb-8">{desc}</p>
    {actionLabel && (
      <Link 
        href={actionLink} 
        className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-lg active:scale-95"
      >
        {actionLabel}
      </Link>
    )}
  </div>
);