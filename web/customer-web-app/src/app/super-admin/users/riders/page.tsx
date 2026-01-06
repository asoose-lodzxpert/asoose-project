'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { DataTable } from '@/app/super-admin/component/datatable';
import RiderStats from './component/riderstats';
import RiderFilters from './component/riderfilters';
import { createRiderColumns,RiderCard } from './component/column';
import { Rider,MOCK_RIDERS } from './component/types';
import RidersPageSkeleton from './component/skeleton';
export default function RidersPage() {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [rowSelection, setRowSelection] = useState({});
  const [riders, setRiders] = useState<Rider[]>(MOCK_RIDERS);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. Fetch Data on Mount ---
  useEffect(() => {
    const fetchRiders = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/riders');
        if (response.ok) {
          const data = await response.json();
          setRiders(data);
        } else {
          console.warn("API unavailable, using mock data");
          setRiders(MOCK_RIDERS);
        }
      } catch (error) {
        console.error("Failed to fetch riders:", error);
        setRiders(MOCK_RIDERS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRiders();
  }, []);

  // --- 2. Filter & Stats Logic ---
  const filteredRiders = useMemo(() => {
    return riders.filter(rider => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        !term || 
        rider.name.toLowerCase().includes(term) ||
        rider.id.toLowerCase().includes(term) ||
        rider.plate.toLowerCase().includes(term);
      
      const matchesStatus = statusFilter === 'All' || rider.status === statusFilter;
      const matchesVehicle = vehicleFilter === 'All' || rider.type === vehicleFilter;

      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [searchTerm, statusFilter, vehicleFilter, riders]);

  const stats = useMemo(() => ({
    total: filteredRiders.length,
    online: filteredRiders.filter(r => r.status === 'Online').length,
    totalRides: filteredRiders.reduce((sum, rider) => sum + rider.rides, 0),
    avgRating: filteredRiders
      .filter(r => r.rating !== null)
      .reduce((sum, rider) => sum + (rider.rating || 0), 0) / 
      (filteredRiders.filter(r => r.rating !== null).length || 1)
  }), [filteredRiders]);

  // --- 3. CRUD Handlers ---
  const handleDeleteRider = async (rider: Rider) => {
    const result = await Swal.fire({
      title: 'Delete Rider?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        // API Call
        const response = await fetch(`/api/riders/${rider.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');

        // Update State
        setRiders(prev => prev.filter(r => r.id !== rider.id));
        
        Swal.fire({
          title: 'Deleted!',
          text: `${rider.name} has been deleted.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308',
          timer: 1500
        });
      } catch (error) {
        Swal.fire({ title: 'Error', text: 'Failed to delete rider.', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  const handleToggleRiderStatus = async (rider: Rider) => {
    const isSuspended = rider.status === 'Suspended';
    const action = isSuspended ? 'activate' : 'suspend';
    
    const result = await Swal.fire({
      title: `${isSuspended ? 'Activate' : 'Suspend'} Rider?`,
      text: `Are you sure you want to ${action} ${rider.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isSuspended ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action}!`,
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const newStatus = isSuspended ? 'Online' : 'Suspended';
        
        // API Call
        const response = await fetch(`/api/riders/${rider.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) throw new Error('Status update failed');

        // Update State
        setRiders(prev => prev.map(r => r.id === rider.id ? { ...r, status: newStatus } : r));

        Swal.fire({
          title: 'Updated!',
          text: `Rider is now ${newStatus}.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          confirmButtonColor: '#eab308',
          timer: 1500
        });
      } catch (error) {
        Swal.fire({ title: 'Error', text: 'Failed to update status.', icon: 'error', background: '#1E293B', color: '#fff' });
      }
    }
  };

  const handleExport = () => {
    const csv = ['ID,Name,Phone,Vehicle,Status,Rides'].join(',') + '\n' +
      filteredRiders.map(r => `${r.id},${r.name},${r.phone},${r.vehicle},${r.status},${r.rides}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riders.csv';
    a.click();
  };

  // Generate Columns with Handlers
  const columns = useMemo(() => createRiderColumns({ 
    onToggleStatus: handleToggleRiderStatus, 
    onDelete: handleDeleteRider 
  }), [handleToggleRiderStatus, handleDeleteRider]);

  // Mobile Card Renderer with Handlers
  const renderMobileCard = (rider: Rider) => (
    <RiderCard 
      rider={rider} 
      onToggleStatus={handleToggleRiderStatus} 
      onDelete={handleDeleteRider} 
    />
  );

  // --- 4. Render ---
  if (isLoading) {
    return (
      <RidersPageSkeleton/>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Rider Management</h1>
            <p className="text-gray-400 text-sm mt-1">
              Showing {filteredRiders.length} riders • {stats.totalRides.toLocaleString()} total rides
            </p>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors text-sm">
            <Download className="w-4 h-4" /> <span className="hidden md:inline">Export List</span><span className="inline md:hidden">Export</span>
          </button>
        </div>

        {/* Stats & Filters */}
        <RiderStats stats={stats} />
        <RiderFilters 
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          vehicleFilter={vehicleFilter} setVehicleFilter={setVehicleFilter}
          onClearFilters={() => { setSearchTerm(''); setStatusFilter('All'); setVehicleFilter('All'); }}
        />

        {/* Data Table */}
        <div className="bg-[#1E293B] border border-gray-800 rounded-xl overflow-hidden flex-1 min-h-0">
          <DataTable
            data={filteredRiders}
            columns={columns}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            pageSize={10}
            renderMobileCard={renderMobileCard}
          />
        </div>

      </div>
    </div>
  );
}