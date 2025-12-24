import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';

interface RiderFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  vehicleFilter: string;
  setVehicleFilter: (vehicle: string) => void;
  onClearFilters: () => void;
}

export default function RiderFilters({
  searchTerm, setSearchTerm, statusFilter, setStatusFilter, 
  vehicleFilter, setVehicleFilter, onClearFilters
}: RiderFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-[#1E293B] p-3 md:p-4 rounded-xl border border-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h2 className="font-bold text-white text-lg">Rider Database</h2>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search riders..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-yellow-500"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 bg-[#0F172A] border border-gray-800 rounded-lg hover:border-gray-700 text-gray-300 hover:text-white transition-colors text-sm"
          >
            <Filter className="w-4 h-4" /> 
            <span className="hidden md:inline">Filter</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mt-4 p-4 bg-[#0F172A] rounded-lg border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#1E293B] text-white text-sm px-3 py-2 rounded-lg border border-gray-800 focus:border-yellow-500 outline-none"
              >
                <option>All</option>
                <option>Online</option>
                <option>Busy</option>
                <option>Offline</option>
                <option>Suspended</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Vehicle Type</label>
              <select 
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="w-full bg-[#1E293B] text-white text-sm px-3 py-2 rounded-lg border border-gray-800 focus:border-yellow-500 outline-none"
              >
                <option>All</option>
                <option>Car</option>
                <option>Bike</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button 
              onClick={onClearFilters}
              className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}