import { get, post, backendUrl } from "@/lib/authFetch";
import { getAccessToken } from "@/services/auth.service";

export interface CreateDisputePayload {
  reason: string;
  description: string;
  orderId?: string;
  rideId?: string;
  deliveryId?: string;
  /** Up to 2 evidence image URLs (min 1 required when provided) */
  evidenceImages?: [string] | [string, string];
}

export interface Dispute {
  id: string;
  reason: string;
  description: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  evidenceImages: string[];
  createdAt: string;
  updatedAt: string;
  orderId?: string | null;
  rideId?: string | null;
  deliveryId?: string | null;
  category?: string;
  relatedAmount?: string;
  messageCount?: number;
}

export interface DisputeListResponse {
  data: Dispute[];
  total: number;
}

export interface DisputeMessageSender {
  id: string;
  name: string;
  role: string;
  image?: string | null;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  sender: DisputeMessageSender;
}

export interface DisputeDetail extends Dispute {
  messages: DisputeMessage[];
  canAddMessage: boolean;
  openedByUserId?: string;
}

export async function createDispute(
  payload: CreateDisputePayload,
): Promise<Dispute> {
  return post("/super-admin/disputes", payload);
}

/** Get the current user's disputes (paginated) */
export async function getMyDisputes(params?: {
  skip?: number;
  take?: number;
  status?: string;
}): Promise<DisputeListResponse> {
  const query = new URLSearchParams();
  if (params?.skip !== undefined) query.set("skip", String(params.skip));
  if (params?.take !== undefined) query.set("take", String(params.take));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString() ? `?${query.toString()}` : "";
  return get(`/super-admin/disputes/mine${qs}`);
}

/** Fetch a single dispute by ID (includes messages) */
export async function getDisputeDetail(id: string): Promise<DisputeDetail> {
  return get(`/super-admin/disputes/${id}`);
}

/** Fetch a single dispute by ID */
export async function getDisputeById(id: string): Promise<Dispute> {
  return get(`/super-admin/disputes/${id}`);
}

/** Send a chat message in a dispute */
export async function sendDisputeMessage(
  disputeId: string,
  message: string,
): Promise<DisputeMessage> {
  return post(`/super-admin/disputes/${disputeId}/messages`, { message });
}

/** Check if there is an existing dispute for a specific order/ride/delivery */
export async function checkDispute(params: {
  orderId?: string;
  rideId?: string;
  deliveryId?: string;
}): Promise<{ dispute: Dispute | null }> {
  const query = new URLSearchParams();
  if (params.orderId) query.set("orderId", params.orderId);
  if (params.rideId) query.set("rideId", params.rideId);
  if (params.deliveryId) query.set("deliveryId", params.deliveryId);
  return get(`/super-admin/disputes/check?${query.toString()}`);
}

/** Upload a single image file and return its URL.
 *  Uses the backend storage endpoint which accepts multipart/form-data.
 */
export async function uploadDisputeImage(uri: string): Promise<string> {
  const token = await getAccessToken();

  // Build FormData
  const formData = new FormData();
  const filename = uri.split("/").pop() ?? "evidence.jpg";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime =
    ext === "png" ? "image/png" : ext === "jpg" ? "image/jpeg" : "image/jpeg";
  formData.append("file", { uri, name: filename, type: mime } as any);

  const response = await fetch(`${backendUrl}storage/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...((__DEV__ as boolean) ? { "ngrok-skip-browser-warning": "true" } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Image upload failed");
  }
  const { url } = await response.json();
  return url as string;
}
