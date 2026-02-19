import { post } from "@/lib/authFetch";

export interface CreateDisputePayload {
  reason: string;
  description: string;
  orderId?: string;
  rideId?: string;
  deliveryId?: string;
  evidenceImages?: string[];
}

export async function createDispute(
  payload: CreateDisputePayload,
): Promise<any> {
  return post("/super-admin/disputes", payload);
}
