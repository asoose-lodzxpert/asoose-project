import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Alert } from "react-native";
import { useRiderEvents } from "@/hooks/useRiderEvents";
import { riderApiService } from "@/services/rider-api.service";

export type DeliveryStatus =
  | "offline"
  | "online-waiting"
  | "incoming-order"
  | "en-route-pickup"
  | "at-pickup"
  | "en-route-dropoff"
  | "confirm-delivery";

export interface IncomingOrder {
  id: string;
  orderId: string;
  vendorName: string;
  vendorAddress: string;
  customerName: string;
  customerAddress: string;
  distanceToVendor?: number;
  totalDistance?: number;
  estimatedTime?: number;
  earnings: number;
  items?: string;
  note?: string;
  packageDetails?: string;
  deliveryFee: number;
  pickupAddress: any;
  dropoffAddress: any;
}

export interface ActiveDelivery {
  id: string;
  orderId?: string;
  vendorName: string;
  vendorAddress?: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  earnings: number;
  items?: any[];
  note?: string;
  packageDetails?: string;
  deliveryOtp?: string;
  nextTurn?: string;
  timeToNextTurn?: string;
  distanceRemaining?: string;
  pickupAddress: any;
  dropoffAddress: any;
  status: string;
  assignedAt?: Date;
  pickedUpAt?: Date;
}

interface DeliveryContextProps {
  status: DeliveryStatus;
  activeDelivery: ActiveDelivery | null;
  setStatus: (status: DeliveryStatus) => void;
  setActiveDelivery: (delivery: ActiveDelivery | null) => void;
  incomingOrder: IncomingOrder | null;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  toggleOnline: (online: boolean) => Promise<void>;
  waitForOrder: () => Promise<IncomingOrder>;
  acceptOrder: (orderId: string) => Promise<ActiveDelivery>;
  declineOrder: () => Promise<void>;
  arriveAtPickup: () => Promise<void>;
  confirmPickup: () => Promise<void>;
  arriveAtDropoff: () => Promise<void>;
  completeDelivery: (photoUri: string) => Promise<void>;
  resetDelivery: () => void;
}

const DeliveryContext = createContext<DeliveryContextProps | undefined>(
  undefined,
);

interface DeliveryProviderProps {
  children: ReactNode;
}

