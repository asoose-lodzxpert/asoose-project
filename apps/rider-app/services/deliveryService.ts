// services/deliveryService.ts

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
  vendorName: string;
  vendorAddress: string;
  customerName: string;
  customerAddress: string;
  distanceToVendor: number;
  totalDistance: number;
  estimatedTime: number;
  earnings: number;
  items: string;
  note?: string;
}

export interface ActiveDelivery {
  orderId: string;
  vendorName: string;
  vendorAddress: string;
  customerName: string;
  customerAddress: string;
  earnings: number;
  items: string;
  note?: string;
  nextTurn?: string;
  timeToNextTurn?: string;
  distanceRemaining?: string;
}

const mockIncomingOrder: IncomingOrder = {
  id: "ORD-2025-8921",
  vendorName: "Joe's Pizza",
  vendorAddress: "789 Restaurant Ave",
  customerName: "Jane Doe",
  customerAddress: "123 Customer Street, Apt 4B",
  distanceToVendor: 0.5,
  totalDistance: 2.8,
  estimatedTime: 15,
  earnings: 8.5,
  items: "1 package • Food",
  note: "Leave at door, ring bell",
};

let currentStatus: DeliveryStatus = "offline";
let currentActiveDelivery: ActiveDelivery | null = null;

export const deliveryService = {
  // Simulate going online
  goOnline: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    currentStatus = "online-waiting";
  },

  goOffline: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    currentStatus = "offline";
    currentActiveDelivery = null;
  },

  // Simulate receiving a new order
  waitForOrder: async (): Promise<IncomingOrder> => {
    await new Promise((resolve) => setTimeout(resolve, 4000)); // Wait 4s to simulate
    currentStatus = "incoming-order";
    return mockIncomingOrder;
  },

  acceptOrder: async (orderId: string): Promise<ActiveDelivery> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    currentActiveDelivery = {
      orderId,
      vendorName: mockIncomingOrder.vendorName,
      vendorAddress: mockIncomingOrder.vendorAddress,
      customerName: mockIncomingOrder.customerName,
      customerAddress: mockIncomingOrder.customerAddress,
      earnings: mockIncomingOrder.earnings,
      items: mockIncomingOrder.items,
      note: mockIncomingOrder.note,
      nextTurn: "Main St",
      timeToNextTurn: "0.2 mi",
    };
    currentStatus = "en-route-pickup";
    return currentActiveDelivery;
  },

  declineOrder: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    currentStatus = "online-waiting";
  },

  arriveAtPickup: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    currentStatus = "at-pickup";
  },

  confirmPickup: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (currentActiveDelivery) {
      currentActiveDelivery.nextTurn = "Main Street";
      currentActiveDelivery.timeToNextTurn = "0.3 mi";
      currentActiveDelivery.distanceRemaining = "2.3 mi";
    }
    currentStatus = "en-route-dropoff";
  },

  arriveAtDropoff: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    currentStatus = "confirm-delivery";
  },

  completeDelivery: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    currentStatus = "online-waiting";
    currentActiveDelivery = null;
  },

  getCurrentStatus: (): DeliveryStatus => currentStatus,
  getActiveDelivery: (): ActiveDelivery | null => currentActiveDelivery,
};
