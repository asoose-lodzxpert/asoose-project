import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  fetchDeliveryQuote,
  fetchSavedAddresses,
} from "../services/sendPackage.api";

import { useUserProfile } from "@/hooks/useUserProfile";

import type {
  Address,
  DeliveryDetails,
  DeliveryQuote,
  LocationPoint,
  PackageOptions,
  PackageSize,
  PickupDetails,
} from "@/types/delivery";

/* ---------------------------------- */
/* Context Types */
/* ---------------------------------- */
type LocationType = "pickup" | "delivery";

type SendPackageContextType = {
  /* locations */
  pickup: LocationPoint;
  dropoff: LocationPoint;

  /* details */
  pickupDetails: PickupDetails;
  deliveryDetails: DeliveryDetails;

  /* package */
  packageSize: PackageSize;
  packageOptions: PackageOptions;

  /* data */
  savedAddresses: Address[];
  quote: DeliveryQuote | null;
  loadingQuote: boolean;

  /* location picker */
  locationPickerOpen: boolean;
  activeLocationType: LocationType | null;

  /* setters */
  setPickup: (p: LocationPoint) => void;
  setDropoff: (d: LocationPoint) => void;
  setPackageSize: (s: PackageSize) => void;
  setPackageOptions: (v: PackageOptions) => void;
  setPickupDetails: (v: PickupDetails) => void;
  setDeliveryDetails: (v: DeliveryDetails) => void;

  /* picker controls */
  openLocationPicker: (type: LocationType) => void;
  closeLocationPicker: () => void;

  /* Return the data for the delivery options */
  returnData: () => any;

  /* Reset delivery form */
  resetDelivery: () => void;
};

const SendPackageContext = createContext<SendPackageContextType | undefined>(
  undefined,
);

// Price table for package sizes
const PACKAGE_SIZE_PRICES: Record<PackageSize, number> = {
  small: 500,
  medium: 1000,
  large: 2500,
  extra_large: 5000,
};

/* ---------------------------------- */
/* Provider */
/* ---------------------------------- */
export function SendPackageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUserProfile();

  const [pickup, setPickup] = useState<LocationPoint>({ address: null });
  const [dropoff, setDropoff] = useState<LocationPoint>({ address: null });

  const [pickupDetails, setPickupDetails] = useState<PickupDetails>({
    name: "",
    phone: "",
    instructions: "",
  });

  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails>({
    name: "",
    phone: "",
    instructions: "",
  });

  const [packageOptions, setPackageOptions] = useState<PackageOptions>({
    fragile: false,
    perishable: false,
    containsLiquid: false,
    declaredValue: "",
    weightKg: 0,
  });

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [packageSize, setPackageSize] = useState<PackageSize>("small");

  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  /* location picker state */
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [activeLocationType, setActiveLocationType] =
    useState<LocationType | null>(null);

  /* ---------------------------------- */
  /* Load saved addresses */
  /* ---------------------------------- */
  useEffect(() => {
    let mounted = true;

    fetchSavedAddresses()
      .then((res) => mounted && setSavedAddresses(res))
      .catch(() => mounted && setSavedAddresses([]));

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------------------------- */
  /* Auto-fetch quote when inputs change (debounced) */
  /* ---------------------------------- */
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // require pickup and dropoff to be present
    const locationsReady = !!(pickup?.address && dropoff?.address);

    if (!locationsReady) {
      setQuote(null);
      setLoadingQuote(false);
      return;
    }

    // Fetch quote from backend (debounced)
    setLoadingQuote(true);
    timer = setTimeout(() => {
      if (!mounted) return;
      (async () => {
        try {
          const p = pickup?.address?.coords;
          const d = dropoff?.address?.coords;
          if (!p || !d) {
            setQuote(null);
            setLoadingQuote(false);
            return;
          }
          const q = await fetchDeliveryQuote(
            p.latitude,
            p.longitude,
            d.latitude,
            d.longitude,
          );
          if (!mounted) return;
          setQuote(q);
        } catch (e) {
          if (__DEV__) console.error("Failed to fetch delivery quote", e);
          if (mounted) setQuote(null);
        } finally {
          if (mounted) setLoadingQuote(false);
        }
      })();
    }, 200);

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [pickup, dropoff]);

  /* ---------------------------------- */
  /* Helpers to prevent invalid selections */
  /* ---------------------------------- */
  const addressesEqual = useCallback((a?: LocationPoint, b?: LocationPoint) => {
    if (!a || !b) return false;
    const aa = a.address;
    const bb = b.address;
    if (!aa || !bb) return false;
    // prefer comparing id when available
    if (aa.id && bb.id) return aa.id === bb.id;
    // fallback to normalized address string
    const aStr = (aa.fullAddress || "").trim().toLowerCase();
    const bStr = (bb.fullAddress || "").trim().toLowerCase();
    return aStr !== "" && aStr === bStr;
  }, []);

  const setPickupHandler = (p: LocationPoint) => {
    // Always update, but warn if same as dropoff
    if (addressesEqual(p, dropoff)) {
      console.warn("Pickup and dropoff cannot be the same address");
    }
    setPickup(p);
  };

  const setDropoffHandler = (d: LocationPoint) => {
    if (addressesEqual(pickup, d)) {
      console.warn("Pickup and dropoff cannot be the same address");
    }
    setDropoff(d);
  };

  /* ---------------------------------- */
  /* Location picker handlers */
  /* ---------------------------------- */
  const openLocationPicker = (type: LocationType) => {
    setActiveLocationType(type);
    setLocationPickerOpen(true);
  };

  const closeLocationPicker = () => {
    setLocationPickerOpen(false);
    setActiveLocationType(null);
  };

  const returnData = () => {
    return {
      pickup,
      dropoff,
      pickupDetails,
      deliveryDetails,
      packageSize,
      packageOptions,
      quote,
    };
  };

  const resetDelivery = () => {
    setPickup({ address: null });
    setDropoff({ address: null });
    setPickupDetails({ name: "", phone: "", instructions: "" });
    setDeliveryDetails({ name: "", phone: "", instructions: "" });
    setPackageSize("small");
    setPackageOptions({
      fragile: false,
      perishable: false,
      containsLiquid: false,
      declaredValue: "",
      weightKg: 0,
    });
    setQuote(null);
    setLoadingQuote(false);
  };

  /* ---------------------------------- */
  /* Context Value */
  /* ---------------------------------- */
  const value: SendPackageContextType = {
    pickup,
    dropoff,
    pickupDetails,
    deliveryDetails,
    savedAddresses,
    packageSize,
    packageOptions,
    quote,
    loadingQuote,

    locationPickerOpen,
    activeLocationType,

    setPickup: setPickupHandler,
    setDropoff: setDropoffHandler,
    setPackageSize,
    setPackageOptions,
    setPickupDetails,
    setDeliveryDetails,

    openLocationPicker,
    closeLocationPicker,
    returnData,
    resetDelivery,
  };

  useEffect(() => {
    if (user) {
      setPickupDetails({
        name: user.name || "",
        phone: user.phone || "",
        instructions: "",
      });
    }
    // Only set on mount or when user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <SendPackageContext.Provider value={value}>
      {children}
    </SendPackageContext.Provider>
  );
}

/* ---------------------------------- */
/* Hook */
/* ---------------------------------- */
export function useSendPackage() {
  const ctx = useContext(SendPackageContext);
  if (!ctx) {
    throw new Error("useSendPackage must be used within SendPackageProvider");
  }
  return ctx;
}
