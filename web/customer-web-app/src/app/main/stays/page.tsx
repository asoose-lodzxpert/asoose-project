"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import Image from "next/image";
import Link from "next/link";
import { BedDouble, Building2, ChevronDown, Loader2, MapPin, Search, SlidersHorizontal, Star, Users } from "lucide-react";
import { LocationService, type ActiveCity } from "@/services/location.service";
import { PropertyService, type Property } from "@/services/property.service";
import { useCityStore } from "@/store/useCityStore";
import { AddressService, type SavedAddress } from "@/services/address.service";

const money = (value: number) => `₦${Number(value || 0).toLocaleString("en-NG")}`;
const minRoomPrice = (property: Property) => Math.min(...property.roomTypes.filter((room) => room.isActive).map((room) => room.pricePerNight));

export default function StaysPage() {
  const { data: session } = useSession();
  const selectedCity = useCityStore((state) => state.selectedCity);
  const setSelectedCity = useCityStore((state) => state.setSelectedCity);
  const [cities, setCities] = useState<ActiveCity[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [guests, setGuests] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) {
      setSavedAddresses([]);
      return;
    }
    AddressService.list(token)
      .then((items) =>
        setSavedAddresses(
          [...items].sort(
            (first, second) => Number(second.isDefault) - Number(first.isDefault),
          ),
        ),
      )
      .catch(() => setSavedAddresses([]));
  }, [session?.accessToken]);

  const selectBookingLocation = (value: string) => {
    if (value.startsWith("address:")) {
      const addressId = value.slice("address:".length);
      const address = savedAddresses.find((item) => item.id === addressId);
      if (!address) return;
      const city =
        cities.find((item) => item.id === address.cityId) ||
        cities.find(
          (item) => item.name.toLowerCase() === address.city?.toLowerCase(),
        );
      if (!city) {
        setSelectedAddressId("");
        toast.info("Accommodation is not available near this saved address yet.");
        return;
      }
      setSelectedCity(city);
      setSelectedAddressId(address.id);
      return;
    }

    const cityId = value.replace("city:", "");
    const city = cities.find((item) => item.id === cityId);
    if (city) setSelectedCity(city);
    setSelectedAddressId("");
  };

  useEffect(() => {
    LocationService.getActiveCities().then((items) => {
      setCities(items);
      if (!selectedCity && items[0]) setSelectedCity(items[0]);
    }).catch(() => setError("We couldn't load the available cities."));
  }, [selectedCity, setSelectedCity]);

  const load = useCallback(async () => {
    if (!selectedCity?.id) return;
    setLoading(true);
    setError("");
    try {
      const result = await PropertyService.list({
        cityId: selectedCity.id,
        search: search.trim() || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        guests: guests ? Number(guests) : undefined,
      });
      setProperties(result.properties || []);
    } catch (e: any) {
      setError(e?.message || "We couldn't load accommodation right now.");
    } finally {
      setLoading(false);
    }
  }, [selectedCity?.id, search, minPrice, maxPrice, guests]);

  useEffect(() => { load(); }, [load]);

  const countLabel = useMemo(() => `${properties.length} ${properties.length === 1 ? "property" : "properties"}`, [properties.length]);

  return (
    <div className="min-h-screen bg-[#f7f7f5] pb-28 text-[#171714] dark:bg-[#0a0a0a] dark:text-white md:pb-10">
      <section className="border-b border-black/5 bg-[#171714] text-white dark:border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-yellow-400"><BedDouble className="h-4 w-4" /> Accommodation</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Find accommodation that feels right.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">Hotels, apartments and shortlets in cities where Asoose operates.</p>
          </div>

          <div className="mt-8 grid gap-3 rounded-3xl bg-white p-3 text-black shadow-2xl shadow-black/20 sm:grid-cols-[1fr_220px_auto] sm:rounded-[2rem] dark:bg-[#151515] dark:text-white">
            <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-gray-50 px-4 dark:bg-white/5">
              <Search className="h-5 w-5 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Hotel, apartment or area" className="w-full bg-transparent text-sm font-bold outline-none placeholder:font-medium" />
            </label>
            <label className="relative flex min-h-14 items-center gap-3 rounded-2xl bg-gray-50 px-4 dark:bg-white/5">
              <MapPin className="h-5 w-5 text-yellow-500" />
              <select value={selectedAddressId ? `address:${selectedAddressId}` : `city:${selectedCity?.id || ""}`} onChange={(e) => selectBookingLocation(e.target.value)} className="w-full appearance-none bg-transparent pr-6 text-sm font-black outline-none">
                {savedAddresses.length > 0 && <optgroup label="Saved addresses">{savedAddresses.map((address) => <option className="text-black" value={`address:${address.id}`} key={address.id}>{address.label}{address.isDefault ? " (Default)" : ""} — {address.street || address.city || "Pinned location"}</option>)}</optgroup>}
                <optgroup label="Operating cities">{cities.map((city) => <option className="text-black" value={`city:${city.id}`} key={city.id}>{city.name}, {city.state}</option>)}</optgroup>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-gray-400" />
            </label>
            <button onClick={() => setFiltersOpen((value) => !value)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-6 text-sm font-black text-black hover:bg-yellow-300"><SlidersHorizontal className="h-4 w-4" /> Filters</button>
          </div>

          {filtersOpen && (
            <div className="mt-3 grid gap-3 rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur sm:grid-cols-3">
              <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Minimum price" className="h-12 rounded-xl bg-white px-4 text-sm font-bold text-black outline-none" />
              <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Maximum price" className="h-12 rounded-xl bg-white px-4 text-sm font-bold text-black outline-none" />
              <input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="Guests" className="h-12 rounded-xl bg-white px-4 text-sm font-bold text-black outline-none" />
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-end justify-between">
          <div><p className="text-xs font-black uppercase tracking-widest text-gray-400">Available now</p><h2 className="mt-1 text-2xl font-black">Accommodation in {selectedCity?.name || "your city"}</h2></div>
          {!loading && <span className="text-sm font-bold text-gray-500">{countLabel}</span>}
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-500" /></div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-white p-10 text-center dark:border-red-900/30 dark:bg-[#151515]"><p className="font-bold">{error}</p><button onClick={load} className="mt-4 rounded-xl bg-black px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-black">Try again</button></div>
        ) : properties.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 p-12 text-center dark:border-white/10"><Building2 className="mx-auto h-10 w-10 text-gray-300" /><h3 className="mt-4 text-lg font-black">No accommodation found</h3><p className="mt-1 text-sm text-gray-500">Try another city or clear your filters.</p></div>
        ) : (
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map((property) => {
              const price = minRoomPrice(property);
              return (
                <Link href={`/main/stays/${property.id}`} key={property.id} className="group min-w-0">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gray-200 dark:bg-white/5">
                    {property.image ? <Image src={property.image} alt={property.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><BedDouble className="h-10 w-10 text-gray-400" /></div>}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-black backdrop-blur">{property.propertyType.replaceAll("_", " ")}</span>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="truncate text-base font-black">{property.name}</h3><p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500"><MapPin className="h-3.5 w-3.5 shrink-0" />{property.address}</p></div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{property.rating || "New"}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between"><p className="text-sm"><span className="font-black">{Number.isFinite(price) ? money(price) : "Contact us"}</span>{Number.isFinite(price) && <span className="text-gray-500"> / night</span>}</p><span className="flex items-center gap-1 text-xs text-gray-500"><Users className="h-3.5 w-3.5" />{property.roomTypes[0]?.maxGuests || 1}+</span></div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