export const DeliveryProvider: React.FC<DeliveryProviderProps> = ({
  children,
}) => {
  const [status, setStatus] = useState<DeliveryStatus>("offline");
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(
    null,
  );
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrder | null>(
    null,
  );
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const loadActiveDelivery = async () => {
      try {
        const active = await riderApiService.getActiveDelivery();
        if (active) {
          setActiveDelivery(active);
          mapDeliveryStatusToUIStatus(active.status);
        }
      } catch (error) {}
    };

    if (isOnline) {
      loadActiveDelivery();
    }
  }, [isOnline]);

  const mapDeliveryStatusToUIStatus = (backendStatus: string) => {
    const statusMap: Record<string, DeliveryStatus> = {
      ASSIGNED: "incoming-order",
      ACCEPTED: "en-route-pickup",
      PICKED_UP: "en-route-dropoff",
      IN_TRANSIT: "en-route-dropoff",
      DELIVERED: "online-waiting",
    };
    setStatus(statusMap[backendStatus] || "online-waiting");
  };

  const handleDeliveryAssigned = (data: any) => {
    setIncomingOrder({
      id: data.id,
      orderId: data.orderId,
      vendorName: data.storeName,
      vendorAddress: data.storeAddress,
      customerName: data.customerName,
      customerAddress: data.dropoffAddress,
      earnings: data.deliveryFee,
      packageDetails: data.packageDetails,
      deliveryFee: data.deliveryFee,
      pickupAddress: data.pickupAddress,
      dropoffAddress: data.dropoffAddress,
    });
    setStatus("incoming-order");
  };

  const handleDeliveryUpdated = (data: any) => {
    if (data.status) {
      mapDeliveryStatusToUIStatus(data.status);
    }
  };

  const handleDeliveryCancelled = (data: any) => {
    Alert.alert(
      "Delivery Cancelled",
      data.reason || "The delivery was cancelled",
    );
    setActiveDelivery(null);
    setIncomingOrder(null);
    setStatus("online-waiting");
  };

  const handleRideAssigned = (data: any) => {};

  const handleRideUpdated = (data: any) => {};

  const handleRideCancelled = (data: any) => {
    Alert.alert("Ride Cancelled", data.reason || "The ride was cancelled");
  };

  const handleEventError = (error: Error) => {};

  useRiderEvents({
    onDeliveryAssigned: handleDeliveryAssigned,
    onDeliveryUpdated: handleDeliveryUpdated,
    onDeliveryCancelled: handleDeliveryCancelled,
    onRideAssigned: handleRideAssigned,
    onRideUpdated: handleRideUpdated,
    onRideCancelled: handleRideCancelled,
    onError: handleEventError,
    enabled: isOnline,
  });

  const goOnline = async () => {
    try {
      await riderApiService.updateStatus({ isOnline: true });
      setIsOnline(true);
      setStatus("online-waiting");
    } catch (error) {
      Alert.alert("Error", "Failed to go online. Please try again.");
      throw error;
    }
  };

  const goOffline = async () => {
    try {
      await riderApiService.updateStatus({ isOnline: false });
      setIsOnline(false);
      setStatus("offline");
      setActiveDelivery(null);
      setIncomingOrder(null);
    } catch (error) {
      Alert.alert("Error", "Failed to go offline. Please try again.");
      throw error;
    }
  };

  const toggleOnline = async (online: boolean) => {
    if (online) {
      await goOnline();
    } else {
      await goOffline();
    }
  };

  const waitForOrder = async () => {
    return new Promise<IncomingOrder>((resolve) => {
      if (incomingOrder) {
        resolve(incomingOrder);
      }
    });
  };

  const acceptOrder = async (deliveryId: string) => {
    try {
      const response = await riderApiService.acceptDelivery({
        deliveryId,
      });

      if (response.delivery) {
        setActiveDelivery(response.delivery);
        setStatus("en-route-pickup");
        setIncomingOrder(null);
        return response.delivery;
      }

      throw new Error("Failed to accept delivery");
    } catch (error) {
      Alert.alert("Error", "Failed to accept delivery. Please try again.");
      throw error;
    }
  };

  const declineOrder = async () => {
    setIncomingOrder(null);
    setStatus("online-waiting");
  };

  const arriveAtPickup = async () => {
    setStatus("at-pickup");
  };

  const confirmPickup = async () => {
    try {
      if (!activeDelivery) {
        throw new Error("No active delivery");
      }

      await riderApiService.confirmPickup(activeDelivery.id);
      setStatus("en-route-dropoff");

      if (activeDelivery) {
        setActiveDelivery({
          ...activeDelivery,
          status: "PICKED_UP",
          pickedUpAt: new Date(),
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to confirm pickup. Please try again.");
      throw error;
    }
  };

  const arriveAtDropoff = async () => {
    setStatus("confirm-delivery");
  };

  const completeDelivery = async (photoUri: string) => {
    try {
      if (!activeDelivery) {
        throw new Error("No active delivery");
      }

      await riderApiService.completeDelivery({
        deliveryId: activeDelivery.id,
        deliveryProof: photoUri,
        deliveryOtp: activeDelivery.deliveryOtp,
      });

      setStatus("online-waiting");
      setActiveDelivery(null);
    } catch (error) {
      Alert.alert("Error", "Failed to complete delivery. Please try again.");
      throw error;
    }
  };

  const resetDelivery = () => {
    setActiveDelivery(null);
    setIncomingOrder(null);
    setStatus("offline");
  };

  return (
    <DeliveryContext.Provider
      value={{
        status,
        activeDelivery,
        setStatus,
        setActiveDelivery,
        goOnline,
        goOffline,
        toggleOnline,
        waitForOrder,
        acceptOrder,
        declineOrder,
        arriveAtPickup,
        confirmPickup,
        arriveAtDropoff,
        completeDelivery,
        resetDelivery,
        incomingOrder,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
};

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error("useDelivery must be used within a DeliveryProvider");
  }
  return context;
};
