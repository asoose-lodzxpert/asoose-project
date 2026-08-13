"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { ApiService } from "@/services/api.service";
import { useRideStore } from "@/app/main/ride/store/ride";
import { useCityStore } from "@/store/useCityStore";
import {
  Store,
  ChevronRight,
  Utensils,
  ShoppingBasket,
  Pizza,
  Coffee,
  Gift,
  BriefcaseMedical,
  Carrot,
  Sandwich,
  Truck,
  Heart,
  SearchX,
  Package,
  MapPin,
  ArrowRight,
  Clock3,
  ShieldCheck,
} from "lucide-react";

// Components
import { RestaurantCard } from "@/app/main/components/home/RestaurantCard";
import {
  ProductCard,
  ProductProps,
} from "@/app/main/components/store/ProductCard";
import { FloatingCart } from "@/app/main/components/home/FloatingCart";
import { StoreSkeleton } from "./skeleton";
// import { ProductCard,ProductProps } from '@/store/ProductCard';

// --- CONFIG & TYPES ---

const CACHE_DURATION = 5 * 60 * 1000;

interface BannerData {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
  image?: string;
  type: "PROMO" | "AD";
}

interface Vendor {
  id: string;
  name: string;
  image?: string;
  slug?: string;
  rating: number;
  deliveryTime?: string;
  deliveryFee: number;
  type: string;
  isNew?: boolean;
}

interface CategoryTile {
  id: string;
  title: string;
  code: string;
}

interface VerticalSection {
  id: string;
  title: string;
  vendors: Vendor[];
}

interface SearchResults {
  stores: Vendor[];
  products: ProductProps[];
}

// Backend StorefrontCard -> UI Vendor
function toVendor(s: any): Vendor {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    image: s.logo || s.banner || undefined,
    rating: s.rating || 0,
    deliveryTime: `${s.preparationTime || 20} min`,
    deliveryFee: s.deliveryFee ?? 0,
    type: s.type,
  };
}

// Backend ProductSearchResult | DishSearchResult -> UI ProductProps
function toProductProps(p: any): ProductProps {
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    price: p.price ?? p.basePrice ?? 0,
    image: p.image || undefined,
    storeId: p.store?.id || "",
    storeName: p.store?.name,
  };
}

// --- HELPER: GET CATEGORY ICON ---
const getCategoryIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("food") || t.includes("restaurant"))
    return <Utensils className="w-6 h-6" />;
  if (t.includes("grocery") || t.includes("market"))
    return <ShoppingBasket className="w-6 h-6" />;
  if (t.includes("pharmacy") || t.includes("health") || t.includes("med"))
    return <BriefcaseMedical className="w-6 h-6" />;
  if (t.includes("fast food") || t.includes("burger"))
    return <Sandwich className="w-6 h-6" />;
  if (t.includes("pizza")) return <Pizza className="w-6 h-6" />;
  if (t.includes("coffee") || t.includes("cafe"))
    return <Coffee className="w-6 h-6" />;
  if (t.includes("fresh") || t.includes("veg"))
    return <Carrot className="w-6 h-6" />;
  if (t.includes("courier") || t.includes("send"))
    return <Truck className="w-6 h-6" />;
  if (t.includes("gift")) return <Gift className="w-6 h-6" />;
  return <Store className="w-6 h-6" />;
};

