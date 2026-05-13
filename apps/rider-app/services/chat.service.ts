import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

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

export const chatService = {
  async sendMessage(params: {
    receiverId: string;
    receiverType: string;
    message: string;
    orderId?: string;
    rideId?: string;
  }) {
    return fetchWithAuth(`${EXPO_PUBLIC_API_URL}/chat/send`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async getMessages(otherId: string, orderId?: string, rideId?: string) {
    let url = `${EXPO_PUBLIC_API_URL}/chat/messages/${otherId}`;
    const query = new URLSearchParams();
    if (orderId) query.append("orderId", orderId);
    if (rideId) query.append("rideId", rideId);
    
    const queryString = query.toString();
    if (queryString) url += `?${queryString}`;

    return fetchWithAuth(url);
  },

  async getConversations() {
    return fetchWithAuth(`${EXPO_PUBLIC_API_URL}/chat/conversations`);
  },

  async markAsRead(messageId: string) {
    return fetchWithAuth(`${EXPO_PUBLIC_API_URL}/chat/read/${messageId}`, {
      method: "POST",
    });
  },
};
