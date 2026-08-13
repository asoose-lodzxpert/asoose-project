"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Loader2, MapPin, RefreshCw, X } from "lucide-react";
import {
  LocationService,
  type ActiveCity,
} from "@/services/location.service";

interface CityFallbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (city: ActiveCity) => Promise<void> | void;
}

export function CityFallbackDialog({
  open,
  onClose,
  onSelect,
}: CityFallbackDialogProps) {
  const [cities, setCities] = useState<ActiveCity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const loadCities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCities(await LocationService.getActiveCities());
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn't load the available cities.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadCities();
  }, [open, loadCities]);

  if (!open) return null;

  const selectCity = async (city: ActiveCity) => {
    setSelectingId(city.id);
    try {
      await onSelect(city);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="city-dialog-title">
      <div className="w-full max-w-md overflow-hidden rounded-t-[2rem] border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-[#151515] sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-5 dark:border-white/10 sm:p-6">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400"><MapPin className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-600">Set your location</p>
              <h2 id="city-dialog-title" className="mt-1 text-xl font-black tracking-tight dark:text-white">Which city are you in?</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500">We couldn’t detect your location. Choose a city to see services available near you.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Choose city later"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm font-bold text-gray-500"><Loader2 className="mr-2 h-5 w-5 animate-spin text-yellow-500" /> Loading cities…</div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 p-5 text-center dark:bg-red-500/10"><p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p><button type="button" onClick={loadCities} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-gray-800 shadow-sm dark:bg-white/10 dark:text-white"><RefreshCw className="h-3.5 w-3.5" /> Try again</button></div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {cities.map((city) => (
                <button key={city.id} type="button" disabled={selectingId !== null} onClick={() => selectCity(city)} className="flex min-h-20 items-center gap-3 rounded-2xl border border-black/[0.06] bg-gray-50 p-3 text-left transition hover:border-yellow-400 hover:bg-yellow-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-yellow-500/10">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-sm dark:bg-white/5">{selectingId === city.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-black dark:text-white">{city.name}</span><span className="mt-0.5 block truncate text-[10px] text-gray-500">{city.state}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
