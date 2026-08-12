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
    <div className="m-3 flex rounded-2xl bg-zinc-100 p-1 dark:bg-white/5">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-black transition-all ${
              isActive 
                ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
            }`}
          >
            <Icon size={15} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
