import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  DeliveryStatus,
  IncomingOrder,
  ActiveDelivery,
  deliveryService,
} from "@/services/deliveryService";

interface DeliveryContextProps {
  status: DeliveryStatus;
  activeDelivery: ActiveDelivery | null;
  setStatus: (status: DeliveryStatus) => void;
  setActiveDelivery: (delivery: ActiveDelivery | null) => void;
  incomingOrder: IncomingOrder | null;

  // Actions
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
  undefined
);

interface DeliveryProviderProps {
  children: ReactNode;
}

export const DeliveryProvider: React.FC<DeliveryProviderProps> = ({
  children,
}) => {
  const [status, setStatus] = useState<DeliveryStatus>(
    deliveryService.getCurrentStatus()
  );
  const [activeDelivery, setActiveDelivery] = useState<ActiveDelivery | null>(
    deliveryService.getActiveDelivery()
  );
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrder | null>(
    null
  );

  // ==========================
  // Core Actions
  // ==========================
  const goOnline = async () => {
    await deliveryService.goOnline();
    setStatus(deliveryService.getCurrentStatus());
  };

  const goOffline = async () => {
    await deliveryService.goOffline();
    setStatus(deliveryService.getCurrentStatus());
    setActiveDelivery(deliveryService.getActiveDelivery());
  };

  const toggleOnline = async (online: boolean) => {
    if (online) {
      await goOnline();
    } else {
      await goOffline();
    }
  };

  const waitForOrder = async () => {
    const order = await deliveryService.waitForOrder();
    setIncomingOrder(order);
    setStatus(deliveryService.getCurrentStatus());
    return order;
  };

  const acceptOrder = async (orderId: string) => {
    const delivery = await deliveryService.acceptOrder(orderId);
    setActiveDelivery(delivery);
    setStatus(deliveryService.getCurrentStatus());
    return delivery;
  };

  const declineOrder = async () => {
    await deliveryService.declineOrder();
    setStatus(deliveryService.getCurrentStatus());
  };

  const arriveAtPickup = async () => {
    await deliveryService.arriveAtPickup();
    setStatus(deliveryService.getCurrentStatus());
  };

  const confirmPickup = async () => {
    await deliveryService.confirmPickup();
    setStatus(deliveryService.getCurrentStatus());
    setActiveDelivery(deliveryService.getActiveDelivery());
  };

  const arriveAtDropoff = async () => {
    await deliveryService.arriveAtDropoff();
    setStatus(deliveryService.getCurrentStatus());
  };

  const completeDelivery = async (photoUri: string) => {
    await deliveryService.completeDelivery();
    setStatus(deliveryService.getCurrentStatus());
    setActiveDelivery(deliveryService.getActiveDelivery());
  };

  // ==========================
  // Helpers
  // ==========================
  const resetDelivery = () => {
    setActiveDelivery(null);
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
