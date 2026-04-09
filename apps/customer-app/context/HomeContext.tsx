import {
  fetchMarketplaceHome,
  fetchPaginatedStores,
} from "@/services/marketplace.service";
import { Banner, HomeVertical, StoreFilterSlug, Vendor } from "@/types/home";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "./LocationContext";

export type HomeContextType = {
  banners: Banner[];
  bannersLoading: boolean;
  bannersError: string | null;
  refreshBanners: () => Promise<void>;
  verticals: HomeVertical[];
  verticalsLoading: boolean;
  verticalsError: string | null;
  refreshVerticals: () => Promise<void>;
  stores: Vendor[];
  storesError: string | null;
  initialStoreLoading: boolean;
  storeLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refreshStores: () => Promise<void>;
  category: StoreFilterSlug | string;
  setCategory: (cat: StoreFilterSlug | string) => void;
};

const HomeContext = createContext<HomeContextType | undefined>(undefined);

export function HomeProvider({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState<StoreFilterSlug | string>("all");
  const isFirstMount = useRef(true);
  const { city } = useLocation();
  const cityId = city?.id;

  // Banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannersError, setBannersError] = useState<string | null>(null);

  // Verticals
  const [verticals, setVerticals] = useState<HomeVertical[]>([]);
  const [verticalsLoading, setVerticalsLoading] = useState(true);
  const [verticalsError, setVerticalsError] = useState<string | null>(null);

  // Stores
  const [stores, setStores] = useState<Vendor[]>([]);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [initialStoreLoading, setInitialStoreLoading] = useState(true);
  const [storeLoading, setStoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);

  const refreshBanners = useCallback(async () => {
    try {
      setBannersLoading(true);
      setBannersError(null);
      const response = await fetchMarketplaceHome(cityId);
      setBanners(response.banners ?? []);
    } catch (error) {
      setBannersError(
        error instanceof Error ? error.message : "Unable to load banners",
      );
    } finally {
      setBannersLoading(false);
    }
  }, [cityId]);

  const refreshVerticals = useCallback(async () => {
    try {
      setVerticalsLoading(true);
      setVerticalsError(null);
      const response = await fetchMarketplaceHome(cityId);
      setVerticals(response.verticals ?? []);
    } catch (error) {
      setVerticalsError(
        error instanceof Error ? error.message : "Unable to load sections",
      );
    } finally {
      setVerticalsLoading(false);
    }
  }, [cityId]);

  const loadStores = useCallback(
    async (pageToLoad: number, reset = false) => {
      try {
        setStoreLoading(true);
        if (reset) setStoresError(null);
        const { stores: fetchedStores, meta } = await fetchPaginatedStores({
          page: pageToLoad,
          limit: 10,
          type: category === "all" ? undefined : category,
          cityId,
        });
        setStores((prev) =>
          reset ? fetchedStores : [...prev, ...fetchedStores],
        );
        setHasMore(meta.hasMore);
        setNextPage(meta.hasMore ? meta.page + 1 : meta.page);
      } catch (error) {
        setStoresError(
          error instanceof Error ? error.message : "Unable to load stores",
        );
      } finally {
        setStoreLoading(false);
        if (reset) setInitialStoreLoading(false);
      }
    },
    [category, cityId],
  );

  const refreshStores = useCallback(async () => {
    setInitialStoreLoading(true);
    setStores([]);
    setHasMore(true);
    setNextPage(1);
    await loadStores(1, true);
  }, [loadStores]);

  // Refresh stores when category or location changes (but not on initial mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    refreshStores();
    refreshBanners();
    refreshVerticals();
  }, [category, cityId, refreshStores, refreshBanners, refreshVerticals]);

  const loadMore = useCallback(() => {
    if (storeLoading || initialStoreLoading || !hasMore) return;
    loadStores(nextPage);
  }, [storeLoading, initialStoreLoading, hasMore, loadStores, nextPage]);

  const value = useMemo(
    () => ({
      banners,
      bannersLoading,
      bannersError,
      refreshBanners,
      verticals,
      verticalsLoading,
      verticalsError,
      refreshVerticals,
      stores,
      storesError,
      initialStoreLoading,
      storeLoading,
      hasMore,
      loadMore,
      refreshStores,
      category,
      setCategory,
    }),
    [
      banners,
      bannersLoading,
      bannersError,
      refreshBanners,
      verticals,
      verticalsLoading,
      verticalsError,
      refreshVerticals,
      stores,
      storesError,
      initialStoreLoading,
      storeLoading,
      hasMore,
      loadMore,
      refreshStores,
      category,
      setCategory,
    ],
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHomeContext() {
  const ctx = useContext(HomeContext);
  if (!ctx)
    throw new Error("useHomeContext must be used within a HomeProvider");
  return ctx;
}
