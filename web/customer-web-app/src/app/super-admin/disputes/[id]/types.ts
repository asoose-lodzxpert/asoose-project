// src/components/disputes/types.ts
export interface DisputeDetail {
  id: string;
  status: string;
  priority: string;
  reason: string;
  description?: string;
  evidenceImages: string[];
  openedByUser: { id: string; name: string; email: string; role: string };
  targetUser?: { id: string; name: string; role: string };
  order?: {
    id: string;
    total: number;
    status: string;
    store?: { name: string };
    items?: any[];
  };
  ride?: {
    id: string;
    totalFare: number;
    status: string;
    rider?: { user?: { name: string } };
    distanceKm?: number;
  };
  delivery?: { id: string; deliveryFee: number; status: string };
  messages: Array<{
    id: string;
    sender: { id: string; name: string; role: string };
    message: string;
    isInternal: boolean;
    createdAt: string;
  }>;
  resolution?: string;
  refundAmount?: number;
  resolvedAt?: string;
  createdAt: string;
  canResolve: boolean;
  canAddMessage: boolean;
  hoursOpen: number;
  breachedSLA: boolean;
}

export type ModalType =
  | "REFUND_PARTIAL"
  | "REFUND_FULL"
  | "REJECT"
  | "RESOLVE_NO_REFUND"
  | null;