// --- DATA HOOK ---
function useStoreData() {
  const [data, setData] = useState<{
    categories: CategoryTile[];
    verticals: VerticalSection[];
    banners: BannerData[];
    searchResults: SearchResults | null;
  }>({ categories: [], verticals: [], banners: [], searchResults: null });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const userLocation = useRideStore((state) => state.userLocation);
  const cityId = useRideStore((state) => state.cityId);
  const selectedCity = useCityStore((state) => state.selectedCity);

  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(
    new Map(),
  );

  const fetchData = useCallback(async (q: string | null) => {
    const cacheKey = q
      ? `search:${q}:${cityId}:${userLocation?.lat}:${userLocation?.lng}`
      : `home:${cityId}:${userLocation?.lat}:${userLocation?.lng}`;

    const cached = cacheRef.current.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    try {
      const locationParams = new URLSearchParams();
      if (cityId) locationParams.set("cityId", cityId);
      if (userLocation) {
        locationParams.set("lat", String(userLocation.lat));
        locationParams.set("lng", String(userLocation.lng));
      }
      const locParams = locationParams.toString()
        ? `&${locationParams.toString()}`
        : "";

      let processedData;

      if (q) {
        // Stores matching the query + products/dishes matching the query,
        // fetched in parallel — the backend doesn't have one combined
        // "search everything" endpoint.
        const [storefronts, items] = await Promise.all([
          ApiService.get<any>(
            `/catalog/storefronts?search=${encodeURIComponent(q)}&limit=20${locParams}`,
          ),
          ApiService.get<any>(
            `/catalog/search?q=${encodeURIComponent(q)}&kind=ALL${locParams}`,
          ),
        ]);

        const products = [
          ...(items?.products?.items ?? []),
          ...(items?.dishes?.items ?? []),
        ].map(toProductProps);

        processedData = {
          categories: [],
          verticals: [],
          banners: [],
          searchResults: {
            stores: (storefronts?.storefronts ?? []).map(toVendor),
            products,
          },
        };
      } else {
        const home = await ApiService.get<any>(`/catalog/home?limit=10${locParams}`);

        const sections: VerticalSection[] = [
          { id: "open-now", title: "Open Now", vendors: (home.openNow ?? []).map(toVendor) },
          { id: "top-rated", title: "Top Rated", vendors: (home.topRatedStorefronts ?? []).map(toVendor) },
          { id: "featured", title: "Featured", vendors: (home.featuredStorefronts ?? []).map(toVendor) },
          { id: "new", title: "New On Asoose", vendors: (home.newStorefronts ?? []).map(toVendor) },
        ].filter((s) => s.vendors.length > 0);

        processedData = {
          categories: (home.storeTypes ?? []).map((t: any) => ({
            id: t.id,
            title: t.name,
            code: t.code,
          })),
          verticals: sections,
          banners: [],
          searchResults: null,
        };
      }

      cacheRef.current.set(cacheKey, {
        data: processedData,
        timestamp: Date.now(),
      });
      setData(processedData);
    } catch (err) {
      console.error(err);
      setLoadError("We couldn't load stores for this location. Please try again.");
      setData({ categories: [], verticals: [], banners: [], searchResults: null });
    } finally {
      setLoading(false);
    }
  }, [cityId, userLocation]);

  return { ...data, loading, loadError, fetchData, cityId, selectedCity };
}

