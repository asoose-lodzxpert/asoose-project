"use client";

import React from 'react';
import { 
  Phone, MessageSquare, CheckCircle2, Truck, MapPin, 
  Package, Clock, CreditCard, User, Circle, ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';

// Extended Interface to match the full backend response including Prisma relations
interface FullDeliveryDetails {
  id: string;
  status: 'PENDING' | 'REQUESTED' | 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  deliveryFee: number;
  packageDetails?: string;
  recipientName?: string;
  recipientPhone?: string;
  weightKg?: number;
  isFragile?: boolean;
  createdAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  
  // Relations
  rider?: {
    name: string;
    phone: string;
    image?: string;
    rating?: number;
    vehicle?: {
      model: string;
      color: string;
      plateNumber: string;
    };
  };
  pickupAddress?: {
    address?: string; // Resolved string from backend
    street: string;
    city: string;
  };
  dropoffAddress?: {
    address?: string; // Resolved string from backend
    street: string;
    city: string;
  };
}

export interface DeliveryProgressUIProps {
  delivery?: FullDeliveryDetails | any; // Loose type to accept service response
  stage?: string;
  courier?: any;
}

export default function DeliveryProgressUI({ delivery, stage: propStage }: DeliveryProgressUIProps) {
  const status = delivery?.status || propStage || 'REQUESTED';
  const rider = delivery?.rider;

  // ==========================
  // TIMELINE LOGIC
  // ==========================
  const steps = [
    { 
      id: 'REQUESTED', 
      label: 'Request Placed', 
      desc: 'Looking for a courier', 
      icon: Clock,
      date: delivery?.createdAt 
    },
    { 
      id: 'ASSIGNED', 
      match: ['ASSIGNED', 'ACCEPTED'],
      label: 'Courier Assigned', 
      desc: rider ? `${rider.name} is on the way` : 'Connecting...', 
      icon: User,
      date: null 
    },
    { 
      id: 'PICKED_UP', 
      match: ['PICKED_UP', 'IN_TRANSIT'],
      label: 'Package Picked Up', 
      desc: 'En route to destination', 
      icon: Package,
      date: delivery?.pickedUpAt 
    },
    { 
      id: 'DELIVERED', 
      label: 'Delivered', 
      desc: 'Package has arrived', 
      icon: CheckCircle2,
      date: delivery?.deliveredAt 
    }
  ];

  // Determine current active step index
  const getCurrentStepIndex = () => {
    if (status === 'DELIVERED' || status === 'COMPLETED') return 3;
    if (status === 'PICKED_UP' || status === 'IN_TRANSIT') return 2;
    if (status === 'ASSIGNED' || status === 'ACCEPTED') return 1;
    return 0; // REQUESTED / PENDING
  };

  const currentStep = getCurrentStepIndex();

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPickupDisplay = () => delivery?.pickupAddress?.address || delivery?.pickupAddress?.street || 'Processing Location...';
  const getDropoffDisplay = () => delivery?.dropoffAddress?.address || delivery?.dropoffAddress?.street || 'Processing Location...';
  const getCityDisplay = (addr: any) => addr?.city || 'Maiduguri';

  // ==========================
  // RENDER
  // ==========================
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-32">
      
      {/* 1. STATUS HEADER */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black dark:text-white mb-1">
              {status === 'DELIVERED' ? 'Delivery Completed' : 'Tracking Delivery'}
            </h2>
            <p className="text-zinc-500 text-sm">ID: {delivery?.id || '---'}</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2
            ${status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
            {status === 'REQUESTED' && <Clock size={16} className="animate-spin" />}
            {status === 'DELIVERED' && <CheckCircle2 size={16} />}
            {status.replace('_', ' ')}
          </div>
        </div>

        {/* TIMELINE */}
        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-6 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800 -z-0 mx-10" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 relative z-10">
            {steps.map((step, index) => {
              const isActive = index <= currentStep;
              
              return (
                <div key={step.id} className="flex md:flex-col items-center gap-4 md:gap-2">
                  {/* Icon Circle */}
                  <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center border-4 transition-all duration-500
                    ${isActive 
                      ? 'bg-yellow-500 border-yellow-100 dark:border-yellow-900 text-white' 
                      : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-300'
                    }`}>
                    <step.icon size={20} />
                  </div>
                  
                  {/* Text Content */}
                  <div className="md:text-center">
                    <p className={`font-bold text-sm ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{step.desc}</p>
                    {step.date && (
                      <p className="text-xs font-mono text-zinc-400 mt-1">{formatDate(step.date)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 2. LEFT COL: COURIER & PACKAGE */}
        <div className="md:col-span-2 space-y-6">
          
          {/* COURIER CARD */}
          {rider ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Courier Details</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-2xl flex items-center justify-center text-yellow-600 font-bold text-2xl">
                  {rider.name?.charAt(0) || 'C'}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold dark:text-white">{rider.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Truck size={14} />
                    <span>{rider.vehicle ? `${rider.vehicle.color} ${rider.vehicle.model} (${rider.vehicle.plateNumber})` : 'Motorbike'}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                    <MessageSquare size={18} />
                  </button>
                  <a href={`tel:${rider.phone}`} className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors">
                    <Phone size={18} />
                  </a>
                </div>
              </div>
            </div>
          ) : (
             <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-dashed border-zinc-200 dark:border-zinc-800 text-center py-8">
               <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
                 <User size={20} />
               </div>
               <p className="text-zinc-500 font-medium">Assigning a courier...</p>
             </div>
          )}

          {/* ADDRESS & PACKAGE INFO */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
             <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-6">Delivery Particulars</h3>
             
             <div className="relative pl-4 space-y-8 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-100 dark:before:bg-zinc-800">
                {/* Pickup */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 bg-yellow-500 shadow-sm" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Pickup Location</p>
                      <p className="font-bold text-zinc-900 dark:text-white text-lg leading-snug">
                         {getPickupDisplay()}
                      </p>
                      <p className="text-zinc-500 text-sm">{getCityDisplay(delivery?.pickupAddress)}</p>
                    </div>
                  </div>
                </div>

                {/* Dropoff */}
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-900 dark:bg-white shadow-sm" />
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Dropoff Location</p>
                      <p className="font-bold text-zinc-900 dark:text-white text-lg leading-snug">
                         {getDropoffDisplay()}
                      </p>
                      <p className="text-zinc-500 text-sm">{getCityDisplay(delivery?.dropoffAddress)}</p>
                    </div>
                  </div>
                </div>
             </div>

             <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-4">
               <div>
                 <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Package Details</p>
                 <div className="flex items-center gap-2">
                   <Package size={16} className="text-yellow-500" />
                   <span className="font-medium dark:text-white">{delivery?.packageDetails || 'Standard Package'}</span>
                 </div>
                 {delivery?.weightKg && <p className="text-xs text-zinc-500 mt-1">{delivery.weightKg} kg {delivery.isFragile ? '• Fragile' : ''}</p>}
               </div>
               <div>
                 <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Recipient</p>
                 <div className="flex items-center gap-2">
                   <User size={16} className="text-yellow-500" />
                   <span className="font-medium dark:text-white">{delivery?.recipientName || '---'}</span>
                 </div>
                 <p className="text-xs text-zinc-500 mt-1">{delivery?.recipientPhone}</p>
               </div>
             </div>
          </div>

        </div>

        {/* 3. RIGHT COL: SUMMARY & PAYMENT (FIXED COLORS) */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold opacity-60 uppercase tracking-wider mb-6">Payment Summary</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Delivery Fee</span>
                  <span className="font-medium">₦{delivery?.deliveryFee?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Service Charge</span>
                  <span className="font-medium">₦0</span>
                </div>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Paid</span>
                  <span>₦{delivery?.deliveryFee?.toLocaleString() || '0'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700">
                 <CreditCard size={18} className="text-zinc-500" />
                 <span className="text-sm font-medium">Paid via Card</span>
                 <CheckCircle2 size={16} className="ml-auto text-green-500" />
              </div>
           </div>
           
           {/* Support / Help */}
           <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm">
             <h3 className="font-bold text-lg dark:text-white mb-2">Need Help?</h3>
             <p className="text-sm text-zinc-500 mb-4">Having trouble with this delivery? Our support team is here to assist you.</p>
             <button className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors dark:text-white">
               Contact Support
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}
