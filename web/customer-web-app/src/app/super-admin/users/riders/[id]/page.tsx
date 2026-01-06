'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Loader2 } from 'lucide-react'; // Import a loading icon
import RiderHeader from './components/ridersHeader';
import RiderProfile from './components/riderprofile';
import StatsOverview from './components/statsoverview';
import RiderTabs from './components/ridertabs';
import { mockRider,mockRides,mockPayouts } from './components/data';
import { Rider,Ride,Payout } from './components/types';
import RiderDetailPageSkeleton from './components/skeleton';
export default function RiderDetailPage({ params }: { params: { id: string } }) {
  const riderId = params.id || 'RDR-005';

  // --- STATE MANAGEMENT ---
  const [isLoading, setIsLoading] = useState(true);
  const [rider, setRider] = useState<Rider>(mockRider);
  const [rides, setRides] = useState<Ride[]>(mockRides);
  const [payouts, setPayouts] = useState<Payout[]>(mockPayouts);

  // --- FETCH DATA ON MOUNT ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Attempt to fetch Rider Profile
        const riderRes = await fetch(`/api/riders/${riderId}`);
        if (riderRes.ok) {
          const riderData = await riderRes.json();
          setRider(riderData);
        } else {
          console.log("Database empty or API error, using Mock Rider data");
          setRider(mockRider);
        }

        // 2. Attempt to fetch Rides
        const ridesRes = await fetch(`/api/riders/${riderId}/rides`);
        if (ridesRes.ok) {
          const ridesData = await ridesRes.json();
          setRides(ridesData);
        } else {
          console.log("Database empty or API error, using Mock Rides data");
          setRides(mockRides);
        }

        // 3. Attempt to fetch Payouts
        const payoutsRes = await fetch(`/api/riders/${riderId}/payouts`);
        if (payoutsRes.ok) {
          const payoutsData = await payoutsRes.json();
          setPayouts(payoutsData);
        } else {
          console.log("Database empty or API error, using Mock Payouts data");
          setPayouts(mockPayouts);
        }

      } catch (error) {
        console.error("Network error, falling back to all mock data", error);
        // Fallback is already set in initial state, but explicit setting ensures consistency
        setRider(mockRider);
        setRides(mockRides);
        setPayouts(mockPayouts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [riderId]);

  // --- HANDLER: Toggle Rider Status (Suspend/Activate) ---
  const handleToggleRiderStatus = async () => {
    const action = rider.status === 'Suspended' ? 'activate' : 'suspend';
    const newStatus = rider.status === 'Suspended' ? 'Online' : 'Suspended';
    
    const result = await Swal.fire({
      title: `${rider.status === 'Suspended' ? 'Activate' : 'Suspend'} Rider?`,
      text: `Are you sure you want to ${action} ${rider.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: rider.status === 'Suspended' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: rider.status === 'Suspended' ? 'Yes, activate!' : 'Yes, suspend!',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        // API Call
        const response = await fetch(`/api/riders/${riderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) throw new Error('Failed to update status');

        // Update UI
        setRider(prev => ({ ...prev, status: newStatus }));
        
        Swal.fire({
          title: 'Updated!',
          text: `Rider status has been changed.`,
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Failed to update rider status.',
          icon: 'error',
          background: '#1E293B',
          color: '#fff'
        });
      }
    }
  };

  // --- HANDLER: Delete Ride ---
  const handleDeleteRide = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete Ride?',
      text: "You won't be able to revert this!",
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
        const response = await fetch(`/api/rides/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete ride');

        // Update UI
        setRides(prev => prev.filter(r => r.id !== id));
        
        Swal.fire({
          title: 'Deleted!',
          text: 'The ride record has been deleted.',
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete ride record.',
          icon: 'error',
          background: '#1E293B',
          color: '#fff'
        });
      }
    }
  };

  // --- HANDLER: Process Payout ---
  const handleProcessPayout = async (id: string) => {
    Swal.fire({
      title: 'Processing...',
      text: 'Communicating with the bank...',
      allowOutsideClick: false,
      background: '#1E293B',
      color: '#fff',
      didOpen: () => Swal.showLoading()
    });

    try {
      // API Call
      const response = await fetch(`/api/payouts/${id}/process`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Payment processing failed');

      // Update UI
      setPayouts(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'Paid', processedBy: 'Admin User' } : p
      ));
      
      Swal.fire({
        icon: 'success',
        title: 'Payment Sent!',
        background: '#1E293B',
        color: '#fff',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        title: 'Transaction Failed',
        text: 'Could not process the payout. Please try again.',
        icon: 'error',
        background: '#1E293B',
        color: '#fff'
      });
    }
  };

  // --- HANDLER: Retry Payout ---
  const handleRetryPayout = async (id: string) => {
     const result = await Swal.fire({
      title: 'Retry Payment?',
      text: "Attempt to process this failed payment again?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#eab308',
      confirmButtonText: 'Yes, Retry',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        // Optimistic Update: Set to Pending immediately
        setPayouts(prev => prev.map(p => 
          p.id === id ? { ...p, status: 'Pending', description: 'Retry Attempt' } : p
        ));

        // Call Process Logic
        await handleProcessPayout(id);

      } catch (error) {
        // Revert on error if needed (omitted for brevity)
        console.error("Retry failed", error);
      }
    }
  };

  // --- HANDLER: Delete Payout ---
  const handleDeletePayout = async (id: string) => {
    const result = await Swal.fire({
      title: 'Remove Payout Record?',
      text: "This effectively cancels any pending transaction logs.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
      background: '#1E293B',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        // API Call
        const response = await fetch(`/api/payouts/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete payout');

        // Update UI
        setPayouts(prev => prev.filter(p => p.id !== id));
        
        Swal.fire({
          title: 'Deleted!',
          icon: 'success',
          background: '#1E293B',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          title: 'Error',
          text: 'Failed to delete payout record.',
          icon: 'error',
          background: '#1E293B',
          color: '#fff'
        });
      }
    }
  };

  // --- LOADING VIEW ---
  if (isLoading) {
    return (
     <RiderDetailPageSkeleton/>
    );
  }

  // --- MAIN VIEW ---
  return (
    <div className="min-h-screen bg-[#0F172A] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <RiderHeader rider={rider} onToggleStatus={handleToggleRiderStatus} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Profile, Vehicle, Docs */}
          <div className="lg:col-span-1">
             <RiderProfile rider={rider} />
          </div>

          {/* Right Column: Stats & Tabs */}
          <div className="lg:col-span-2 space-y-6">
             <StatsOverview rider={rider} rides={rides} payouts={payouts} />
             
             <RiderTabs 
               rides={rides} 
               payouts={payouts}
               onDeleteRide={handleDeleteRide}
               onProcessPayout={handleProcessPayout}
               onRetryPayout={handleRetryPayout}
               onDeletePayout={handleDeletePayout}
             />
          </div>

        </div>
      </div>
    </div>
  );
}