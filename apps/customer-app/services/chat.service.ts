import { getAccessToken } from "./auth.service";
import { API_BASE } from "@/constants/static-config";

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
  orderId?: string;
  rideId?: string;
  isRead: boolean;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  
  return data;
}

export const chatService = {
  async sendMessage(params: {
    receiverId: string;
    receiverType: string;
    message: string;
    orderId?: string;
    rideId?: string;
  }) {
    return fetchWithAuth(`${API_BASE}/chat/send`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async getMessages(otherId: string, orderId?: string, rideId?: string) {
    let url = `${API_BASE}/chat/messages/${otherId}`;
    const query = new URLSearchParams();
    if (orderId) query.append("orderId", orderId);
    if (rideId) query.append("rideId", rideId);
    
    const queryString = query.toString();
    if (queryString) url += `?${queryString}`;

    return fetchWithAuth(url);
  },

  async getConversations() {
    return fetchWithAuth(`${API_BASE}/chat/conversations`);
  },

  async markAsRead(messageId: string) {
    return fetchWithAuth(`${API_BASE}/chat/read/${messageId}`, {
      method: "POST",
    });
  },
};