// --- MAIN PAGE COMPONENT ---
function StorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userLocation = useRideStore((state) => state.userLocation);
  const query = searchParams.get("q")?.trim() || null;

  // Data
  const {
    categories,
    verticals,
    banners,
    searchResults,
    loading: initialLoading,
    loadError,
    cityId,
    selectedCity,
    fetchData,
  } = useStoreData();

  // UI State
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    fetchData(query);
  }, [query, fetchData]);

  // Banner Carousel Logic
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Toggle Favorite
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Show skeleton only on initial load
  if (initialLoading) return <StoreSkeleton />;

  const activeBanner = banners[activeBannerIndex];
  const categoryLocationParams = new URLSearchParams();
  if (cityId) categoryLocationParams.set("cityId", cityId);
  if (userLocation) {
    categoryLocationParams.set("lat", String(userLocation.lat));
    categoryLocationParams.set("lng", String(userLocation.lng));
  }
  const serializedCategoryLocation = categoryLocationParams.toString();
  const categoryLocationQuery = serializedCategoryLocation
    ? `?${serializedCategoryLocation}`
    : "";

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-32 font-sans">
      <main className="max-w-7xl mx-auto space-y-10 sm:space-y-12 min-h-[60vh]">
        {/* =========================================
            SCENARIO 1: HOME PAGE (NO SEARCH)
           ========================================= */}
        {!query && (
          <>
            {/* 1. CAROUSEL BANNER SECTION */}
            {activeBanner ? (
              <section className="px-4 pt-4 sm:pt-6 relative group">
                <div
                  className={`
                  w-full h-[180px] xs:h-[200px] sm:h-56 md:h-64 
                  rounded-3xl sm:rounded-[2rem] 
                  relative overflow-hidden flex items-center 
                  px-6 sm:px-12 shadow-xl transition-all duration-500 ease-in-out
                  ${activeBanner.type === "AD" ? "bg-indigo-900" : "bg-gradient-to-r from-yellow-500 to-orange-600"}
                `}
                >
                  {activeBanner.image && (
                    <div className="absolute inset-0 z-0">
                      <Image
                        src={activeBanner.image}
                        alt={activeBanner.title}
                        fill
                        className="object-cover opacity-30 mix-blend-overlay"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                    </div>
                  )}

                  <div className="relative z-10 text-white max-w-lg space-y-3 sm:space-y-4 animate-in slide-in-from-bottom-4 duration-700">
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-white/10">
                      {activeBanner.type === "AD" ? "Sponsored" : "Featured"}
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
                      {activeBanner.title}
                    </h2>
                    <p className="text-sm sm:text-base font-medium opacity-90 line-clamp-2">
                      {activeBanner.subtitle}
                    </p>
                    <Link
                      href={activeBanner.link}
                      className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
                    >
                      {activeBanner.buttonText}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Carousel Dots */}
                {banners.length > 1 && (
                  <div className="absolute bottom-6 right-8 z-20 flex gap-2">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveBannerIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === activeBannerIndex ? "bg-white w-6" : "bg-white/40 hover:bg-white/60"}`}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="px-4 pt-4 sm:pt-6">
                <div className="relative isolate min-h-[290px] overflow-hidden rounded-[1.5rem] bg-[#171714] px-5 py-7 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.65)] sm:min-h-[330px] sm:rounded-[1.75rem] sm:px-10 sm:py-12 lg:px-14">
                  <Image
                    src="/marketplace.jpg"
                    alt="Fresh groceries and meals from local stores"
                    fill
                    priority
                    className="-z-20 object-cover object-center opacity-55"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                  />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-black/75 to-black/10" />
                  <div className="max-w-xl text-white">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur-md">
                      <span className="h-2 w-2 rounded-full bg-yellow-400" />
                      Local favourites, delivered
                    </div>
                    <h1 className="max-w-lg text-[2rem] font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl">
                      Everything you need, right where you are.
                    </h1>
                    <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/75 sm:text-base">
                      Browse trusted restaurants, groceries, pharmacies and more around you.
                    </p>
                    <div className="mt-6 flex flex-col items-start gap-4 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                      {categories[0] ? (
                        <Link
                          href={`/main/store/category/${categories[0].code}${categoryLocationQuery}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-300 active:scale-[0.98]"
                        >
                          Start shopping
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            const headerBtn = document.querySelector('[aria-label="Change delivery address"]') as HTMLElement;
                            headerBtn?.click();
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-300 active:scale-[0.98]"
                        >
                          Set your location
                          <MapPin className="h-4 w-4" />
                        </button>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-white/75 sm:text-xs">
                        <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-yellow-400" /> Fast delivery</span>
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-yellow-400" /> Trusted stores</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 2. CATEGORY RAIL */}
            {categories.length > 0 && <section className="px-4">
              <div className="mb-5 flex items-end justify-between px-1">
                <div>
                  <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-yellow-600 dark:text-yellow-500">Explore</p>
                  <h2 className="text-xl font-black tracking-tight sm:text-2xl">What are you looking for?</h2>
                </div>
                <span className="hidden text-xs font-semibold text-gray-400 sm:block">Shop by category</span>
              </div>
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/main/store/category/${c.code}${categoryLocationQuery}`}
                    className="group flex min-w-[148px] snap-start items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_8px_30px_-24px_rgba(0,0,0,0.45)] transition duration-300 hover:-translate-y-0.5 hover:border-yellow-400/70 hover:shadow-md dark:border-white/[0.07] dark:bg-[#151515]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-700 transition-colors group-hover:bg-yellow-400 group-hover:text-black dark:text-yellow-400">
                      {getCategoryIcon(c.title)}
                    </div>
                    <span className="min-w-0 truncate text-sm font-extrabold capitalize text-gray-700 transition-colors group-hover:text-black dark:text-gray-200 dark:group-hover:text-white">
                      {c.title}
                    </span>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-yellow-600" />
                  </Link>
                ))}
              </div>
            </section>}

            {/* 3. DYNAMIC VERTICALS */}
            <div className="space-y-12">
              {verticals.length > 0 ? (
                verticals.map((section) => (
                  <section
                    key={section.id}
                    className="px-4"
                  >
                    <div className="mb-5 flex items-end justify-between">
                      <div>
                        <h2 className="mb-1 text-xl font-black capitalize tracking-tight sm:text-2xl">
                          {section.title}
                        </h2>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {section.id === "open-now" ? "Ready to take your order" : section.id === "top-rated" ? "Loved by customers near you" : section.id === "new" ? "Fresh finds worth discovering" : "Handpicked for you"}
                        </p>
                      </div>
                      <Link
                        href={`/main/store/category/${section.id}${categoryLocationQuery}`}
                        className="flex items-center gap-1 rounded-full border border-black/[0.06] bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm transition hover:border-yellow-400 hover:text-black dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
                      >
                        See all
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
                      {section.vendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          className="group relative min-w-[calc(100vw-3rem)] snap-start sm:min-w-0"
                        >
                          <button
                            onClick={(e) => toggleFavorite(e, vendor.id)}
                            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm backdrop-blur-md transition hover:scale-105 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                            aria-label={favorites.includes(vendor.id) ? `Remove ${vendor.name} from favourites` : `Add ${vendor.name} to favourites`}
                          >
                            <Heart
                              className={`w-4 h-4 ${favorites.includes(vendor.id) ? "fill-red-500 text-red-500" : ""}`}
                            />
                          </button>

                          <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                            <RestaurantCard
                              {...vendor}
                              time={vendor.deliveryTime || "30 min"}
                            />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                /* EMPTY STATE FOR HOME PAGE */
                <div className="flex flex-col items-center justify-center py-32 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-24 h-24 bg-yellow-500/10 rounded-[2.5rem] flex items-center justify-center mb-6">
                    <MapPin className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-black mb-2 tracking-tight">
                    {loadError
                      ? "We couldn't load nearby stores"
                      : cityId || selectedCity || userLocation
                        ? "No stores found nearby"
                        : "Choose your city to get started"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed font-medium">
                    {loadError
                      ? loadError
                      : cityId || selectedCity || userLocation
                        ? "There aren't any available stores for this location yet. Try another city or check again later."
                        : "Select one of our operating cities so we can show services available near you."}
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row gap-3">
                     <button
                        onClick={() => {
                            // Trigger the global location modal via store or document event
                            // Since we don't have a global state for THE MODAL in the store, 
                            // we can use a custom event or just prompt them to click the header.
                            const headerBtn = document.querySelector('[aria-label="Change delivery address"]') as HTMLElement;
                            headerBtn?.click();
                        }}
                        className="px-8 py-4 bg-yellow-500 text-black font-bold rounded-2xl hover:bg-yellow-400 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-yellow-500/20"
                      >
                        {cityId || selectedCity || userLocation ? "Change Location" : "Choose City"}
                      </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* =========================================
            SCENARIO 2: SEARCH RESULTS (FIXED)
           ========================================= */}
        {query && searchResults && (
          <section className="px-4 pt-4 sm:pt-6">
            <div className="mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
              <h1 className="text-2xl font-black mb-1">
                Results for "{query}"
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Found {searchResults.stores.length} stores and{" "}
                {searchResults.products.length} items
              </p>
            </div>

            {/* EMPTY STATE */}
            {searchResults.stores.length === 0 &&
              searchResults.products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <SearchX className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">No matches found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                    We couldn't find any stores or items matching "{query}"
                  </p>
                  <Link
                    href="/main/store"
                    className="mt-6 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
                  >
                    Clear Search
                  </Link>
                </div>
              )}

            {/* STORES GRID */}
            {searchResults.stores.length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5" /> Matching Stores
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                  {searchResults.stores.map((vendor) => (
                    <div key={vendor.id} className="relative group">
                      <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                        <RestaurantCard
                          {...vendor}
                          time={vendor.deliveryTime || "30 min"}
                        />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRODUCTS GRID */}
            {searchResults.products.length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" /> Matching Items
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                  {searchResults.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      {...product}
                      onClick={() =>
                        router.push(`/main/store/${product.storeId}`)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <FloatingCart />
    </div>
  );
}

// --- SUSPENSE WRAPPER ---
export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StorePage />
    </Suspense>
  );
}
