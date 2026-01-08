'use client';
import React from 'react';
import { Search } from 'lucide-react';
import { DisputeStats } from '../types';
interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  categoryFilter: string;
  onCategoryChange: (val: string) => void;
  stats: DisputeStats | null;
}

export default function DisputeFilters({ 
  activeTab, onTabChange, searchTerm, onSearchChange, categoryFilter, onCategoryChange, stats 
}: Props) {
  
  const tabs = ['All', 'Needs Attention', 'Urgent', 'Resolved'];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-nowrap overflow-x-auto border-b border-gray-800 gap-6 custom-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab 
                ? 'border-yellow-500 text-yellow-500' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab}
            {/* Optional Counters */}
            {tab === 'Needs Attention' && stats && stats.totalOpen > 0 && (
              <span className="bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded-full">{stats.totalOpen}</span>
            )}
            {tab === 'Urgent' && stats && stats.urgentOpen > 0 && (
              <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">{stats.urgentOpen}</span>
            )}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by ID, user, or reason..." 
            value={searchTerm} 
            onChange={e => onSearchChange(e.target.value)} 
            className="w-full bg-[#1E293B] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 transition-colors" 
          />
        </div>
        
        <select 
          value={categoryFilter} 
          onChange={e => onCategoryChange(e.target.value)} 
          className="bg-[#1E293B] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500 cursor-pointer min-w-[150px]"
        >
          <option value="All">All Categories</option>
          <option value="Order">Orders</option>
          <option value="Ride">Rides</option>
          <option value="Delivery">Deliveries</option>
        </select>
      </div>
    </div>
  );
}