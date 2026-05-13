"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { CarMarker } from "@/app/main/ride/components/CarMarket";
import { ArrowLeft, Car, Star, Navigation } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface Location {
  lat: number;
  lng: number;
}

interface Address {
  id: string;
  addressText: string;
  lat: number;
  lng: number;
}

interface Driver {
  name: string;
  phone: string;
  rating: number;
  vehicle: {
    brand: string;
    model: string;
    plateNumber: string;
    color: string;
  } | null;
}

interface TrackingData {
  id: string;
  status: string;
  pickup: Address;
  dropoff: Address;
  driverLocation: Location | null;
  driver: Driver | null;
  routePolyline?: string | null;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
  ],
};

export default function PublicTrackingPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [otp, setOtp] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  
  const { isLoaded, loadError } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  // Load OTP from session storage on mount
  useEffect(() => {
    const savedOtp = sessionStorage.getItem(`track_otp_${id}`);
    if (savedOtp) {
      setOtp(savedOtp);
      verifyOtpAndStartTracking(savedOtp);
    }
  }, [id]);

  const verifyOtpAndStartTracking = async (code: string) => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/trips/rides/${id}/track?otp=${code}`);
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.removeItem(`track_otp_${id}`);
          setIsAuthenticated(false);
          toast.error("Invalid ride code");
          return;
        }
        throw new Error("Failed to load ride data");
      }
      
      const data = await res.json();
      setTrackingData(data);
      setIsAuthenticated(true);
      sessionStorage.setItem(`track_otp_${id}`, code);
      
      // Setup SSE Stream
      const eventSource = new EventSource(`${API_BASE_URL}/trips/rides/${id}/track/stream?otp=${code}`);
      
      eventSource.onmessage = (event) => {
        try {
          const streamData = JSON.parse(event.data);
          setTrackingData(streamData);
        } catch (e) {
          console.error("Error parsing SSE data", e);
        }
      };

      eventSource.onerror = () => {
        console.error("SSE connection lost. Reconnecting...");
      };

      return () => {
        eventSource.close();
      };
      
    } catch (error) {
      console.error(error);
      toast.error("An error occurred connecting to the server");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      toast.error("Please enter a valid 4-digit code");
      return;
    }
    verifyOtpAndStartTracking(otp);
  };

  // Draw Polyline and fit bounds
  useEffect(() => {
    if (!isLoaded || !window.google || !mapRef.current || !trackingData) return;

    // Draw route
    if (trackingData.routePolyline) {
      const decodedPath = window.google.maps.geometry.encoding.decodePath(trackingData.routePolyline);
      
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      
      polylineRef.current = new window.google.maps.Polyline({
        path: decodedPath,
        map: mapRef.current,
        strokeColor: "#4A90E2",
        strokeOpacity: 0.8,
        strokeWeight: 5,
        geodesic: true,
      });
    }

    // Fit bounds to show everything
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: trackingData.pickup.lat, lng: trackingData.pickup.lng });
    bounds.extend({ lat: trackingData.dropoff.lat, lng: trackingData.dropoff.lng });
    if (trackingData.driverLocation) {
      bounds.extend(trackingData.driverLocation);
    }
    mapRef.current.fitBounds(bounds);
    
    // Cleanup polyline on unmount
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [isLoaded, trackingData]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-800 p-8 rounded-2xl shadow-xl border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Track Your Ride</h1>
            <p className="text-zinc-400 text-sm">
              Please enter the 4-digit code provided to you to access live tracking.
            </p>
          </div>
          
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full text-center text-4xl tracking-[1em] font-bold py-4 bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 4}
              className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Verifying..." : "View Live Tracking"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <Link 
              href="/"
              className="flex items-center justify-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Asoose Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-between pointer-events-auto">
          <Link
            href="/"
            className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-white shadow-lg hover:bg-zinc-800 transition"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Home</span>
          </Link>
          
          <div className="bg-zinc-900/90 backdrop-blur border border-white/10 px-4 py-2 rounded-full text-white shadow-lg">
            <span className="text-sm font-medium capitalize flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${trackingData?.status === 'IN_PROGRESS' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
              {trackingData?.status?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 w-full relative">
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-red-400 z-20">
            Failed to load map.
          </div>
        )}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-yellow-500 z-20">
            Loading Map...
          </div>
        )}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            options={mapOptions}
            onLoad={(map) => {
              mapRef.current = map;
            }}
          >
            {trackingData?.pickup && (
              <Marker
                position={{ lat: trackingData.pickup.lat, lng: trackingData.pickup.lng }}
                label={{ text: "P", color: "white" }}
              />
            )}
            {trackingData?.dropoff && (
              <Marker
                position={{ lat: trackingData.dropoff.lat, lng: trackingData.dropoff.lng }}
                label={{ text: "D", color: "white" }}
              />
            )}
            {trackingData?.driverLocation && (
              <CarMarker position={trackingData.driverLocation} heading={0} />
            )}
          </GoogleMap>
        )}
      </div>

      {/* Driver Info Bottom Sheet */}
      {trackingData?.driver && (
        <div className="bg-zinc-900 border-t border-white/10 p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center border border-white/10">
                <Car className="text-yellow-500" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{trackingData.driver.name}</h3>
                <div className="flex items-center gap-1 text-sm text-yellow-500">
                  <Star size={14} className="fill-yellow-500" />
                  <span>{trackingData.driver.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-zinc-800 border border-white/10 px-3 py-1 rounded text-lg font-bold text-white tracking-widest uppercase">
                  {trackingData.driver.vehicle?.plateNumber || "N/A"}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {trackingData.driver.vehicle?.color} {trackingData.driver.vehicle?.brand} {trackingData.driver.vehicle?.model}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Navigation size={18} className="text-blue-400 mt-0.5" />
                <div>
                  <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Pickup</div>
                  <div className="text-sm text-zinc-300">{trackingData.pickup.addressText}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Navigation size={18} className="text-green-400 mt-0.5" />
                <div>
                  <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Dropoff</div>
                  <div className="text-sm text-zinc-300">{trackingData.dropoff.addressText}</div>
                </div>
              </div>
            </div>
            
            <a 
              href={`tel:${trackingData.driver.phone}`}
              className="mt-6 flex w-full items-center justify-center gap-2 bg-white text-zinc-900 py-4 rounded-xl font-bold hover:bg-zinc-200 transition"
            >
              Call Driver
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
