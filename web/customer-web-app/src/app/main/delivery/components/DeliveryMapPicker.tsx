"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { Check, Crosshair, Loader2, MapPin, X } from "lucide-react";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { reverseGeocode } from "@/services/reverse-geocode.service";
import { requestGeolocation } from "@/services/geolocation.service";
import { useCityStore } from "@/store/useCityStore";
import { useRideStore } from "@/app/main/ride/store/ride";

type Position = { lat: number; lng: number };

interface DeliveryMapPickerProps {
  open: boolean;
  kind: "pickup" | "dropoff";
  initialPosition: Position | null;
  initialAddress: string;
  onClose: () => void;
  onConfirm: (position: Position, address: string) => void;
}

const fallbackCenter = { lat: 11.8345, lng: 13.1507 };

export function DeliveryMapPicker({ open, kind, initialPosition, initialAddress, onClose, onConfirm }: DeliveryMapPickerProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const userLocation = useRideStore((state) => state.userLocation);
  const selectedCity = useCityStore((state) => state.selectedCity);
  const [position, setPosition] = useState<Position | null>(initialPosition);
  const [address, setAddress] = useState(initialAddress);
  const [resolving, setResolving] = useState(false);

  const defaultCenter = useMemo(() => initialPosition || userLocation || (selectedCity?.latitude != null && selectedCity?.longitude != null ? { lat: selectedCity.latitude, lng: selectedCity.longitude } : fallbackCenter), [initialPosition, selectedCity, userLocation]);

  useEffect(() => {
    if (!open) return;
    setPosition(initialPosition);
    setAddress(initialAddress);
  }, [open, initialPosition, initialAddress]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", close); };
  }, [open, onClose]);

  const pinLocation = useCallback(async (next: Position) => {
    setPosition(next);
    setResolving(true);
    try {
      const result = await reverseGeocode(next.lat, next.lng);
      setAddress(result.address || `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`);
    } catch {
      setAddress(`${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`);
    } finally {
      setResolving(false);
    }
  }, []);

  const useCurrentLocation = async () => {
    setResolving(true);
    try {
      const current = await requestGeolocation();
      await pinLocation({ lat: current.lat, lng: current.lng });
    } catch {
      setAddress("Current location is unavailable. Tap the map to place the pin instead.");
    } finally {
      setResolving(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label={`Choose ${kind} on map`}>
      <div className="flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl dark:bg-[#151515] sm:h-[min(760px,88vh)] sm:max-w-3xl sm:rounded-[2rem]">
        <header className="flex items-center justify-between border-b border-black/5 px-4 py-4 dark:border-white/10 sm:px-6">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">Pin exact location</p><h2 className="mt-1 text-xl font-black dark:text-white">{kind === "pickup" ? "Choose pickup point" : "Choose drop-off point"}</h2></div>
          <button type="button" onClick={onClose} className="rounded-full bg-gray-100 p-2.5 dark:bg-white/5" aria-label="Close map"><X className="h-5 w-5" /></button>
        </header>

        <div className="relative min-h-0 flex-1 bg-gray-100 dark:bg-zinc-900">
          {loadError ? <div className="flex h-full items-center justify-center p-8 text-center text-sm font-bold text-red-500">Google Maps could not load. Check the Maps API configuration.</div> : !isLoaded ? <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-500" /></div> : <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={position || defaultCenter} zoom={15} options={{ disableDefaultUI: true, zoomControl: true, fullscreenControl: false, clickableIcons: false }} onClick={(event) => { if (event.latLng) pinLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() }); }}>
            {position && <Marker position={position} draggable onDragEnd={(event) => { if (event.latLng) pinLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() }); }} label={{ text: kind === "pickup" ? "P" : "D", color: "white", fontWeight: "700" }} />}
          </GoogleMap>}
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-zinc-950/90 px-4 py-2 text-[11px] font-bold text-white shadow-lg backdrop-blur">Tap the map or drag the pin</div>
          <button type="button" onClick={useCurrentLocation} disabled={resolving} className="absolute bottom-4 right-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-zinc-950 shadow-xl disabled:opacity-60 dark:bg-zinc-900 dark:text-white"><Crosshair className="h-4 w-4 text-blue-500" /> My location</button>
        </div>

        <footer className="border-t border-black/5 p-4 dark:border-white/10 sm:p-6">
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-white/[0.04]"><span className={`mt-0.5 rounded-xl p-2 ${kind === "pickup" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}><MapPin className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected address</p><p className="mt-1 text-sm font-bold leading-5 dark:text-white">{resolving ? "Finding the address…" : address || "Tap the map to choose a location"}</p>{position && <p className="mt-1 text-[10px] text-gray-400">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</p>}</div>{resolving && <Loader2 className="mt-2 h-4 w-4 animate-spin text-yellow-500" />}</div>
          <button type="button" disabled={!position || resolving} onClick={() => position && onConfirm(position, address || `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-4 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-5 w-5" /> Confirm {kind === "pickup" ? "pickup" : "drop-off"}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
