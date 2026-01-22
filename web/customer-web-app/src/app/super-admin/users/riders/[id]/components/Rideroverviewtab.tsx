'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Clock, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { VehicleCard } from './vechilecard';
import { getSession } from 'next-auth/react'; // ✅ Import NextAuth

// Dynamic import for the Map component
const RiderMap = dynamic(() => import('./map'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-800 animate-pulse flex items-center justify-center text-gray-500 text-sm">
      Loading Map...
    </div>
  )
});

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + (process.env.NEXT_PUBLIC_API_URL?.endsWith('/api') ? '' : '/api');

export const RiderOverviewTab = ({ rider, onRefresh }: { rider: any, onRefresh: () => void }) => {
  const perf = rider.performance || { acceptanceRate: 0, cancellationRate: 0, hoursOnline: 0 };
  
  // Live Location State (Array format [lat, lng])
  const [position, setPosition] = useState<[number, number]>([
    rider.currentLat || 6.5244, 
    rider.currentLng || 3.3792
  ]);
  const [lastSeen, setLastSeen] = useState(rider.lastSeen);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Poll for location updates
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setIsRefreshing(true);
        
        // 1. Get Session
        const session = await getSession();
        const token = (session as any)?.accessToken;

        // 2. Fetch with Auth Headers
        const res = await fetch(`${API_URL}/super-admin/riders/${rider.id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.currentLat && data.currentLng) {
            setPosition([data.currentLat, data.currentLng]);
            setLastSeen(data.lastSeen);
          }
        }
      } catch (err) {
        console.error("Location poll failed", err);
      } finally {
        setIsRefreshing(false);
      }
    };

    const interval = setInterval(fetchLocation, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [rider.id]);

  return (
    <div className="p-6 space-y-6">
      
      {/* 1. Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0F172A] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div>
             <p className="text-gray-500 text-[10px] uppercase font-bold">Total Trips</p>
             <span className="text-2xl font-bold text-white mt-1 block">{perf.totalTrips || 0}</span>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-lg"><Clock className="w-5 h-5 text-blue-500" /></div>
        </div>
        <div className="bg-[#0F172A] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div>
             <p className="text-gray-500 text-[10px] uppercase font-bold">Completion Rate</p>
             <span className="text-2xl font-bold text-white mt-1 block">{perf.completionRate}%</span>
          </div>
          <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="w-5 h-5 text-green-500" /></div>
        </div>
        <div className="bg-[#0F172A] p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div>
             <p className="text-gray-500 text-[10px] uppercase font-bold">Cancellation Rate</p>
             <span className="text-2xl font-bold text-white mt-1 block">{perf.cancellationRate}%</span>
          </div>
          <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
        </div>
      </div>

      {/* 2. Map & Vehicle Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Real Map */}
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden h-[350px] relative flex flex-col">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-[#1E293B]">
            <h3 className="font-bold text-white flex items-center gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-red-500" /> Live Location
              {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />}
            </h3>
            <span className="text-[10px] text-gray-400">
              {lastSeen ? new Date(lastSeen).toLocaleTimeString() : 'Offline'}
            </span>
          </div>
          <div className="flex-1 relative z-0">
             {/* ✅ FIX: Pass 'pos' array instead of separate lat/lng props */}
             <RiderMap pos={position} />
          </div>
        </div>

        {/* Editable Vehicle Details */}
        <div className="h-full">
           <VehicleCard 
             vehicle={rider.vehicle} 
             riderId={rider.id} 
             onUpdate={onRefresh} 
           />
        </div>
      </div>

    </div>
  );
};