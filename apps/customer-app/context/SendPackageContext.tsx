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

type LocationType = "pickup" | "delivery";

type SendPackageContextType = {
  pickup: LocationPoint;
  dropoff: LocationPoint;
  pickupDetails: PickupDetails;
  deliveryDetails: DeliveryDetails;
  packageSize: PackageSize;
  packageOptions: PackageOptions;
  savedAddresses: Address[];
  quote: DeliveryQuote | null;
  loadingQuote: boolean;
  locationPickerOpen: boolean;
  activeLocationType: LocationType | null;
  setPickup: (p: LocationPoint) => void;
  setDropoff: (d: LocationPoint) => void;
  setPackageSize: (s: PackageSize) => void;
  setPackageOptions: (v: PackageOptions) => void;
  setPickupDetails: (v: PickupDetails) => void;
  setDeliveryDetails: (v: DeliveryDetails) => void;
  openLocationPicker: (type: LocationType) => void;
  closeLocationPicker: () => void;
  returnData: () => any;
  resetDelivery: () => void;
  /* Manual Refresh */
  refreshQuote: () => Promise<void>;
};

const SendPackageContext = createContext<SendPackageContextType | undefined>(
  undefined,
);

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
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [activeLocationType, setActiveLocationType] =
    useState<LocationType | null>(null);

  // Manual Fetch Logic
  const refreshQuote = useCallback(async () => {
    const p = pickup?.address;
    const d = dropoff?.address;

    if (!p || !d) return;

    setLoadingQuote(true);
    try {
      const q = await fetchDeliveryQuote(
        p.coords?.latitude,
        p.coords?.longitude,
        d.coords?.latitude,
        d.coords?.longitude,
      );
      setQuote(q);
    } catch (e) {
      if (__DEV__) console.error("Manual quote fetch failed", e);
      setQuote(null);
    } finally {
      setLoadingQuote(false);
    }
  }, [pickup, dropoff]);

  // Load saved addresses
  useEffect(() => {
    let mounted = true;
    fetchSavedAddresses()
      .then((res) => {
        if (mounted) setSavedAddresses(res);
      })
      .catch(() => mounted && setSavedAddresses([]));
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-fetch quote with debounce
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (pickup?.address && dropoff?.address) {
      timer = setTimeout(() => {
        refreshQuote();
      }, 600);
    } else {
      setQuote(null);
      setLoadingQuote(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pickup, dropoff, refreshQuote]);

  const addressesEqual = useCallback((a?: LocationPoint, b?: LocationPoint) => {
    if (!a?.address || !b?.address) return false;
    const aa = a.address;
    const bb = b.address;
    if (aa.id && bb.id) return aa.id === bb.id;
    return (
      (aa.fullAddress || "").toLowerCase() ===
      (bb.fullAddress || "").toLowerCase()
    );
  }, []);

  const setPickupHandler = (p: LocationPoint) => {
    if (addressesEqual(p, dropoff)) console.warn("Pickup and dropoff match");
    setPickup(p);
  };

  const setDropoffHandler = (d: LocationPoint) => {
    if (addressesEqual(pickup, d)) console.warn("Pickup and dropoff match");
    setDropoff(d);
  };

  const openLocationPicker = (type: LocationType) => {
    setActiveLocationType(type);
    setLocationPickerOpen(true);
  };

  const closeLocationPicker = () => {
    setLocationPickerOpen(false);
    setActiveLocationType(null);
  };

  const returnData = () => ({
    pickup,
    dropoff,
    pickupDetails,
    deliveryDetails,
    packageSize,
    packageOptions,
    quote,
  });

  const resetDelivery = () => {
    setPickup({ address: null });
    setDropoff({ address: null });
    setPickupDetails({
      name: user?.name || "",
      phone: user?.phone || "",
      instructions: "",
    });
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
  };

  useEffect(() => {
    if (user) {
      setPickupDetails((prev) => ({
        ...prev,
        name: user.name || "",
        phone: user.phone || "",
      }));
    }
  }, [user]);

  const value = {
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
    refreshQuote, // Added to value
  };

  return (
    <SendPackageContext.Provider value={value}>
      {children}
    </SendPackageContext.Provider>
  );
}

export function useSendPackage() {
  const ctx = useContext(SendPackageContext);
  if (!ctx)
    throw new Error("useSendPackage must be used within SendPackageProvider");
  return ctx;
}
