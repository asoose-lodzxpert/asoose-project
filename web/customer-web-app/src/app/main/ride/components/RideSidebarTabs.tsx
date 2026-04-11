'use client';

import React from 'react';
import { Car, Calendar, History } from 'lucide-react';
import { useRideStore, ActiveTab } from '../store/ride';
import { useRouter, useSearchParams } from 'next/navigation';

export function RideSidebarTabs() {
  const activeTab = useRideStore((state) => state.activeTab);
  const setActiveTab = useRideStore((state) => state.setActiveTab);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const codes: Record<ActiveTab, string> = { 
      request: '1001', 
      scheduled: '1002', 
      history: '1003' 
    };
    const params = new URLSearchParams(searchParams.toString());
    params.set('t', codes[tab]);
    router.replace(`?${params.toString()}`);
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'request', label: 'Request', icon: Car },
    { id: 'scheduled', label: 'Schedule', icon: Calendar },
    { id: 'history', label: 'My Rides', icon: History },
  ];

  return (
    <div className="flex border-b border-zinc-100 dark:border-zinc-800">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-all ${
              isActive 
                ? 'text-yellow-600 dark:text-yellow-500 border-b-2 border-yellow-500' 
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            <Icon size={18} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
