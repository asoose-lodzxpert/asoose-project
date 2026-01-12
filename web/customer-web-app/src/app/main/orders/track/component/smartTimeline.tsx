'use client';

import React from 'react';
import { 
  CheckCircle2, Circle, Clock, MapPin, Navigation, 
  ChefHat, Package, Bike, Home, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

// --- Types ---
export interface TimelineStep {
  status: string;      // e.g., 'PREPARING'
  label: string;       // e.g., 'Order Preparing'
  description?: string; // e.g., 'Chef is working on your meal'
  time: string | null; // ISO Date string or null if pending
  icon?: 'default' | 'kitchen' | 'rider' | 'delivered'; // For custom icons
}

interface Props {
  status: string;
  eta: string | null;       // Pre-calculated by Backend (e.g., "15 mins")
  distance: string | null;  // Pre-calculated by Backend (e.g., "2.5 km")
  timeline: TimelineStep[];
  isLive: boolean;          // If socket is connected
}

export default function SmartTimeline({ status, eta, distance, timeline, isLive }: Props) {
  
  // Helper to choose icons based on step type
  const getStepIcon = (type?: string) => {
    switch (type) {
      case 'kitchen': return <ChefHat className="w-4 h-4" />;
      case 'rider': return <Bike className="w-4 h-4" />;
      case 'delivered': return <Home className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      
      {/* 🟢 Live Status Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b border-gray-100">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <span className="relative flex h-2.5 w-2.5">
               {isLive && status === 'ON_THE_WAY' && (
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               )}
               <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === 'CANCELLED' ? 'bg-red-500' : isLive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
             </span>
             <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
               {status === 'CANCELLED' ? 'Cancelled' : status === 'DELIVERED' ? 'Completed' : 'Live Status'}
             </p>
           </div>
           
           <h2 className="text-2xl font-bold text-gray-900">
             {status === 'ON_THE_WAY' ? 'Arriving Soon' : 
              status === 'PREPARING' ? 'Preparing your order' :
              status.replace(/_/g, ' ')}
           </h2>

           {/* 📍 Backend-Provided Distance & ETA */}
           {status === 'ON_THE_WAY' && (distance || eta) && (
             <div className="flex items-center gap-4 mt-3">
               {distance && (
                 <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                   <Navigation className="w-4 h-4 fill-current" />
                   <span className="font-bold">{distance} away</span>
                 </div>
               )}
               {eta && (
                 <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                   <Clock className="w-4 h-4" />
                   <span className="font-bold">{eta} ETA</span>
                 </div>
               )}
             </div>
           )}
        </div>
        
        {/* Status Icon Ring */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 
          ${status === 'DELIVERED' ? 'bg-green-50 border-green-100 text-green-600' : 
            status === 'CANCELLED' ? 'bg-red-50 border-red-100 text-red-600' : 
            'bg-blue-50 border-blue-100 text-blue-600'}`}>
           {status === 'PREPARING' ? <ChefHat className="w-8 h-8"/> : 
            status === 'ON_THE_WAY' ? <Bike className="w-8 h-8"/> : 
            status === 'DELIVERED' ? <CheckCircle2 className="w-8 h-8"/> :
            <Clock className="w-8 h-8" />}
        </div>
      </div>

      {/* 📜 Detailed Vertical Timeline */}
      <div className="relative space-y-0 pl-2">
        {/* Continuous Line */}
        <div className="absolute top-3 left-[19px] bottom-6 w-0.5 bg-gray-100" />

        {timeline.map((step, idx) => {
          const isCompleted = step.time !== null;
          const isCurrent = !isCompleted && (idx === 0 || timeline[idx - 1]?.time !== null);
          const isPending = !isCompleted && !isCurrent;
          
          return (
            <div key={idx} className={`relative flex gap-4 pb-8 last:pb-0 group ${isPending ? 'opacity-50' : 'opacity-100'}`}>
              
              {/* Timeline Node */}
              <div className={`relative z-10 w-10 h-10 rounded-full border-4 flex items-center justify-center bg-white transition-all duration-300
                ${isCompleted ? 'border-emerald-500 text-white bg-emerald-500' : 
                  isCurrent ? 'border-blue-500 text-blue-600 ring-4 ring-blue-50' : 
                  'border-gray-200 text-gray-300'}`}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : 
                 getStepIcon(step.icon)}
              </div>

              {/* Content */}
              <div className="pt-1 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`font-bold text-base ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                    {step.description && (
                      <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  {step.time && (
                    <time className="text-xs font-mono font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
                      {format(new Date(step.time), 'h:mm a')}
                    </time>
                  )}
                </div>

                {/* Optional: Current Step Animation/Info */}
                {isCurrent && status === 'ON_THE_WAY' && step.status === 'ON_THE_WAY' && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full animate-pulse">
                     <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                     Live updates active
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}