"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Home, Loader2, MapPin, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import LocationInput from "@/components/LocationInput";
import {
  AddressService,
  type SavedAddress,
} from "@/services/address.service";
import { LocationService, type ActiveCity } from "@/services/location.service";
import { useRideStore } from "@/app/main/ride/store/ride";
import { useCityStore } from "@/store/useCityStore";

interface LocationDropdownProps {
  onClose: () => void;
  onSelect?: (location: { label: string; details: string }) => void;
}

export function LocationDropdown({ onClose, onSelect }: LocationDropdownProps) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<ActiveCity[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [citiesError, setCitiesError] = useState("");
  const [selecting, setSelecting] = useState(false);
  const setUserLocation = useRideStore((state) => state.setUserLocation);
  const setCityId = useRideStore((state) => state.setCityId);
  const selectedCity = useCityStore((state) => state.selectedCity);
  const setSelectedCity = useCityStore((state) => state.setSelectedCity);
  const setLocationLabel = useCityStore((state) => state.setLocationLabel);

  const loadCities = useCallback(async () => {
    setLoading(true);
    setCitiesError("");
    try {
      setCities(await LocationService.getActiveCities());
    } catch (error: unknown) {
      setCities([]);
      setCitiesError(
        error instanceof Error
          ? error.message
          : "We couldn't load the available cities.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) {
      setSavedAddresses([]);
      return;
    }

    AddressService.list(token)
      .then((addresses) =>
        setSavedAddresses(
          [...addresses].sort(
            (first, second) => Number(second.isDefault) - Number(first.isDefault),
          ),
        ),
      )
      .catch(() => setSavedAddresses([]));
  }, [session?.accessToken]);

  const selectCoordinates = async (address: string, lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setLocationLabel(address);
    try {
      const resolved = await LocationService.resolveCity(lat, lng);
      if (resolved.serviceAvailable && resolved.city?.id) {
        setCityId(resolved.city.id);
        setSelectedCity({
          ...resolved.city,
          latitude: lat,
          longitude: lng,
        });
      } else {
        setCityId(null);
        setSelectedCity(null);
      }
    } catch {
      // The precise location is still usable if city resolution is unavailable.
      setCityId(null);
      setSelectedCity(null);
    }
    setQuery(address);
    onSelect?.({ label: "Location", details: address });
    onClose();
  };

  const selectCity = async (city: ActiveCity) => {
    setSelecting(true);
    try {
      let latitude = city.latitude;
      let longitude = city.longitude;
      if ((latitude == null || longitude == null) && window.google?.maps) {
        const response = await new google.maps.Geocoder().geocode({
          address: `${city.name}, ${city.state}, ${city.country || "Nigeria"}`,
        });
        const point = response.results[0]?.geometry.location;
        if (point) {
          latitude = point.lat();
          longitude = point.lng();
        }
      }
      setSelectedCity({ ...city, latitude, longitude });
      setLocationLabel([city.name, city.state].filter(Boolean).join(", "));
      setCityId(city.id);
      if (latitude != null && longitude != null) {
        setUserLocation({ lat: latitude, lng: longitude });
      }
      onSelect?.({
        label: "City",
        details: [city.name, city.state].filter(Boolean).join(", "),
      });
      onClose();
    } finally {
      setSelecting(false);
    }
  };

  const selectSavedAddress = async (address: SavedAddress) => {
    setUserLocation({ lat: address.latitude, lng: address.longitude });
    const details =
      [address.street, address.city].filter(Boolean).join(", ") ||
      `${address.latitude.toFixed(4)}, ${address.longitude.toFixed(4)}`;
    setLocationLabel(details);

    const knownCity = cities.find((city) => city.id === address.cityId);
    if (knownCity) {
      setCityId(knownCity.id);
      setSelectedCity({
        ...knownCity,
        latitude: address.latitude,
        longitude: address.longitude,
      });
    } else {
      try {
        const resolved = await LocationService.resolveCity(
          address.latitude,
          address.longitude,
        );
        if (resolved.serviceAvailable && resolved.city?.id) {
          setCityId(resolved.city.id);
          setSelectedCity({
            ...resolved.city,
            latitude: address.latitude,
            longitude: address.longitude,
          });
        } else {
          setCityId(null);
          setSelectedCity(null);
        }
      } catch {
        setCityId(null);
        setSelectedCity(null);
      }
    }

    onSelect?.({
      label: address.label,
      details,
    });
    onClose();
  };

  return (
    <div className="fixed left-4 right-4 top-[68px] z-50 rounded-3xl border border-black/5 bg-white p-4 shadow-2xl shadow-black/20 dark:border-white/10 dark:bg-[#151515] sm:absolute sm:left-0 sm:right-auto sm:top-[calc(100%+0.6rem)] sm:w-[380px]">
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">Your location</p>
        <h2 className="mt-1 text-lg font-black dark:text-white">Where should we serve you?</h2>
        <p className="mt-1 text-xs text-gray-500">Search an address, use your location, or choose a city.</p>
      </div>

      <LocationInput
        value={query}
        label=""
        placeholder="Search street, area or landmark"
        onChange={(address, details) => {
          setQuery(address);
          if (details?.lat != null && details?.lng != null) {
            selectCoordinates(address, details.lat, details.lng);
          }
        }}
      />

      {savedAddresses.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Saved addresses</span>
            <span className="text-[9px] font-bold text-gray-400">{savedAddresses.length}</span>
          </div>
          <div className="grid max-h-36 gap-2 overflow-y-auto pr-1">
            {savedAddresses.map((address) => {
              const details =
                [address.street, address.city].filter(Boolean).join(", ") ||
                `${address.latitude.toFixed(4)}, ${address.longitude.toFixed(4)}`;
              return (
                <button key={address.id} type="button" onClick={() => selectSavedAddress(address)} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-gray-50 p-3 text-left transition hover:border-yellow-400 hover:bg-yellow-50 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-yellow-500/10">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-sm dark:bg-white/5"><Home className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-xs font-black dark:text-white">{address.label}<span className={address.isDefault ? "rounded-full bg-yellow-100 px-1.5 py-0.5 text-[8px] uppercase text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400" : "hidden"}>Default</span></span><span className="mt-0.5 block truncate text-[10px] text-gray-500">{details}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-gray-100 dark:bg-white/5" /><span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Operating cities</span><div className="h-px flex-1 bg-gray-100 dark:bg-white/5" /></div>

      {loading ? (
        <div className="flex items-center justify-center py-5 text-xs font-bold text-gray-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading cities…</div>
      ) : citiesError ? (
        <div className="rounded-2xl bg-red-50 px-4 py-4 text-center dark:bg-red-500/10">
          <p className="text-xs font-bold text-red-600 dark:text-red-400">{citiesError}</p>
          <button type="button" onClick={() => void loadCities()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-gray-800 shadow-sm dark:bg-white/10 dark:text-white">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : cities.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 px-4 py-5 text-center text-xs font-semibold text-gray-500 dark:bg-white/[0.03]">No operating cities are available right now.</p>
      ) : (
        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
          {cities.map((city) => (
            <button key={city.id} type="button" disabled={selecting} onClick={() => selectCity(city)} className={`flex items-center gap-2 rounded-2xl border p-3 text-left transition hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 ${selectedCity?.id === city.id ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10" : "border-black/5 bg-gray-50 dark:border-white/5 dark:bg-white/[0.03]"}`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-sm dark:bg-white/5"><Building2 className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block truncate text-xs font-black dark:text-white">{city.name}</span><span className="block truncate text-[10px] text-gray-500">{city.state}</span></span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-[10px] leading-4 text-gray-500 dark:bg-white/[0.03]"><MapPin className="h-3.5 w-3.5 shrink-0 text-yellow-600" /> We use this location to show nearby stores, rides, deliveries and accommodation.</p>
    </div>
  );
}
