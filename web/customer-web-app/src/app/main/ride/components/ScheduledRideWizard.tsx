'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Calendar, 
  Car, 
  CheckCircle2, 
  Clock,
  Navigation2,
  Wallet,
  AlertCircle,
  Loader2,
  User,
  Users
} from 'lucide-react';
import { useRideStore, BookingStage } from '../store/ride';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import { ScheduledRideService } from '@/services/scheduled-ride.service';
import { RideService } from '@/services/ride.service';
import { toast } from 'react-toastify';
import { SidebarSection, SidebarDivider } from './Sidebar';
import { useSession } from 'next-auth/react';

export function ScheduledRideWizard() {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  const { 
    bookingStage, 
    pickupLocation, 
    dropoffLocation, 
    pickupAddress,
    dropoffAddress,
    scheduledAt, 
    scheduledVehicleType, 
    scheduledFare,
    setBookingStage,
    setPickupLocation,
    setDropoffLocation,
    setPickupAddress,
    setDropoffAddress,
    setScheduledAt,
    setScheduledVehicle,
    setActiveTab,
    resetRide,
    passengerName,
    passengerPhone,
    setPassengerName,
    setPassengerPhone
  } = useRideStore();
  
  const [bookingForOther, setBookingForOther] = useState(false);

  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [fareBreakdown, setFareBreakdown] = useState<any>(null);
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize stage to LOCATION if IDLE
  useEffect(() => {
    if (bookingStage === 'IDLE') {
      setBookingStage('LOCATION');
    }
  }, [bookingStage, setBookingStage]);

  // Fetch estimate when locations change
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      const fetchEstimate = async () => {
        try {
          setIsLoadingFare(true);
          const estimates = await RideService.getEstimate({
            pickupLat: pickupLocation.lat,
            pickupLng: pickupLocation.lng,
            dropoffLat: dropoffLocation.lat,
            dropoffLng: dropoffLocation.lng,
            vehicleType: 'ECONOMY'
          }, ''); 
          
          if (estimates.ECONOMY) {
            setEstimatedFare(estimates.ECONOMY.estimatedFare);
            setFareBreakdown(estimates.ECONOMY);
            setScheduledVehicle('ECONOMY', estimates.ECONOMY.estimatedFare);
          }
        } catch (err) {
          console.error('Failed to fetch scheduled ride estimate', err);
        } finally {
          setIsLoadingFare(false);
        }
      };
      fetchEstimate();
    }
  }, [pickupLocation, dropoffLocation, setScheduledVehicle]);

  const handleNext = () => {
    if (bookingStage === 'LOCATION') setBookingStage('SCHEDULE');
    else if (bookingStage === 'SCHEDULE') setBookingStage('CONFIRM');
  };

  const handleBack = () => {
    if (bookingStage === 'SCHEDULE') setBookingStage('LOCATION');
    else if (bookingStage === 'CONFIRM') setBookingStage('SCHEDULE');
    else if (bookingStage === 'LOCATION') setActiveTab('request');
  };

  const handleBook = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!pickupLocation || !dropoffLocation || !scheduledAt) {
        throw new Error('Missing booking details');
      }

      const idempotencyKey = crypto.randomUUID();
      await ScheduledRideService.bookRide({
        scheduledAt,
        pickupLocation: {
          addressText: pickupAddress || 'Resolved Location',
          lat: pickupLocation.lat,
          lng: pickupLocation.lng
        },
        dropoffLocation: {
          addressText: dropoffAddress || 'Resolved Location',
          lat: dropoffLocation.lat,
          lng: dropoffLocation.lng
        },
        vehicleType: 'ECONOMY',
        baseFare: fareBreakdown?.breakdown?.baseFare,
        distanceFare: fareBreakdown?.breakdown?.distanceFare,
        timeFare: fareBreakdown?.breakdown?.timeFare,
        platformFee: fareBreakdown?.breakdown?.platformFee,
        totalFare: estimatedFare || undefined,
        distanceKm: fareBreakdown?.distance,
        durationMin: fareBreakdown?.duration,
        ...(bookingForOther && passengerName ? { passengerName } : {}),
        ...(bookingForOther && passengerPhone ? { passengerPhone } : {}),
      }, accessToken, idempotencyKey);

      setBookingStage('SUCCESS');
      toast.success('Ride scheduled successfully!');
      setTimeout(() => {
        resetRide();
        setActiveTab('history');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to book ride');
      toast.error(err.message || 'Booking failed');
    } finally {
      setIsLoading(false);
    }
  };

  const canGoNext = useMemo(() => {
    if (bookingStage === 'LOCATION') return !!(pickupLocation && dropoffLocation);
    if (bookingStage === 'SCHEDULE') return !!scheduledAt;
    return true;
  }, [bookingStage, pickupLocation, dropoffLocation, scheduledAt]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Progress Bar */}
      <div className="flex items-center justify-between p-6 pb-2">
        {['LOCATION', 'SCHEDULE', 'CONFIRM'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex flex-col items-center transition-all duration-300 ${bookingStage === s ? 'scale-110' : 'opacity-30'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                bookingStage === s ? 'bg-yellow-500 text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {i === 0 && <MapPin size={16} />}
                {i === 1 && <Calendar size={16} />}
                {i === 2 && <CheckCircle2 size={16} />}
              </div>
            </div>
            {i < 2 && <div className={`h-0.5 flex-1 mx-2 rounded-full ${
              ['LOCATION', 'SCHEDULE', 'CONFIRM'].indexOf(bookingStage) > i ? 'bg-yellow-500' : 'bg-zinc-100 dark:bg-zinc-800'
            }`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1">
        {bookingStage === 'LOCATION' && (
          <div className="space-y-4">
            <SidebarSection title="Where to?">
              <div className="space-y-3">
                <LocationAutocompleteInput
                  type="pickup"
                  onLocationSelect={(loc, addr) => {
                    setPickupLocation(loc);
                    setPickupAddress(addr);
                  }}
                  initialValue={pickupAddress || ''}
                />
                <LocationAutocompleteInput
                  type="dropoff"
                  onLocationSelect={(loc, addr) => {
                    setDropoffLocation(loc);
                    setDropoffAddress(addr);
                  }}
                  initialValue={dropoffAddress || ''}
                />
              </div>
            </SidebarSection>
          </div>
        )}

        {bookingStage === 'SCHEDULE' && (
          <SidebarSection title="When?">
            <div className="space-y-4">
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500 pointer-events-none" />
                <input
                  type="datetime-local"
                  value={scheduledAt ? new Date(new Date(scheduledAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setScheduledAt(date.toISOString());
                  }}
                  min={new Date(Date.now() + 30 * 60000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  max={new Date(Date.now() + 30 * 24 * 60 * 60000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all dark:text-white text-sm font-medium"
                />
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-2">
                <Clock className="text-blue-500 shrink-0" size={16} />
                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
                  Please book at least 30 minutes in advance.
                </p>
              </div>
            </div>
          </SidebarSection>
        )}


        {bookingStage === 'CONFIRM' && (
          <SidebarSection title="Confirm Booking">
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <p className="text-xs font-medium dark:text-white line-clamp-2">{pickupAddress}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <p className="text-xs font-medium dark:text-white line-clamp-2">{dropoffAddress}</p>
                </div>
                <SidebarDivider />
                <div className="flex justify-between items-center text-[10px] font-bold dark:text-white">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-yellow-500" />
                    <span>{scheduledAt ? new Date(scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <Car size={12} className="text-yellow-500" />
                    <span>Standard Ride</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 rounded-2xl bg-yellow-500 text-black">
                <div>
                  <p className="text-[10px] uppercase font-black opacity-60">Est. Fare</p>
                  <p className="text-xl font-black">₦{scheduledFare?.toLocaleString()}</p>
                </div>
                <Wallet size={24} className="opacity-20" />
              </div>

              {/* Who Is Riding Toggle */}
              <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {bookingForOther ? <Users size={16} className="text-zinc-500" /> : <User size={16} className="text-zinc-500" />}
                    <span className="text-xs font-bold dark:text-white">Booking for someone else?</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={bookingForOther}
                      onChange={(e) => {
                        setBookingForOther(e.target.checked);
                        if (!e.target.checked) {
                          setPassengerName(null);
                          setPassengerPhone(null);
                        }
                      }}
                    />
                    <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-yellow-500"></div>
                  </label>
                </div>
                {bookingForOther && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                    <input
                      type="text"
                      placeholder="Passenger Name"
                      className="w-full px-4 py-3 text-sm border border-zinc-200 dark:border-white/10 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-1 focus:ring-yellow-500 dark:text-white"
                      value={passengerName || ""}
                      onChange={(e) => setPassengerName(e.target.value)}
                    />
                    <input
                      type="tel"
                      placeholder="Passenger Phone"
                      className="w-full px-4 py-3 text-sm border border-zinc-200 dark:border-white/10 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-1 focus:ring-yellow-500 dark:text-white"
                      value={passengerPhone || ""}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-[10px] font-bold">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
            </div>
          </SidebarSection>
        )}

        {bookingStage === 'SUCCESS' && (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h1 className="text-xl font-black dark:text-white">Booked!</h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Your ride has been scheduled.</p>
            </div>
          </div>
        )}
      </div>

      {bookingStage !== 'SUCCESS' && (
        <div className="p-6 pt-0 flex gap-3 mt-auto">
          <button 
            onClick={handleBack}
            className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          
          {bookingStage === 'CONFIRM' ? (
            <button
              onClick={handleBook}
              disabled={isLoading}
              className="flex-1 py-3 bg-black dark:bg-white dark:text-black text-white rounded-xl font-black text-xs tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Schedule Ride'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex-1 py-3 bg-yellow-500 text-black rounded-xl font-black text-xs tracking-tight hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-30"
            >
              Continue
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
