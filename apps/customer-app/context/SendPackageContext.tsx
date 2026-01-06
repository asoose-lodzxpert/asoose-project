import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  fetchSavedAddresses,
  fetchDeliveryQuote,
} from "../services/sendPackage.api";

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
};

const SendPackageContext = createContext<SendPackageContextType | undefined>(
  undefined
);

/* ---------------------------------- */
/* Provider */
/* ---------------------------------- */
export function SendPackageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
wwwwwwwwwwwww
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
    // require weight and declared value
    const weightOk = !!(
      packageOptions?.weightKg && packageOptions.weightKg > 0
    );
    const declaredOk = !!(
      packageOptions?.declaredValue &&
      packageOptions.declaredValue.trim() !== ""
    );

    const shouldFetch = locationsReady && weightOk && declaredOk;

    if (!locationsReady) {
      // reset quote when locations are incomplete
      setQuote(null);
      setLoadingQuote(false);
      return;
    }

    // if locations are set but weight/declared value are missing, don't fetch
    if (!weightOk || !declaredOk) {
      setQuote(null);
      setLoadingQuote(false);
      // don't attempt to fetch until required fields are provided
      return;
    }

    // debounce rapid changes (user typing / selecting)
    setLoadingQuote(true);
    timer = setTimeout(() => {
      fetchDeliveryQuote(pickup, dropoff, packageSize, packageOptions)
        .then((q) => {
          if (!mounted) return;
          setQuote(q);
        })
        .catch(() => {
          if (!mounted) return;
          setQuote(null);
        })
        .finally(() => {
          if (!mounted) return;
          setLoadingQuote(false);
        });
    }, 350);

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [pickup, dropoff, packageSize, packageOptions]);

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
    // prevent user from selecting same address for pickup and dropoff
    if (addressesEqual(p, dropoff)) {
      console.warn("Pickup and dropoff cannot be the same address");
      return;
    }
    setPickup(p);
  };

  const setDropoffHandler = (d: LocationPoint) => {
    if (addressesEqual(pickup, d)) {
      console.warn("Pickup and dropoff cannot be the same address");
      return;
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
  };

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
